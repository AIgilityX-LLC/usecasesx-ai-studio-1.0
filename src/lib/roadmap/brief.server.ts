/**
 * Roadmap / brief server persistence (V2-14).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  briefDraftSchema,
  emptyBriefDraft,
  type ImplementationBrief,
  type ImplementationBriefDraft,
} from "./implementation-brief";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

const BRIEF_SELECT =
  "id, use_case_id, portfolio_id, organization_id, workspace_id, version, status, title, outcomes, scope, assumptions, architecture, data_needs, human_controls, measures, acceptance_criteria, handoff_links, record_version, scoring_version, published_at, created_by, created_at, updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBrief(row: any): ImplementationBrief {
  return {
    id: row.id,
    useCaseId: row.use_case_id,
    portfolioId: row.portfolio_id ?? null,
    workspaceId: row.workspace_id,
    version: row.version,
    status: row.status,
    title: row.title ?? "Implementation brief",
    outcomes: row.outcomes ?? "",
    scope: row.scope ?? "",
    assumptions: row.assumptions ?? "",
    architecture: row.architecture ?? "",
    dataNeeds: row.data_needs ?? "",
    humanControls: row.human_controls ?? "",
    measures: row.measures ?? "",
    acceptanceCriteria: row.acceptance_criteria ?? "",
    handoffLinks: Array.isArray(row.handoff_links) ? row.handoff_links : [],
    recordVersion: row.record_version ?? null,
    scoringVersion: row.scoring_version ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function draftColumns(draft: ImplementationBriefDraft) {
  const clean = briefDraftSchema.parse(draft);
  return {
    title: clean.title,
    outcomes: clean.outcomes,
    scope: clean.scope,
    assumptions: clean.assumptions,
    architecture: clean.architecture,
    data_needs: clean.dataNeeds,
    human_controls: clean.humanControls,
    measures: clean.measures,
    acceptance_criteria: clean.acceptanceCriteria,
    handoff_links: clean.handoffLinks,
    record_version: clean.recordVersion ?? null,
    scoring_version: clean.scoringVersion ?? null,
  };
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function listBriefsForUseCase(
  supabase: Db,
  useCaseId: string,
): Promise<ImplementationBrief[]> {
  const { data, error } = await supabase
    .from("implementation_briefs")
    .select(BRIEF_SELECT)
    .eq("use_case_id", useCaseId)
    .is("deleted_at", null)
    .order("version", { ascending: false });
  fail(error);
  return (data ?? []).map(toBrief);
}

export async function getOrCreateDraftBrief(
  supabase: Db,
  input: {
    useCaseId: string;
    workspaceId: string;
    userId: string;
    portfolioId?: string | null;
    title?: string;
  },
): Promise<ImplementationBrief> {
  const { data: existing } = await supabase
    .from("implementation_briefs")
    .select(BRIEF_SELECT)
    .eq("use_case_id", input.useCaseId)
    .eq("status", "draft")
    .is("deleted_at", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return toBrief(existing);

  const { data: latest } = await supabase
    .from("implementation_briefs")
    .select("version")
    .eq("use_case_id", input.useCaseId)
    .is("deleted_at", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = ((latest?.version as number | undefined) ?? 0) + 1;
  const seed = emptyBriefDraft(input.title);
  const { data, error } = await supabase
    .from("implementation_briefs")
    .insert({
      use_case_id: input.useCaseId,
      portfolio_id: input.portfolioId ?? null,
      workspace_id: input.workspaceId,
      version: nextVersion,
      status: "draft",
      created_by: input.userId,
      ...draftColumns(seed),
    })
    .select(BRIEF_SELECT)
    .single();
  fail(error);
  return toBrief(data);
}

export async function saveBriefDraft(
  supabase: Db,
  briefId: string,
  draft: ImplementationBriefDraft,
): Promise<ImplementationBrief> {
  const { data: row, error: loadError } = await supabase
    .from("implementation_briefs")
    .select("id, status")
    .eq("id", briefId)
    .maybeSingle();
  fail(loadError);
  if (!row) throw new Error("Brief not found.");
  if (row.status === "published") {
    throw new Error("Published briefs are immutable; create a new draft version.");
  }
  const { data, error } = await supabase
    .from("implementation_briefs")
    .update(draftColumns(draft))
    .eq("id", briefId)
    .select(BRIEF_SELECT)
    .single();
  fail(error);
  return toBrief(data);
}

export async function publishBrief(
  supabase: Db,
  briefId: string,
): Promise<ImplementationBrief> {
  const { data, error } = await supabase
    .from("implementation_briefs")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", briefId)
    .eq("status", "draft")
    .select(BRIEF_SELECT)
    .single();
  fail(error);
  return toBrief(data);
}

/** After publish, open the next draft by cloning the published content. */
export async function clonePublishedToDraft(
  supabase: Db,
  publishedId: string,
  userId: string,
): Promise<ImplementationBrief> {
  const { data: published, error } = await supabase
    .from("implementation_briefs")
    .select(BRIEF_SELECT)
    .eq("id", publishedId)
    .eq("status", "published")
    .maybeSingle();
  fail(error);
  if (!published) throw new Error("Published brief not found.");
  const brief = toBrief(published);
  return getOrCreateDraftBrief(supabase, {
    useCaseId: brief.useCaseId,
    workspaceId: brief.workspaceId,
    userId,
    portfolioId: brief.portfolioId,
    title: brief.title,
  }).then(async (draft) => {
    if (draft.version === brief.version) return draft;
    return saveBriefDraft(supabase, draft.id, {
      title: brief.title,
      outcomes: brief.outcomes,
      scope: brief.scope,
      assumptions: brief.assumptions,
      architecture: brief.architecture,
      dataNeeds: brief.dataNeeds,
      humanControls: brief.humanControls,
      measures: brief.measures,
      acceptanceCriteria: brief.acceptanceCriteria,
      handoffLinks: brief.handoffLinks,
      recordVersion: brief.recordVersion,
      scoringVersion: brief.scoringVersion,
    });
  });
}
