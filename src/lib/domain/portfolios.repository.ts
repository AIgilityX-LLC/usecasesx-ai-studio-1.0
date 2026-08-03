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
  "portfolio_items ( use_case_id, rank, decision, target_period, funding_state, next_action, notes, review_notes, last_reviewed_at, added_at, updated_at )";

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
};

type PortfolioRow = { portfolio_items?: PortfolioItemRow[] | null };

/**
 * `portfolio_items.use_case_id` intentionally carries no foreign key (the same
 * column can point at a repository entry or a workspace draft), so PostgREST
 * cannot embed the use case. We hydrate the executive-summary fields in a
 * second read instead. Rows the caller cannot see simply stay unhydrated.
 */
async function attachUseCases(rows: PortfolioRow[]) {
  const ids = [
    ...new Set(rows.flatMap((row) => (row.portfolio_items ?? []).map((i) => i.use_case_id))),
  ];
  if (ids.length === 0) return rows;
  const result = await supabase
    .from("use_cases")
    .select("id, slug, title, status, value_potential, complexity, risk_level, time_to_value")
    .in("id", ids);
  const useCases = unwrapResult(result, { allowNull: true }) ?? [];
  const byId = new Map(useCases.map((uc) => [uc.id, uc] as const));

  // Primary business function per use case (many-to-many join table).
  const fnResult = await supabase
    .from("use_case_business_functions")
    .select("use_case_id, business_functions ( name )")
    .in("use_case_id", ids);
  const functionById = new Map<string, string>();
  for (const row of (unwrapResult(fnResult, { allowNull: true }) ?? []) as {
    use_case_id: string;
    business_functions?: { name?: string | null } | null;
  }[]) {
    const name = row.business_functions?.name;
    if (name && !functionById.has(row.use_case_id)) functionById.set(row.use_case_id, name);
  }

  for (const row of rows) {
    for (const item of row.portfolio_items ?? []) {
      const uc = byId.get(item.use_case_id) as UseCaseMeta | undefined;
      item.use_cases = uc
        ? { ...uc, function_name: functionById.get(item.use_case_id) ?? null }
        : null;
    }
  }
  return rows;
}

export async function listPortfoliosForUser(userId: string | null) {
  const uid = requireUserId(userId);
  const result = await supabase
    .from("portfolios")
    .select(PORTFOLIO_SELECT)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  const rows = unwrapResult(result, { allowNull: true }) ?? [];
  return attachUseCases(rows as PortfolioRow[]);
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
  } = {};
  if (patch.rank !== undefined) columns.rank = patch.rank ?? null;
  if (patch.decision !== undefined) columns.decision = patch.decision;
  if (patch.targetPeriod !== undefined) columns.target_period = patch.targetPeriod || null;
  if (patch.fundingState !== undefined) columns.funding_state = patch.fundingState;
  if (patch.nextAction !== undefined) columns.next_action = patch.nextAction || null;
  if (patch.notes !== undefined) columns.notes = patch.notes || null;
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
  const uid = requireUserId(userId);
  const pid = parseInput(uuidSchema, portfolioId);
  const ucid = parseInput(uuidSchema, useCaseId);
  const result = await supabase
    .from("portfolio_items")
    .upsert(
      { portfolio_id: pid, use_case_id: ucid, added_by: uid },
      { onConflict: "portfolio_id,use_case_id", ignoreDuplicates: true },
    );
  if (result.error) throw normalizeError(result.error);
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
}

export async function removeUseCaseFromPortfolio(
  userId: string | null,
  portfolioId: string,
  useCaseId: string,
) {
  requireUserId(userId);
  const pid = parseInput(uuidSchema, portfolioId);
  const ucid = parseInput(uuidSchema, useCaseId);
  const result = await supabase
    .from("portfolio_items")
    .delete()
    .eq("portfolio_id", pid)
    .eq("use_case_id", ucid);
  if (result.error) throw normalizeError(result.error);
}
