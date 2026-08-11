/**
 * Saved use cases + personal scoring repository.
 *
 * Owns every read/write against `saved_use_cases` and `use_case_scores`.
 * Callers pass the signed-in user id; ownership is asserted here (and enforced
 * again by RLS in the database).
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
  AUDIT_EVENTS,
  PRODUCT_EVENTS,
  recordAuditEvent,
  recordProductEvent,
} from "@/lib/telemetry";
import {
  parseInput,
  prioritySchema,
  savedUseCasePatchSchema,
  scoreDimensionsSchema,
  slugSchema,
  uuidSchema,
} from "./validation";

export type Priority = "Low" | "Medium" | "High" | "Strategic";

export type SavedPatch = { note?: string; priority?: Priority };

export type ScoreColumns = {
  strategic: number;
  value: number;
  feasibility: number;
  ttv: number;
  risk: number;
  readiness: number;
  total: number;
};

/**
 * Live use-case content hydrated from the `use_cases` table (plus join
 * tables for industry, business function and AI capability). Replaces the
 * `MockUseCase` lookups that powered Pro routes with static data.
 */
export interface UseCaseContent {
  slug: string;
  title: string;
  summary: string;
  valuePotential: string | null;
  complexity: string | null;
  riskLevel: string | null;
  timeToValue: string | null;
  maturityLevel: string | null;
  maturity: string | null;
  industry: { slug: string; name: string } | null;
  businessFunction: string | null;
  aiCapability: string | null;
}

export type EnrichedSavedRow = {
  use_case_id: string;
  priority: string;
  note: string | null;
  saved_at: string;
  content: UseCaseContent | null;
};

/** Keyset cursor: `saved_at` descending with `use_case_id` as the tiebreaker. */
export type SavedCursor = { savedAt: string; useCaseId: string };

/** Upper bound on rows returned by the "everything" convenience reader. */
export const SAVED_MAX_ROWS = 500;

type SavedBaseRow = {
  use_case_id: string;
  priority: string;
  note: string | null;
  saved_at: string;
};

/** Resolves a public use-case slug to its id. Returns null when unknown. */
export async function resolveUseCaseIdBySlug(slug: string): Promise<string | null> {
  const clean = parseInput(slugSchema, slug);
  try {
    const { data, error } = await supabase
      .from("use_cases")
      .select("id")
      .eq("slug", clean)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function saveUseCase(
  userId: string | null,
  useCaseId: string,
  priority: Priority = "Medium",
): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const prio = parseInput(prioritySchema, priority);
  const result = await supabase
    .from("saved_use_cases")
    .upsert(
      { user_id: uid, use_case_id: id, priority: prio },
      { onConflict: "user_id,use_case_id" },
    );
  if (result.error) throw normalizeError(result.error);
  await recordAuditEvent({
    event: AUDIT_EVENTS.entityCreated,
    entity: { type: "saved_use_case", id },
    next: { priority: prio },
  });
}

export async function unsaveUseCase(userId: string | null, useCaseId: string): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const result = await supabase
    .from("saved_use_cases")
    .delete()
    .eq("user_id", uid)
    .eq("use_case_id", id);
  if (result.error) throw normalizeError(result.error);
  await recordAuditEvent({
    event: AUDIT_EVENTS.entityDeleted,
    entity: { type: "saved_use_case", id },
  });
}

export async function updateSavedUseCase(
  userId: string | null,
  useCaseId: string,
  patch: SavedPatch,
): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const clean = parseInput(savedUseCasePatchSchema, patch);
  const result = await supabase
    .from("saved_use_cases")
    .update(clean)
    .eq("user_id", uid)
    .eq("use_case_id", id);
  if (result.error) throw normalizeError(result.error);
  await recordAuditEvent({
    event: AUDIT_EVENTS.entityUpdated,
    entity: { type: "saved_use_case", id },
    next: clean as Record<string, unknown>,
  });
}

export async function upsertUseCaseScore(
  userId: string | null,
  useCaseId: string,
  score: unknown,
  toColumns: (s: ReturnType<typeof parseScore>) => ScoreColumns,
): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const parsed = parseScore(score);
  const result = await supabase
    .from("use_case_scores")
    .upsert(
      { user_id: uid, use_case_id: id, ...toColumns(parsed) },
      { onConflict: "user_id,use_case_id" },
    );
  if (result.error) throw normalizeError(result.error);
  const requestId = await recordAuditEvent({
    event: AUDIT_EVENTS.entityUpdated,
    entity: { type: "use_case_score", id },
    next: toColumns(parsed) as unknown as Record<string, unknown>,
  });
  await recordProductEvent({
    event: PRODUCT_EVENTS.useCaseScored,
    entity: { type: "use_case", id },
    properties: { total: toColumns(parsed).total },
    requestId,
  });
}

export function parseScore(score: unknown) {
  return parseInput(scoreDimensionsSchema, score);
}

/**
 * One bounded page of saved entries, newest first, with the use-case content
 * hydrated.
 *
 * `saved_use_cases.use_case_id` has no foreign key (it can reference either the
 * global catalogue or a workspace draft), so the content is hydrated in batch
 * queries against `use_cases` plus the industry / function / capability join
 * tables rather than embedded by PostgREST. Those hydration reads are chunked,
 * so the number of ids per request stays bounded no matter how large the page.
 */
export async function listSavedPageForUser(
  userId: string | null,
  options: { limit?: number; cursor?: SavedCursor | null } = {},
): Promise<Page<EnrichedSavedRow, SavedCursor>> {
  const uid = requireUserId(userId);
  const pageSize = clampPageSize(options.limit);
  const cursor = options.cursor ?? null;

  let query = supabase
    .from("saved_use_cases")
    .select("use_case_id, priority, note, saved_at")
    .eq("user_id", uid)
    .order("saved_at", { ascending: false })
    .order("use_case_id", { ascending: true })
    .limit(pageSize + 1);
  if (cursor) {
    query = query.or(keysetOrFilter("saved_at", cursor.savedAt, "use_case_id", cursor.useCaseId));
  }

  const result = await query;
  const fetched = (unwrapResult(result, { allowNull: true }) ?? []) as SavedBaseRow[];
  const page = buildPage<SavedBaseRow, SavedCursor>(fetched, pageSize, (row) => ({
    savedAt: row.saved_at,
    useCaseId: row.use_case_id,
  }));
  if (page.rows.length === 0) {
    return { ...page, rows: [] };
  }

  const hydrated = await hydrateSavedRows(page.rows);
  return { rows: hydrated, hasMore: page.hasMore, nextCursor: page.nextCursor, pageSize };
}

/** Chunked hydration for one page of saved rows. */
async function hydrateSavedRows(rows: SavedBaseRow[]): Promise<EnrichedSavedRow[]> {
  const { chunks } = chunkIds(rows.map((row) => row.use_case_id));

  const ucMap = new Map<string, Record<string, string | null>>();
  const indByUc = new Map<string, { slug: string; name: string }>();
  const funcByUc = new Map<string, string>();
  const capByUc = new Map<string, string>();

  for (const ids of chunks) {
    const [ucRes, indRes, funcRes, capRes] = await Promise.all([
      supabase
        .from("use_cases")
        .select(
          "id, slug, title, summary, value_potential, complexity, risk_level, time_to_value, maturity_level, maturity",
        )
        .in("id", ids),
      supabase
        .from("use_case_industries")
        .select("use_case_id, industries!inner(slug, name)")
        .in("use_case_id", ids),
      supabase
        .from("use_case_business_functions")
        .select("use_case_id, business_functions(name)")
        .in("use_case_id", ids),
      supabase
        .from("use_case_capabilities")
        .select("use_case_id, ai_capabilities(name)")
        .in("use_case_id", ids),
    ]);

    for (const uc of (unwrapResult(ucRes, { allowNull: true }) ?? []) as Array<
      Record<string, string | null> & { id: string }
    >) {
      ucMap.set(uc.id, uc);
    }
    for (const row of (unwrapResult(indRes, { allowNull: true }) ?? []) as Array<{
      use_case_id: string;
      industries?: { slug: string; name: string } | null;
    }>) {
      if (row.industries) indByUc.set(row.use_case_id, row.industries);
    }
    for (const row of (unwrapResult(funcRes, { allowNull: true }) ?? []) as Array<{
      use_case_id: string;
      business_functions?: { name: string } | null;
    }>) {
      if (row.business_functions?.name) funcByUc.set(row.use_case_id, row.business_functions.name);
    }
    for (const row of (unwrapResult(capRes, { allowNull: true }) ?? []) as Array<{
      use_case_id: string;
      ai_capabilities?: { name: string } | null;
    }>) {
      if (row.ai_capabilities?.name) capByUc.set(row.use_case_id, row.ai_capabilities.name);
    }
  }

  return rows.map((row) => {
    const uc = ucMap.get(row.use_case_id) as
      | {
          slug: string;
          title: string;
          summary: string;
          value_potential: string | null;
          complexity: string | null;
          risk_level: string | null;
          time_to_value: string | null;
          maturity_level: string | null;
          maturity: string | null;
        }
      | undefined;
    if (!uc) {
      return { ...row, content: null };
    }
    return {
      use_case_id: row.use_case_id,
      priority: row.priority,
      note: row.note,
      saved_at: row.saved_at,
      content: {
        slug: uc.slug,
        title: uc.title,
        summary: uc.summary,
        valuePotential: uc.value_potential,
        complexity: uc.complexity,
        riskLevel: uc.risk_level,
        timeToValue: uc.time_to_value,
        maturityLevel: uc.maturity_level,
        maturity: uc.maturity,
        industry: indByUc.get(row.use_case_id) ?? null,
        businessFunction: funcByUc.get(row.use_case_id) ?? null,
        aiCapability: capByUc.get(row.use_case_id) ?? null,
      },
    };
  });
}

/**
 * Every saved entry the user can see, capped at `SAVED_MAX_ROWS` and fetched as
 * bounded keyset pages. Kept for callers that render the whole personal
 * workspace at once; prefer `listSavedPageForUser` for new surfaces.
 */
export async function listSavedForUser(userId: string | null): Promise<EnrichedSavedRow[]> {
  const uid = requireUserId(userId);
  const { rows } = await collectPages<EnrichedSavedRow, SavedCursor>(
    (cursor) => listSavedPageForUser(uid, { cursor }),
    SAVED_MAX_ROWS,
  );
  return rows;
}

export async function listScoresForUser(userId: string | null) {
  const uid = requireUserId(userId);
  const result = await supabase
    .from("use_case_scores")
    .select("use_case_id, strategic, value, feasibility, risk, readiness, ttv")
    .eq("user_id", uid);
  return unwrapResult(result, { allowNull: true }) ?? [];
}
