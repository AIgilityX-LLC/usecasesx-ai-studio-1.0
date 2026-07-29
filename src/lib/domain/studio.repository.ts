/**
 * Studio repository — the single data-access boundary for the AI Use Case
 * Studio™ surfaces (use case detail, feasibility, data readiness, blueprint,
 * AdvisorX, SARPI, C3G governance and the Studio portfolio view).
 *
 * Returns plain data or throws a `DomainError`.
 * See `docs/architecture/domain-boundaries.md`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import { DomainError, normalizeError, unwrapResult } from "./errors";
import { requireUserId } from "./ownership";

export type IntegrationType = "SARPI" | "AdvisorX" | "C3G";

/* ---------------- session ---------------- */

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function requireCurrentUserId(): Promise<string> {
  return requireUserId(await currentUserId());
}

/* ---------------- ai_use_cases ---------------- */

export async function getStudioUseCase<T = any>(
  id: string,
  columns = "*",
): Promise<T | null> {
  const result = await supabase.from("ai_use_cases").select(columns).eq("id", id).maybeSingle();
  return (unwrapResult(result, { allowNull: true }) ?? null) as T | null;
}

export async function requireStudioUseCase<T = any>(id: string, columns = "*"): Promise<T> {
  const row = await getStudioUseCase<T>(id, columns);
  if (!row) throw new DomainError("not_found", "We could not find that use case.");
  return row;
}

export async function listStudioUseCases<T = any>(): Promise<T[]> {
  const result = await supabase.from("ai_use_cases").select("*");
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

/* ---------------- feasibility_scores ---------------- */

const FEASIBILITY_SUMMARY_COLUMNS =
  "id, desirability_score, viability_score, feasibility_score, governability_score, sustainability_score, notes";

export async function getLatestFeasibility<T = any>(
  useCaseId: string,
  columns: string = FEASIBILITY_SUMMARY_COLUMNS,
  orderBy: "updated_at" | "created_at" = "updated_at",
): Promise<T | null> {
  const result = await supabase
    .from("feasibility_scores")
    .select(columns)
    .eq("use_case_id", useCaseId)
    .order(orderBy, { ascending: false })
    .limit(1)
    .maybeSingle();
  return (unwrapResult(result, { allowNull: true }) ?? null) as T | null;
}

export async function listFeasibilityForUseCases<T = any>(useCaseIds: string[]): Promise<T[]> {
  if (useCaseIds.length === 0) return [];
  const result = await supabase.from("feasibility_scores").select("*").in("use_case_id", useCaseIds);
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

/** Creates or updates the feasibility score row and returns its id. */
export async function saveFeasibility(input: {
  existingId: string | null;
  payload: Record<string, unknown>;
}): Promise<string> {
  await requireCurrentUserId();
  const result = input.existingId
    ? await (supabase as any)
        .from("feasibility_scores")
        .update({ ...input.payload, updated_at: new Date().toISOString() })
        .eq("id", input.existingId)
        .select("id")
        .single()
    : await (supabase as any).from("feasibility_scores").insert(input.payload).select("id").single();
  const row = unwrapResult(result);
  return (row as { id: string }).id;
}

/* ---------------- data_readiness_assessments ---------------- */

export async function getLatestDataReadiness<T = any>(useCaseId: string): Promise<T | null> {
  const result = await supabase
    .from("data_readiness_assessments")
    .select("*")
    .eq("use_case_id", useCaseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (unwrapResult(result, { allowNull: true }) ?? null) as T | null;
}

export async function createDataReadiness(payload: Record<string, unknown>): Promise<void> {
  await requireCurrentUserId();
  const { error } = await (supabase as any).from("data_readiness_assessments").insert(payload);
  if (error) throw normalizeError(error);
}

/* ---------------- blueprints ---------------- */

export async function getBlueprint<T = any>(
  useCaseId: string,
  columns = "*",
  ordered = false,
): Promise<T | null> {
  let query = supabase.from("blueprints").select(columns).eq("use_case_id", useCaseId);
  if (ordered) query = query.order("updated_at", { ascending: false }).limit(1);
  const result = await query.maybeSingle();
  return (unwrapResult(result, { allowNull: true }) ?? null) as T | null;
}

/** Upserts the blueprint row for a use case (single row per use case). */
export async function saveBlueprint(
  useCaseId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const existing = await getBlueprint<{ id: string }>(useCaseId, "id");
  const { error } = existing
    ? await (supabase as any).from("blueprints").update(patch).eq("id", existing.id)
    : await (supabase as any).from("blueprints").insert({ use_case_id: useCaseId, ...patch });
  if (error) throw normalizeError(error);
}

/** Appends a block of text to the blueprint executive summary. */
export async function appendBlueprintSummary(useCaseId: string, block: string): Promise<void> {
  const existing = await getBlueprint<{ id: string; executive_summary: string | null }>(
    useCaseId,
    "id, executive_summary",
  );
  const merged = (existing?.executive_summary ?? "") + block;
  await saveBlueprint(useCaseId, { executive_summary: merged });
}

/* ---------------- integration_links ---------------- */

export async function listIntegrationLinks<T = any>(
  useCaseId: string,
  integrationType?: IntegrationType,
  options: { latestFirst?: boolean; limit?: number } = {},
): Promise<T[]> {
  let query = supabase.from("integration_links").select("*").eq("use_case_id", useCaseId);
  if (integrationType) query = query.eq("integration_type", integrationType);
  if (options.latestFirst) query = query.order("created_at", { ascending: false });
  if (options.limit) query = query.limit(options.limit);
  const result = await query;
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function listIntegrationLinksForUseCases<T = any>(useCaseIds: string[]): Promise<T[]> {
  if (useCaseIds.length === 0) return [];
  const result = await supabase
    .from("integration_links")
    .select("use_case_id, integration_type, status")
    .in("use_case_id", useCaseIds);
  return (unwrapResult(result, { allowNull: true }) ?? []) as T[];
}

export async function createIntegrationLink<T = any>(input: {
  useCaseId: string;
  integrationType: IntegrationType;
  status: string;
  metadata?: Record<string, unknown>;
}): Promise<T> {
  const result = await (supabase as any)
    .from("integration_links")
    .insert({
      use_case_id: input.useCaseId,
      integration_type: input.integrationType,
      status: input.status,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  return unwrapResult(result) as T;
}

/** Fire-and-return variant used by "send to platform" buttons that ignore the row. */
export async function sendToIntegration(
  useCaseId: string,
  integrationType: IntegrationType,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await (supabase as any).from("integration_links").insert({
    use_case_id: useCaseId,
    integration_type: integrationType,
    status: "pending",
    metadata,
  });
  if (error) throw normalizeError(error);
}
