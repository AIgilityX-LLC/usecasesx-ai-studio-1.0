/**
 * Scoring — server-only data access and scorecard resolution.
 *
 * Definitions are resolved in this order:
 *   1. the workspace's own default published scorecard, if it has one;
 *   2. the global default published scorecard;
 *   3. the built-in definition shipped in code.
 *
 * Rows whose stored definition is a registry stub (`{"source":"built_in"}`)
 * resolve to the code definition for that slug, so the built-in weights have a
 * single source of truth while results still reference a real, versioned row.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import { BUILT_IN_SCORECARDS, DEFAULT_SCORECARD } from "@/lib/scoring/default-scorecard";
import {
  scorecardDefinitionSchema,
  type ScorecardDefinition,
  type ScoreResult,
} from "@/lib/scoring/model";

type Db = SupabaseClient<any, any, any>;

export type ResolvedScorecard = {
  /** Row id used as the foreign key on every result. */
  id: string;
  /** Null for the global definition. */
  workspaceId: string | null;
  definition: ScorecardDefinition;
};

function definitionFromRow(row: any): ScorecardDefinition {
  const stored = row?.definition;
  const parsed = scorecardDefinitionSchema.safeParse(stored);
  if (parsed.success) return parsed.data as ScorecardDefinition;
  const builtIn = BUILT_IN_SCORECARDS[row?.slug as string];
  if (builtIn && builtIn.version === row?.version) return builtIn;
  return DEFAULT_SCORECARD;
}

/** The definition a new scoring run should use. */
export async function resolveScorecard(
  supabase: Db,
  workspaceId: string | null,
): Promise<ResolvedScorecard> {
  if (workspaceId) {
    const { data } = await supabase
      .from("scorecards")
      .select("id, slug, version, workspace_id, definition")
      .eq("workspace_id", workspaceId)
      .eq("status", "published")
      .eq("is_default", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        id: data.id as string,
        workspaceId: (data.workspace_id as string) ?? null,
        definition: definitionFromRow(data),
      };
    }
  }

  const { data, error } = await supabase
    .from("scorecards")
    .select("id, slug, version, workspace_id, definition")
    .is("workspace_id", null)
    .eq("status", "published")
    .eq("is_default", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("No scorecard is configured yet. Contact an administrator.");
  }
  return { id: data.id as string, workspaceId: null, definition: definitionFromRow(data) };
}

/** The exact definition a historical result was calculated against. */
export async function resolveScorecardById(
  supabase: Db,
  scorecardId: string,
): Promise<ScorecardDefinition | null> {
  const { data, error } = await supabase
    .from("scorecards")
    .select("id, slug, version, definition")
    .eq("id", scorecardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? definitionFromRow(data) : null;
}

export type StoredResult = {
  id: string;
  useCaseId: string;
  scorecardId: string;
  scorecardSlug: string;
  scorecardVersion: number;
  responses: Record<string, number>;
  /** Human-authored justification per criterion, captured with the answers. */
  evidence: Record<string, string>;
  /** V2-09 per-criterion rationale / confidence / assessor metadata. */
  assessments: import("@/lib/scoring/model").CriterionAssessments;
  composite: number | null;
  riskAdjusted: number | null;
  uncertaintyLow: number | null;
  uncertaintyHigh: number | null;
  completeness: number;
  evidenceCompleteness: number | null;
  confidence: string | null;
  recommendation: string | null;
  reconciliationStatus: string;
  note: string | null;
  createdAt: string;
  createdBy: string;
  result: ScoreResult | null;
};

function toStored(row: any): StoredResult {
  const explanation = (row.explanation ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    useCaseId: row.use_case_id,
    scorecardId: row.scorecard_id,
    scorecardSlug: row.scorecard_slug,
    scorecardVersion: row.scorecard_version,
    responses: (row.responses ?? {}) as Record<string, number>,
    evidence: (explanation.evidence ?? {}) as Record<string, string>,
    assessments: (row.criterion_assessments ??
      explanation.assessments ??
      {}) as import("@/lib/scoring/model").CriterionAssessments,
    composite: row.composite_score === null ? null : Number(row.composite_score),
    riskAdjusted: row.risk_adjusted_score === null ? null : Number(row.risk_adjusted_score),
    uncertaintyLow:
      row.uncertainty_low === null || row.uncertainty_low === undefined
        ? null
        : Number(row.uncertainty_low),
    uncertaintyHigh:
      row.uncertainty_high === null || row.uncertainty_high === undefined
        ? null
        : Number(row.uncertainty_high),
    completeness: row.completeness === null ? 0 : Number(row.completeness),
    evidenceCompleteness:
      row.evidence_completeness === null || row.evidence_completeness === undefined
        ? null
        : Number(row.evidence_completeness),
    confidence: row.confidence ?? null,
    recommendation: row.recommendation ?? null,
    reconciliationStatus: row.reconciliation_status ?? "current",
    note: row.note ?? null,
    createdAt: row.created_at,
    createdBy: row.created_by,
    result: (explanation.result as ScoreResult | undefined) ?? null,
  };
}

const RESULT_SELECT = `id, use_case_id, scorecard_id, scorecard_slug, scorecard_version,
  responses, composite_score, risk_adjusted_score, completeness, confidence, recommendation,
  explanation, note, created_at, created_by, criterion_assessments, uncertainty_low,
  uncertainty_high, evidence_completeness, reconciliation_status`;

export async function listResults(supabase: Db, useCaseId: string): Promise<StoredResult[]> {
  const { data, error } = await supabase
    .from("scorecard_results")
    .select(RESULT_SELECT)
    .eq("use_case_id", useCaseId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toStored);
}

export async function insertResult(
  supabase: Db,
  input: {
    useCaseId: string;
    scorecardId: string;
    responses: Record<string, number>;
    evidence: Record<string, string>;
    assessments?: import("@/lib/scoring/model").CriterionAssessments;
    result: ScoreResult;
    note: string | null;
    createdBy: string;
  },
): Promise<StoredResult> {
  const { result } = input;
  const assessments = input.assessments ?? {};
  const { data, error } = await supabase
    .from("scorecard_results")
    .insert({
      use_case_id: input.useCaseId,
      scorecard_id: input.scorecardId,
      scorecard_slug: result.scorecardSlug,
      scorecard_version: result.scorecardVersion,
      responses: input.responses,
      dimensions: result.dimensions,
      composite_score: result.composite,
      risk_adjusted_score: result.riskAdjusted,
      completeness: result.completeness,
      confidence: result.confidence,
      recommendation: result.recommendation?.id ?? null,
      explanation: { result, evidence: input.evidence, assessments },
      note: input.note,
      created_by: input.createdBy,
      criterion_assessments: assessments,
      uncertainty_low: result.uncertainty?.low ?? null,
      uncertainty_high: result.uncertainty?.high ?? null,
      evidence_completeness: result.evidenceCompleteness,
      reconciliation_status: "current",
    })
    .select(RESULT_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return toStored(data);
}

export type LatestScore = {
  useCaseId: string;
  composite: number | null;
  riskAdjusted: number | null;
  completeness: number;
  confidence: string | null;
  recommendation: string | null;
  scoredAt: string;
  /** True when the result was recorded below the definition's completeness floor. */
  incomplete: boolean;
};

/**
 * Most recent result per use case, for list and portfolio surfaces.
 *
 * RLS already scopes `scorecard_results` to the caller's workspace, so ids the
 * caller cannot see simply return no row rather than an error.
 */
export async function latestScoresFor(
  supabase: Db,
  useCaseIds: string[],
): Promise<Record<string, LatestScore>> {
  if (useCaseIds.length === 0) return {};
  const { data, error } = await supabase
    .from("scorecard_results")
    .select(
      "id, use_case_id, composite_score, risk_adjusted_score, completeness, confidence, recommendation, explanation, created_at",
    )
    .in("use_case_id", useCaseIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const latest: Record<string, LatestScore> = {};
  for (const row of data ?? []) {
    const id = (row as any).use_case_id as string;
    // Rows arrive newest-first, so the first one seen per id is the latest.
    if (latest[id]) continue;
    const result = ((row as any).explanation?.result ?? null) as ScoreResult | null;
    latest[id] = {
      useCaseId: id,
      composite:
        (row as any).composite_score === null ? null : Number((row as any).composite_score),
      riskAdjusted:
        (row as any).risk_adjusted_score === null ? null : Number((row as any).risk_adjusted_score),
      completeness: (row as any).completeness === null ? 0 : Number((row as any).completeness),
      confidence: (row as any).confidence ?? null,
      recommendation: (row as any).recommendation ?? null,
      scoredAt: (row as any).created_at,
      incomplete: Boolean(result?.incomplete),
    };
  }
  return latest;
}

/** Workspace of the use case, used for tenant-aware scorecard resolution. */
export async function useCaseTenancy(supabase: Db, useCaseId: string) {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .select(
      "id, title, workspace_id, organization_id, problem_statement, current_state, future_state, ai_type, beneficiaries, mvp_scope",
    )
    .eq("id", useCaseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Flatten the author's own words about a use case into prompt context.
 * Only fields the author wrote are included — nothing is inferred here.
 */
export function useCaseNarrative(useCase: any): string | undefined {
  const parts = [
    useCase?.problem_statement && `Problem: ${useCase.problem_statement}`,
    useCase?.current_state && `Current state: ${useCase.current_state}`,
    useCase?.future_state && `Future state: ${useCase.future_state}`,
    useCase?.ai_type && `AI type: ${useCase.ai_type}`,
    useCase?.beneficiaries && `Beneficiaries: ${useCase.beneficiaries}`,
    useCase?.mvp_scope && `MVP scope: ${useCase.mvp_scope}`,
  ].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.length > 0 ? parts.join("\n").slice(0, 4000) : undefined;
}

/**
 * Clone a published (or built-in-backed) scorecard into a workspace draft.
 * Admins edit the draft; publishing creates an immutable version.
 */
export async function cloneScorecardToWorkspace(
  supabase: Db,
  input: {
    sourceScorecardId: string;
    workspaceId: string;
    organizationId: string | null;
    userId: string;
    name?: string;
  },
): Promise<{ id: string; slug: string; version: number; status: string }> {
  const { data: source, error } = await supabase
    .from("scorecards")
    .select("id, slug, name, description, version, definition, status")
    .eq("id", input.sourceScorecardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!source) throw new Error("Source scorecard not found.");

  const definition = definitionFromRow(source);
  const baseSlug = `${definition.slug}-ws`;

  const { data: latest } = await supabase
    .from("scorecards")
    .select("version")
    .eq("workspace_id", input.workspaceId)
    .eq("slug", baseSlug)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((latest?.version as number | undefined) ?? 0) + 1;
  const draftDefinition = { ...definition, slug: baseSlug, version: nextVersion };

  const { data: created, error: createErr } = await supabase
    .from("scorecards")
    .insert({
      slug: baseSlug,
      name: input.name?.trim() || `${definition.name} (workspace draft)`,
      description: definition.description,
      version: nextVersion,
      status: "draft",
      is_default: false,
      definition: draftDefinition,
      workspace_id: input.workspaceId,
      organization_id: input.organizationId,
      created_by: input.userId,
    })
    .select("id, slug, version, status")
    .single();
  if (createErr || !created) throw new Error(createErr?.message ?? "Could not clone scorecard.");
  return {
    id: created.id as string,
    slug: created.slug as string,
    version: created.version as number,
    status: created.status as string,
  };
}

/** Publish a draft scorecard. Definition becomes immutable thereafter. */
export async function publishScorecard(
  supabase: Db,
  input: { scorecardId: string; makeDefault?: boolean; workspaceId: string },
): Promise<{ id: string; status: string; version: number }> {
  const { data: row, error } = await supabase
    .from("scorecards")
    .select("id, status, version, workspace_id, definition")
    .eq("id", input.scorecardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Scorecard not found.");
  if (row.workspace_id !== input.workspaceId) {
    throw new Error("Scorecard does not belong to this workspace.");
  }
  if (row.status === "published") {
    return { id: row.id as string, status: "published", version: row.version as number };
  }
  if (row.status !== "draft") {
    throw new Error("Only draft scorecards can be published.");
  }

  if (input.makeDefault) {
    await supabase
      .from("scorecards")
      .update({ is_default: false })
      .eq("workspace_id", input.workspaceId)
      .eq("is_default", true);
  }

  const { data: published, error: pubErr } = await supabase
    .from("scorecards")
    .update({
      status: "published",
      is_default: Boolean(input.makeDefault),
    })
    .eq("id", input.scorecardId)
    .select("id, status, version")
    .single();
  if (pubErr || !published) throw new Error(pubErr?.message ?? "Could not publish scorecard.");
  return {
    id: published.id as string,
    status: published.status as string,
    version: published.version as number,
  };
}
