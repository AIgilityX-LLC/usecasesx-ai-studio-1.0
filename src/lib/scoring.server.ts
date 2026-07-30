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
  composite: number | null;
  riskAdjusted: number | null;
  completeness: number;
  confidence: string | null;
  recommendation: string | null;
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
    composite: row.composite_score === null ? null : Number(row.composite_score),
    riskAdjusted: row.risk_adjusted_score === null ? null : Number(row.risk_adjusted_score),
    completeness: row.completeness === null ? 0 : Number(row.completeness),
    confidence: row.confidence ?? null,
    recommendation: row.recommendation ?? null,
    note: row.note ?? null,
    createdAt: row.created_at,
    createdBy: row.created_by,
    result: (explanation.result as ScoreResult | undefined) ?? null,
  };
}

const RESULT_SELECT = `id, use_case_id, scorecard_id, scorecard_slug, scorecard_version,
  responses, composite_score, risk_adjusted_score, completeness, confidence, recommendation,
  explanation, note, created_at, created_by`;

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
    result: ScoreResult;
    note: string | null;
    createdBy: string;
  },
): Promise<StoredResult> {
  const { result } = input;
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
      explanation: { result },
      note: input.note,
      created_by: input.createdBy,
    })
    .select(RESULT_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return toStored(data);
}

/** Workspace of the use case, used for tenant-aware scorecard resolution. */
export async function useCaseTenancy(supabase: Db, useCaseId: string) {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .select("id, title, workspace_id, organization_id")
    .eq("id", useCaseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}
