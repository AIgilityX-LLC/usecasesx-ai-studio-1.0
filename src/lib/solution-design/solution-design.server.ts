/**
 * Solution design — server-only persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptySolutionDesign,
  solutionDesignDraftSchema,
  type FieldMeta,
  type OwaspResponses,
  type SolutionDesignDraft,
} from "./model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export type SolutionDesignRow = SolutionDesignDraft & {
  id: string;
  useCaseId: string;
  organizationId: string | null;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

const SELECT = `id, use_case_id, organization_id, workspace_id, solution_type, modality_notes,
  model_options, tool_options, vendor_options, build_buy_partner, human_role, autonomy_level,
  agent_goal, planning_method, tools_actions, identities_credentials, memory, knowledge_sources,
  delegation, human_checkpoints, action_limits, transaction_limits, sandbox, kill_switch,
  observability, fallback, field_meta, owasp_responses, created_by, created_at, updated_at, deleted_at`;

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSolutionDesign(row: any): SolutionDesignRow {
  const draft = emptySolutionDesign({
    solutionType: row.solution_type ?? null,
    modalityNotes: row.modality_notes ?? "",
    modelOptions: row.model_options ?? "",
    toolOptions: row.tool_options ?? "",
    vendorOptions: row.vendor_options ?? "",
    buildBuyPartner: row.build_buy_partner ?? null,
    humanRole: row.human_role ?? "",
    autonomyLevel: row.autonomy_level ?? null,
    agentGoal: row.agent_goal ?? "",
    planningMethod: row.planning_method ?? "",
    toolsActions: asStringArray(row.tools_actions),
    identitiesCredentials: row.identities_credentials ?? "",
    memory: row.memory ?? "",
    knowledgeSources: row.knowledge_sources ?? "",
    delegation: row.delegation ?? "",
    humanCheckpoints: row.human_checkpoints ?? "",
    actionLimits: row.action_limits ?? "",
    transactionLimits: row.transaction_limits ?? "",
    sandbox: row.sandbox ?? "",
    killSwitch: row.kill_switch ?? "",
    observability: row.observability ?? "",
    fallback: row.fallback ?? "",
    fieldMeta: (row.field_meta ?? {}) as FieldMeta,
    owaspResponses: (row.owasp_responses ?? {}) as OwaspResponses,
  });
  return {
    ...draft,
    id: row.id,
    useCaseId: row.use_case_id,
    organizationId: row.organization_id ?? null,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
}

export function toColumns(draft: SolutionDesignDraft) {
  return {
    solution_type: draft.solutionType,
    modality_notes: draft.modalityNotes?.trim() || null,
    model_options: draft.modelOptions?.trim() || null,
    tool_options: draft.toolOptions?.trim() || null,
    vendor_options: draft.vendorOptions?.trim() || null,
    build_buy_partner: draft.buildBuyPartner,
    human_role: draft.humanRole?.trim() || null,
    autonomy_level: draft.autonomyLevel,
    agent_goal: draft.agentGoal?.trim() || null,
    planning_method: draft.planningMethod?.trim() || null,
    tools_actions: draft.toolsActions ?? [],
    identities_credentials: draft.identitiesCredentials?.trim() || null,
    memory: draft.memory?.trim() || null,
    knowledge_sources: draft.knowledgeSources?.trim() || null,
    delegation: draft.delegation?.trim() || null,
    human_checkpoints: draft.humanCheckpoints?.trim() || null,
    action_limits: draft.actionLimits?.trim() || null,
    transaction_limits: draft.transactionLimits?.trim() || null,
    sandbox: draft.sandbox?.trim() || null,
    kill_switch: draft.killSwitch?.trim() || null,
    observability: draft.observability?.trim() || null,
    fallback: draft.fallback?.trim() || null,
    field_meta: draft.fieldMeta ?? {},
    owasp_responses: draft.owaspResponses ?? {},
  };
}

export async function getSolutionDesign(
  supabase: Db,
  useCaseId: string,
): Promise<SolutionDesignRow | null> {
  const { data, error } = await supabase
    .from("use_case_solution_designs")
    .select(SELECT)
    .eq("use_case_id", useCaseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSolutionDesign(data) : null;
}

async function loadUseCaseTenancy(
  supabase: Db,
  useCaseId: string,
): Promise<{ workspaceId: string; organizationId: string | null }> {
  const { data, error } = await supabase
    .from("ai_use_cases")
    .select("id, workspace_id, organization_id")
    .eq("id", useCaseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.workspace_id) throw new Error("Use case not found or has no workspace.");
  return {
    workspaceId: data.workspace_id as string,
    organizationId: (data.organization_id as string | null) ?? null,
  };
}

export async function upsertSolutionDesign(
  supabase: Db,
  userId: string,
  useCaseId: string,
  raw: unknown,
): Promise<SolutionDesignRow> {
  const draft = solutionDesignDraftSchema.parse(raw);
  const tenancy = await loadUseCaseTenancy(supabase, useCaseId);
  const columns = toColumns(draft);
  const existing = await getSolutionDesign(supabase, useCaseId);

  if (existing) {
    const { data, error } = await supabase
      .from("use_case_solution_designs")
      .update(columns)
      .eq("id", existing.id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return toSolutionDesign(data);
  }

  const { data, error } = await supabase
    .from("use_case_solution_designs")
    .insert({
      ...columns,
      use_case_id: useCaseId,
      workspace_id: tenancy.workspaceId,
      organization_id: tenancy.organizationId,
      created_by: userId,
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return toSolutionDesign(data);
}
