/**
 * Opportunity capture — server-only data access.
 *
 * Never imported from client code; reached only through
 * `src/lib/opportunities.functions.ts` handlers, which run with the caller's
 * RLS-scoped Supabase client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyDraft,
  keywordsOf,
  type JsonValue,
  type OpportunityDraft,
  type OpportunityStatus,
} from "@/lib/opportunities";

// The middleware-provided client shape used across the server layer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export type OpportunityRow = OpportunityDraft & {
  id: string;
  organizationId: string | null;
  workspaceId: string;
  createdBy: string;
  aiAssisted: boolean;
  aiSuggestions: Record<string, JsonValue> | null;
  convertedUseCaseId: string | null;
  convertedAt: string | null;
  sourceUseCaseId: string | null;
  createdAt: string;
  updatedAt: string;
};

const SELECT = `id, organization_id, workspace_id, created_by, title, pain_point, process,
  process_id, org_unit_id, business_function, strategic_objective, strategic_theme_id,
  stakeholders, baseline, desired_outcome, urgency, owner_name, evidence, status, source,
  source_use_case_id, source_reference, ai_assisted, ai_suggestions, converted_use_case_id,
  converted_at, created_at, updated_at`;

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toOpportunity(row: any): OpportunityRow {
  return {
    ...emptyDraft(),
    id: row.id,
    organizationId: row.organization_id ?? null,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    title: row.title ?? "",
    painPoint: row.pain_point ?? "",
    process: row.process ?? "",
    processId: row.process_id ?? null,
    orgUnitId: row.org_unit_id ?? null,
    businessFunction: row.business_function ?? "",
    strategicObjective: row.strategic_objective ?? "",
    strategicThemeId: row.strategic_theme_id ?? null,
    stakeholders: asStringArray(row.stakeholders),
    baseline: row.baseline ?? "",
    desiredOutcome: row.desired_outcome ?? "",
    urgency: row.urgency ?? "unknown",
    ownerName: row.owner_name ?? "",
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    status: row.status ?? "signal",
    source: row.source ?? "scratch",
    sourceReference: row.source_reference ?? "",
    aiAssisted: Boolean(row.ai_assisted),
    aiSuggestions: row.ai_suggestions ?? null,
    convertedUseCaseId: row.converted_use_case_id ?? null,
    convertedAt: row.converted_at ?? null,
    sourceUseCaseId: row.source_use_case_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Column payload shared by create and update. */
export function toColumns(draft: OpportunityDraft) {
  return {
    title: draft.title.trim(),
    pain_point: draft.painPoint?.trim() || null,
    process: draft.process?.trim() || null,
    process_id: draft.processId ?? null,
    org_unit_id: draft.orgUnitId ?? null,
    business_function: draft.businessFunction?.trim() || null,
    strategic_objective: draft.strategicObjective?.trim() || null,
    strategic_theme_id: draft.strategicThemeId ?? null,
    stakeholders: draft.stakeholders ?? [],
    baseline: draft.baseline?.trim() || null,
    desired_outcome: draft.desiredOutcome?.trim() || null,
    urgency: draft.urgency ?? "unknown",
    owner_name: draft.ownerName?.trim() || null,
    evidence: draft.evidence ?? [],
    source: draft.source ?? "scratch",
    source_reference: draft.sourceReference?.trim() || null,
  };
}

/** Idempotent workspace provisioning (SECURITY DEFINER RPC). */
export async function resolveWorkspaceId(supabase: Db): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_user_workspace");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Could not resolve your workspace.");
  return data as string;
}

export async function listOpportunities(
  supabase: Db,
  opts: { status?: OpportunityStatus | "all"; search?: string } = {},
): Promise<OpportunityRow[]> {
  let query = supabase
    .from("opportunities")
    .select(SELECT)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  const search = opts.search?.trim();
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toOpportunity);
}

export async function getOpportunity(supabase: Db, id: string): Promise<OpportunityRow | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOpportunity(data) : null;
}

/**
 * Non-blocking duplicate hint: overlapping keywords across the caller's own
 * opportunities plus published repository entries. Never prevents a save.
 */
export async function findSimilar(
  supabase: Db,
  title: string,
  excludeId?: string | null,
): Promise<{
  opportunities: Array<{ id: string; title: string; status: string }>;
  repository: Array<{ slug: string; title: string }>;
}> {
  const words = keywordsOf(title);
  if (words.length === 0) return { opportunities: [], repository: [] };
  const filter = words.map((w) => `title.ilike.%${w}%`).join(",");

  const [own, repo] = await Promise.all([
    supabase.from("opportunities").select("id, title, status").or(filter).limit(5),
    supabase.from("use_cases").select("slug, title").eq("status", "published").or(filter).limit(4),
  ]);

  return {
    opportunities: (own.data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.id !== excludeId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({ id: r.id, title: r.title, status: r.status })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository: (repo.data ?? []).map((r: any) => ({ slug: r.slug, title: r.title })),
  };
}

/** Board that receives use cases converted from captured opportunities. */
export async function ensureCaptureBoard(
  supabase: Db,
  workspaceId: string,
  userId: string,
): Promise<string> {
  const TITLE = "Captured opportunities";
  const { data: existing, error } = await supabase
    .from("use_case_boards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("title", TITLE)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing?.id) return existing.id as string;

  const { data: created, error: createErr } = await supabase
    .from("use_case_boards")
    .insert({
      workspace_id: workspaceId,
      title: TITLE,
      description: "Use cases designed from captured business problems.",
      board_type: "capture",
      status: "active",
      created_by: userId,
    })
    .select("id")
    .single();
  if (createErr || !created) throw new Error(createErr?.message ?? "Could not create board.");
  return created.id as string;
}

export async function nextBoardPosition(supabase: Db, boardId: string): Promise<number> {
  const { data } = await supabase
    .from("ai_use_cases")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.position as number | undefined) ?? -1) + 1;
}
