/**
 * Studio wizard — server-only helpers.
 *
 * Maps the wizard's step bags onto the canonical `ai_use_cases` columns so the
 * rest of the product (scoring, portfolios, blueprints, exports) keeps reading
 * the same fields it always has, and builds the immutable version snapshot.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { valuesFor, type WizardState } from "@/lib/studio-wizard";

function str(state: WizardState, step: string, key: string): string | null {
  const v = valuesFor(state, step)[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function arr(state: WizardState, step: string, key: string): string[] {
  const v = valuesFor(state, step)[key];
  return Array.isArray(v) ? v.map((s) => s.trim()).filter(Boolean) : [];
}

/**
 * Canonical column mirror. Only columns that already exist on `ai_use_cases`
 * are written; everything else lives in `wizard_state`.
 */
export function mirrorColumns(state: WizardState): Record<string, unknown> {
  const out: Record<string, unknown> = {
    problem_statement: str(state, "opportunity", "problemStatement"),
    current_state: str(state, "businessContext", "currentState"),
    future_state: str(state, "solution", "futureState"),
    ai_type: str(state, "solution", "aiType"),
    mvp_scope: str(state, "solution", "mvpScope"),
    minimum_viable_prediction: str(state, "solution", "minimumViablePrediction"),
    beneficiaries: str(state, "stakeholders", "beneficiaries"),
    risk_level: str(state, "risk", "riskLevel"),
    stakeholders: arr(state, "stakeholders", "stakeholders"),
    data_sources: arr(state, "dataTechnology", "dataSources"),
    expected_benefits: arr(state, "value", "expectedBenefits"),
    kpis: arr(state, "value", "kpis"),
    risks: arr(state, "risk", "risks"),
    controls: arr(state, "risk", "controls"),
  };
  const title = str(state, "opportunity", "title");
  if (title) out.title = title;
  return out;
}

/** Merge one step's values into the stored state without losing other steps. */
export function mergeState(
  current: unknown,
  stepId: string,
  values: Record<string, string | string[]>,
): WizardState {
  const base: WizardState =
    current && typeof current === "object" && !Array.isArray(current)
      ? ({ ...(current as WizardState) } as WizardState)
      : {};
  base[stepId] = { ...(base[stepId] ?? {}), ...values };
  return base;
}

export async function loadUseCase(supabase: SupabaseClient<any, any, any>, id: string) {
  const { data, error } = await supabase.from("ai_use_cases").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function listVersions(supabase: SupabaseClient<any, any, any>, useCaseId: string) {
  const { data, error } = await supabase
    .from("use_case_versions")
    .select("id, version, note, created_at, created_by")
    .eq("use_case_id", useCaseId)
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
