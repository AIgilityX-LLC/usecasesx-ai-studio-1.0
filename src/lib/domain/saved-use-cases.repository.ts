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
 * Raw personal workspace read used by the Pro hook.
 *
 * `saved_use_cases.use_case_id` has no foreign key (it can reference either the
 * global catalogue or a workspace draft), so the content is hydrated in a
 * batch query against `use_cases` plus the industry / function / capability
 * join tables rather than embedded by PostgREST.
 *
 * Returns `EnrichedSavedRow` so callers get the full use-case content
 * (title, summary, classification fields, industry, function, capability)
 * alongside the saved-entry metadata — no more `MOCK_USE_CASES` lookups.
 */
export async function listSavedForUser(userId: string | null): Promise<EnrichedSavedRow[]> {
  const uid = requireUserId(userId);
  const result = await supabase
    .from("saved_use_cases")
    .select("use_case_id, priority, note, saved_at")
    .eq("user_id", uid)
    .order("saved_at", { ascending: false });
  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as Array<{
    use_case_id: string;
    priority: string;
    note: string | null;
    saved_at: string;
  }>;
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((row) => row.use_case_id))];

  // Batch-fetch use case content + join tables in parallel.
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

  const ucMap = new Map(
    (unwrapResult(ucRes, { allowNull: true }) ?? []).map((uc) => [uc.id, uc] as const),
  );

  const indByUc = new Map<string, { slug: string; name: string }>();
  for (const row of (unwrapResult(indRes, { allowNull: true }) ?? []) as Array<{
    use_case_id: string;
    industries?: { slug: string; name: string } | null;
  }>) {
    if (row.industries) indByUc.set(row.use_case_id, row.industries);
  }

  const funcByUc = new Map<string, string>();
  for (const row of (unwrapResult(funcRes, { allowNull: true }) ?? []) as Array<{
    use_case_id: string;
    business_functions?: { name: string } | null;
  }>) {
    if (row.business_functions?.name) funcByUc.set(row.use_case_id, row.business_functions.name);
  }

  const capByUc = new Map<string, string>();
  for (const row of (unwrapResult(capRes, { allowNull: true }) ?? []) as Array<{
    use_case_id: string;
    ai_capabilities?: { name: string } | null;
  }>) {
    if (row.ai_capabilities?.name) capByUc.set(row.use_case_id, row.ai_capabilities.name);
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

export async function listScoresForUser(userId: string | null) {
  const uid = requireUserId(userId);
  const result = await supabase
    .from("use_case_scores")
    .select("use_case_id, strategic, value, feasibility, risk, readiness, ttv")
    .eq("user_id", uid);
  return unwrapResult(result, { allowNull: true }) ?? [];
}
