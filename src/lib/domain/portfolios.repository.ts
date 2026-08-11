/**
 * Portfolio repository — the only place that reads/writes `portfolios` and
 * `portfolio_items`. Ownership is asserted before every mutation; RLS enforces
 * the same rule server-side.
 *
 * Portfolio membership (`portfolio_items`) carries its own decision fields —
 * rank, decision, target period, funding state, next action and notes. Those
 * are portfolio-specific and never written back to the authoritative use case,
 * so one use case can sit in many portfolios with different decisions.
 *
 * The schema also reserves `parent_portfolio_id`, `portfolio_type` and
 * organization links for future nested Enterprise portfolios; the Pro surface
 * deliberately does not expose them yet.
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeError, unwrapResult } from "./errors";
import { requireUserId } from "./ownership";
import {
  buildPage,
  buildListMeta,
  chunkIds,
  clampPageSize,
  collectPages,
  keysetOrFilter,
  type ListMeta,
  type Page,
} from "./pagination";
import {
  parseInput,
  portfolioCreateSchema,
  portfolioEntryPatchSchema,
  portfolioPatchSchema,
  uuidSchema,
} from "./validation";
import type { PortfolioEntryPatch } from "@/lib/portfolio-model";
import {
  AUDIT_EVENTS,
  PRODUCT_EVENTS,
  recordAuditEvent,
  recordProductEvent,
} from "@/lib/telemetry";

export type PortfolioCreateInput = {
  name: string;
  type: string;
  objective?: string;
  targetDepartment?: string;
  targetQuarter?: string;
  visibility?: "private" | "workspace" | "organization";
  reviewCadence?: "none" | "weekly" | "monthly" | "quarterly" | "biannual" | "annual";
  organizationUnitId?: string | null;
};

export type PortfolioPatchInput = Partial<PortfolioCreateInput> & {
  status?: string;
  reviewNotes?: string | null;
  markReviewed?: boolean;
};

const PORTFOLIO_SELECT =
  "id, name, objective, created_at, updated_at, portfolio_type, status, target_department, target_quarter, visibility, review_cadence, organization_unit_id, parent_portfolio_id, review_notes, last_reviewed_at, " +
  "portfolio_items ( use_case_id, rank, decision, target_period, funding_state, next_action, notes, review_notes, last_reviewed_at, added_at, updated_at, delivery_stage, planned_start_date, planned_end_date, milestone, delivery_owner, depends_on, blocked_reason )";

type UseCaseMeta = {
  slug: string;
  title: string;
  status?: string | null;
  value_potential?: string | null;
  complexity?: string | null;
  risk_level?: string | null;
  time_to_value?: string | null;
  function_name?: string | null;
};

type PortfolioItemRow = {
  use_case_id: string;
  use_cases?: UseCaseMeta | null;
  /** Workspace Studio draft derived from this use case, when one exists. */
  studio_use_case_id?: string | null;
};

type PortfolioRow = { portfolio_items?: PortfolioItemRow[] | null };

/** Keyset cursor: `created_at` descending with `id` as the tiebreaker. */
export type PortfolioCursor = { createdAt: string; id: string };

/** Upper bound on portfolios returned by the "everything" convenience readers. */
export const PORTFOLIO_MAX_ROWS = 200;

/** Rows per keyset page. Portfolios embed their items, so pages stay small. */
export const PORTFOLIO_PAGE_SIZE = 25;

/**
 * `portfolio_items.use_case_id` intentionally carries no foreign key (the same
 * column can point at a repository entry or a workspace draft), so PostgREST
 * cannot embed the use case. We hydrate the executive-summary fields in a
 * second read instead. Rows the caller cannot see simply stay unhydrated.
 */
/**
 * Hydration is chunked: a page of portfolios can reference many use cases, and
 * an unbounded `.in()` would grow the request URL with the workspace.
 */
async function attachUseCases(rows: PortfolioRow[]) {
  const allIds = rows.flatMap((row) => (row.portfolio_items ?? []).map((i) => i.use_case_id));
  if (allIds.length === 0) return rows;
  const { chunks } = chunkIds(allIds);

  const byId = new Map<string, UseCaseMeta & { id: string }>();
  const functionById = new Map<string, string>();
  const studioBySource = new Map<string, string>();

  for (const ids of chunks) {
    const [result, fnResult, studioResult] = await Promise.all([
      supabase
        .from("use_cases")
        .select("id, slug, title, status, value_potential, complexity, risk_level, time_to_value")
        .in("id", ids),
      // Primary business function per use case (many-to-many join table).
      supabase
        .from("use_case_business_functions")
        .select("use_case_id, business_functions ( name )")
        .in("use_case_id", ids),
      // Studio drafts derived from these repository entries. Read-only lineage —
      // RLS keeps drafts from other workspaces out of the result.
      supabase
        .from("ai_use_cases")
        .select("id, source_use_case_id, updated_at")
        .in("source_use_case_id", ids)
        .order("updated_at", { ascending: false }),
    ]);

    for (const uc of (unwrapResult(result, { allowNull: true }) ?? []) as (UseCaseMeta & {
      id: string;
    })[]) {
      byId.set(uc.id, uc);
    }
    for (const row of (unwrapResult(fnResult, { allowNull: true }) ?? []) as {
      use_case_id: string;
      business_functions?: { name?: string | null } | null;
    }[]) {
      const name = row.business_functions?.name;
      if (name && !functionById.has(row.use_case_id)) functionById.set(row.use_case_id, name);
    }
    for (const row of (unwrapResult(studioResult, { allowNull: true }) ?? []) as {
      id: string;
      source_use_case_id: string | null;
    }[]) {
      if (row.source_use_case_id && !studioBySource.has(row.source_use_case_id)) {
        studioBySource.set(row.source_use_case_id, row.id);
      }
    }
  }

  for (const row of rows) {
    for (const item of row.portfolio_items ?? []) {
      const uc = byId.get(item.use_case_id) as UseCaseMeta | undefined;
      item.use_cases = uc
        ? { ...uc, function_name: functionById.get(item.use_case_id) ?? null }
        : null;
      item.studio_use_case_id = studioBySource.get(item.use_case_id) ?? null;
    }
  }
  return rows;
}

/**
 * One bounded keyset page of the user's own portfolios, newest first, with
 * items and use-case content hydrated.
 */
export async function listPortfoliosPageForUser(
  userId: string | null,
  options: { limit?: number; cursor?: PortfolioCursor | null } = {},
): Promise<Page<PortfolioRow, PortfolioCursor>> {
  const uid = requireUserId(userId);
  const pageSize = clampPageSize(options.limit ?? PORTFOLIO_PAGE_SIZE);
  const cursor = options.cursor ?? null;

  let query = supabase
    .from("portfolios")
    .select(PORTFOLIO_SELECT)
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(pageSize + 1);
  if (cursor) {
    query = query.or(keysetOrFilter("created_at", cursor.createdAt, "id", cursor.id));
  }

  const result = await query;
  const fetched = (unwrapResult(result, { allowNull: true }) ?? []) as unknown as (PortfolioRow & {
    id: string;
    created_at: string;
  })[];
  const page = buildPage(fetched, pageSize, (row) => ({
    createdAt: row.created_at,
    id: row.id,
  }));
  if (page.rows.length === 0) return { ...page, rows: [] };

  const hydrated = (await attachUseCases(page.rows as PortfolioRow[])) as PortfolioRow[];
  return { rows: hydrated, hasMore: page.hasMore, nextCursor: page.nextCursor, pageSize };
}

/**
 * Every portfolio the user owns, capped at `PORTFOLIO_MAX_ROWS` and fetched as
 * bounded keyset pages. Prefer `listPortfoliosPageForUser` for new surfaces.
 */
export async function listPortfoliosForUser(userId: string | null) {
  const uid = requireUserId(userId);
  const { rows } = await collectPages<PortfolioRow, PortfolioCursor>(
    (cursor) => listPortfoliosPageForUser(uid, { cursor }),
    PORTFOLIO_MAX_ROWS,
  );
  return rows;
}

/**
 * Exact number of portfolios the user owns. Head-only count, so no portfolio
 * bodies or items are transferred. Returns null when the count is unavailable.
 */
export async function countPortfoliosForUser(userId: string | null): Promise<number | null> {
  const uid = requireUserId(userId);
  const { count, error } = await supabase
    .from("portfolios")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);
  if (error) return null;
  return typeof count === "number" ? count : null;
}

/**
 * `listPortfoliosForUser` plus completeness metadata, so the UI can say
 * "showing the first 200 of 340" instead of silently hiding portfolios.
 */
export async function listPortfoliosWithMetaForUser(
  userId: string | null,
): Promise<{ rows: PortfolioRow[]; meta: ListMeta }> {
  const uid = requireUserId(userId);
  const [collected, total] = await Promise.all([
    collectPages<PortfolioRow, PortfolioCursor>(
      (cursor) => listPortfoliosPageForUser(uid, { cursor }),
      PORTFOLIO_MAX_ROWS,
    ),
    countPortfoliosForUser(uid),
  ]);
  return {
    rows: collected.rows,
    meta: buildListMeta({
      loaded: collected.rows.length,
      total,
      cap: PORTFOLIO_MAX_ROWS,
      walkTruncated: collected.truncated,
    }),
  };
}

/**
 * Every portfolio the signed-in user is allowed to read — their own plus
 * workspace/organization-visible portfolios owned by colleagues. No client-side
 * filter is applied: RLS on `portfolios` is the authority, so what this returns
 * is exactly what the database permits, capped at `PORTFOLIO_MAX_ROWS`.
 */
export async function listPortfoliosVisibleToUser(userId: string | null) {
  requireUserId(userId);
  const result = await supabase
    .from("portfolios")
    .select(`${PORTFOLIO_SELECT}, user_id, workspace_id`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(PORTFOLIO_MAX_ROWS);
  const rows = unwrapResult(result, { allowNull: true }) ?? [];
  return attachUseCases(rows as PortfolioRow[]) as unknown as Promise<
    (PortfolioRow & { user_id: string; workspace_id: string | null })[]
  >;
}

export async function createPortfolio(userId: string | null, input: PortfolioCreateInput) {
  const uid = requireUserId(userId);
  const clean = parseInput(portfolioCreateSchema, input);
  const result = await supabase
    .from("portfolios")
    .insert({
      user_id: uid,
      name: clean.name,
      portfolio_type: clean.type,
      status: "Draft",
      objective: clean.objective ?? null,
      target_department: clean.targetDepartment ?? null,
      target_quarter: clean.targetQuarter ?? null,
      visibility: clean.visibility ?? "workspace",
      review_cadence: clean.reviewCadence ?? null,
      organization_unit_id: clean.organizationUnitId ?? null,
    })
    .select("id")
    .maybeSingle();
  if (result.error) throw normalizeError(result.error);
  const id = (result.data as { id?: string } | null)?.id ?? null;
  const requestId = await recordAuditEvent({
    event: AUDIT_EVENTS.entityCreated,
    entity: { type: "portfolio", id },
    next: { name: clean.name, portfolio_type: clean.type, status: "Draft" },
  });
  await recordProductEvent({
    event: PRODUCT_EVENTS.portfolioCreated,
    entity: { type: "portfolio", id },
    properties: { portfolio_type: clean.type },
    requestId,
  });
  return id;
}

/** Maps the domain patch onto database columns. Exported for unit tests. */
export function toPortfolioColumns(patch: PortfolioPatchInput) {
  const columns: {
    name?: string;
    objective?: string | null;
    portfolio_type?: string;
    status?: string;
    target_department?: string | null;
    target_quarter?: string | null;
    visibility?: string;
    review_cadence?: string | null;
    organization_unit_id?: string | null;
    review_notes?: string | null;
    last_reviewed_at?: string;
  } = {};
  if (patch.name !== undefined) columns.name = patch.name;
  if (patch.objective !== undefined) columns.objective = patch.objective ?? null;
  if (patch.type !== undefined) columns.portfolio_type = patch.type;
  if (patch.status !== undefined) columns.status = patch.status;
  if (patch.targetDepartment !== undefined)
    columns.target_department = patch.targetDepartment ?? null;
  if (patch.targetQuarter !== undefined) columns.target_quarter = patch.targetQuarter ?? null;
  if (patch.visibility !== undefined) columns.visibility = patch.visibility;
  if (patch.reviewCadence !== undefined) columns.review_cadence = patch.reviewCadence ?? null;
  if (patch.organizationUnitId !== undefined)
    columns.organization_unit_id = patch.organizationUnitId ?? null;
  if (patch.reviewNotes !== undefined) columns.review_notes = patch.reviewNotes || null;
  if (patch.markReviewed) columns.last_reviewed_at = new Date().toISOString();
  return columns;
}

/** Maps a portfolio-entry patch onto `portfolio_items` columns. Exported for unit tests. */
export function toPortfolioEntryColumns(patch: PortfolioEntryPatch) {
  const columns: {
    rank?: number | null;
    decision?: string;
    target_period?: string | null;
    funding_state?: string;
    next_action?: string | null;
    notes?: string | null;
    review_notes?: string | null;
    last_reviewed_at?: string;
    delivery_stage?: string;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
    milestone?: string | null;
    delivery_owner?: string | null;
    depends_on?: string[];
    blocked_reason?: string | null;
  } = {};
  if (patch.rank !== undefined) columns.rank = patch.rank ?? null;
  if (patch.decision !== undefined) columns.decision = patch.decision;
  if (patch.targetPeriod !== undefined) columns.target_period = patch.targetPeriod || null;
  if (patch.fundingState !== undefined) columns.funding_state = patch.fundingState;
  if (patch.nextAction !== undefined) columns.next_action = patch.nextAction || null;
  if (patch.notes !== undefined) columns.notes = patch.notes || null;
  if (patch.reviewNotes !== undefined) columns.review_notes = patch.reviewNotes || null;
  if (patch.markReviewed) columns.last_reviewed_at = new Date().toISOString();
  if (patch.deliveryStage !== undefined) columns.delivery_stage = patch.deliveryStage;
  if (patch.plannedStartDate !== undefined)
    columns.planned_start_date = patch.plannedStartDate || null;
  if (patch.plannedEndDate !== undefined) columns.planned_end_date = patch.plannedEndDate || null;
  if (patch.milestone !== undefined) columns.milestone = patch.milestone || null;
  if (patch.deliveryOwner !== undefined) columns.delivery_owner = patch.deliveryOwner || null;
  if (patch.dependsOn !== undefined) columns.depends_on = patch.dependsOn;
  if (patch.blockedReason !== undefined) columns.blocked_reason = patch.blockedReason || null;
  return columns;
}

export async function updatePortfolio(
  userId: string | null,
  portfolioId: string,
  patch: PortfolioPatchInput,
) {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, portfolioId);
  const clean = parseInput(portfolioPatchSchema, patch);
  const columns = toPortfolioColumns(clean);
  if (Object.keys(columns).length === 0) return;
  const result = await supabase.from("portfolios").update(columns).eq("id", id).eq("user_id", uid);
  if (result.error) throw normalizeError(result.error);
  await recordAuditEvent({
    event: columns.status === "Archived" ? AUDIT_EVENTS.entityArchived : AUDIT_EVENTS.entityUpdated,
    entity: { type: "portfolio", id },
    next: columns,
  });
}

export async function deletePortfolio(userId: string | null, portfolioId: string) {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, portfolioId);
  const result = await supabase.from("portfolios").delete().eq("id", id).eq("user_id", uid);
  if (result.error) throw normalizeError(result.error);
  await recordAuditEvent({
    event: AUDIT_EVENTS.entityDeleted,
    entity: { type: "portfolio", id },
    severity: "notice",
  });
}

export async function addUseCaseToPortfolio(
  userId: string | null,
  portfolioId: string,
  useCaseId: string,
) {
  return addUseCasesToPortfolio(userId, portfolioId, [useCaseId]);
}

/**
 * Bulk membership add. `ignoreDuplicates` on the composite key means a use case
 * already in the portfolio is skipped rather than duplicated.
 */
export async function addUseCasesToPortfolio(
  userId: string | null,
  portfolioId: string,
  useCaseIds: string[],
) {
  const uid = requireUserId(userId);
  const pid = parseInput(uuidSchema, portfolioId);
  const ids = [...new Set(useCaseIds)].map((id) => parseInput(uuidSchema, id));
  if (ids.length === 0) return;
  const result = await supabase.from("portfolio_items").upsert(
    ids.map((ucid) => ({ portfolio_id: pid, use_case_id: ucid, added_by: uid })),
    { onConflict: "portfolio_id,use_case_id", ignoreDuplicates: true },
  );
  if (result.error) throw normalizeError(result.error);
  await recordProductEvent({
    event: PRODUCT_EVENTS.portfolioItemAdded,
    entity: { type: "portfolio", id: pid },
    properties: { count: ids.length },
  });
}

/**
 * Updates the portfolio-specific decision fields for one membership record.
 * Source use-case fields and scores are never touched.
 */
export async function updatePortfolioEntry(
  userId: string | null,
  portfolioId: string,
  useCaseId: string,
  patch: PortfolioEntryPatch,
) {
  requireUserId(userId);
  const pid = parseInput(uuidSchema, portfolioId);
  const ucid = parseInput(uuidSchema, useCaseId);
  const clean = parseInput(portfolioEntryPatchSchema, patch);
  const columns = toPortfolioEntryColumns(clean);
  if (Object.keys(columns).length === 0) return;
  const result = await supabase
    .from("portfolio_items")
    .update(columns)
    .eq("portfolio_id", pid)
    .eq("use_case_id", ucid);
  if (result.error) throw normalizeError(result.error);
  await recordProductEvent({
    event: columns.last_reviewed_at
      ? PRODUCT_EVENTS.portfolioReviewed
      : PRODUCT_EVENTS.portfolioItemChanged,
    entity: { type: "portfolio", id: pid },
    properties: { use_case_id: ucid, fields: Object.keys(columns) },
  });
}

export async function removeUseCaseFromPortfolio(
  userId: string | null,
  portfolioId: string,
  useCaseId: string,
) {
  return removeUseCasesFromPortfolio(userId, portfolioId, [useCaseId]);
}

/** Bulk membership removal. The use cases themselves are never deleted. */
export async function removeUseCasesFromPortfolio(
  userId: string | null,
  portfolioId: string,
  useCaseIds: string[],
) {
  requireUserId(userId);
  const pid = parseInput(uuidSchema, portfolioId);
  const ids = [...new Set(useCaseIds)].map((id) => parseInput(uuidSchema, id));
  if (ids.length === 0) return;
  const result = await supabase
    .from("portfolio_items")
    .delete()
    .eq("portfolio_id", pid)
    .in("use_case_id", ids);
  if (result.error) throw normalizeError(result.error);
  await recordProductEvent({
    event: PRODUCT_EVENTS.portfolioItemRemoved,
    entity: { type: "portfolio", id: pid },
    properties: { count: ids.length },
  });
}
