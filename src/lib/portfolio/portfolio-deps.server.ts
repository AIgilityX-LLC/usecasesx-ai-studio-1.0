/**
 * Portfolio dependencies & scenarios persistence (server-only).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dependencyInputSchema,
  scenarioDraftSchema,
  type PortfolioDependency,
  type PortfolioScenarioDraft,
  type ScenarioWeights,
} from "./dependencies-scenarios";

type Client = SupabaseClient<any, any, any>;

const DEP_SELECT =
  "id, portfolio_id, from_use_case_id, dependency_type, to_use_case_id, label, notes, created_at";

const SCN_SELECT =
  "id, portfolio_id, name, description, weights, budget, capacity, constraints_text, created_at, updated_at";

export type StoredScenario = {
  id: string;
  portfolioId: string;
  name: string;
  description: string;
  weights: ScenarioWeights;
  budget: number | null;
  capacity: number | null;
  constraints: string;
  createdAt: string;
  updatedAt: string;
};

function rowToDep(row: Record<string, unknown>): PortfolioDependency {
  return {
    id: String(row.id),
    portfolioId: String(row.portfolio_id),
    fromUseCaseId: String(row.from_use_case_id),
    dependencyType: row.dependency_type as PortfolioDependency["dependencyType"],
    toUseCaseId: (row.to_use_case_id as string) ?? null,
    label: String(row.label),
    notes: (row.notes as string) ?? null,
  };
}

function rowToScenario(row: Record<string, unknown>): StoredScenario {
  const w = (row.weights ?? {}) as Partial<ScenarioWeights>;
  return {
    id: String(row.id),
    portfolioId: String(row.portfolio_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    weights: {
      value: Number(w.value ?? 1),
      feasibility: Number(w.feasibility ?? 1),
      governability: Number(w.governability ?? 1),
      urgency: Number(w.urgency ?? 1),
    },
    budget: row.budget == null ? null : Number(row.budget),
    capacity: row.capacity == null ? null : Number(row.capacity),
    constraints: String(row.constraints_text ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function portfolioTenant(
  supabase: Client,
  portfolioId: string,
): Promise<{ workspaceId: string; organizationId: string | null }> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("workspace_id, organization_id")
    .eq("id", portfolioId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.workspace_id) throw new Error("Portfolio not found or has no workspace.");
  return {
    workspaceId: String(data.workspace_id),
    organizationId: (data.organization_id as string) ?? null,
  };
}

export async function listDependencies(
  supabase: Client,
  portfolioId: string,
): Promise<PortfolioDependency[]> {
  const { data, error } = await supabase
    .from("portfolio_dependencies")
    .select(DEP_SELECT)
    .eq("portfolio_id", portfolioId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToDep(r as Record<string, unknown>));
}

export async function addDependency(
  supabase: Client,
  userId: string,
  raw: unknown,
): Promise<PortfolioDependency> {
  const input = dependencyInputSchema.parse(raw);
  const tenant = await portfolioTenant(supabase, input.portfolioId);

  const { data, error } = await supabase
    .from("portfolio_dependencies")
    .insert({
      portfolio_id: input.portfolioId,
      workspace_id: tenant.workspaceId,
      organization_id: tenant.organizationId,
      from_use_case_id: input.fromUseCaseId,
      dependency_type: input.dependencyType,
      to_use_case_id: input.toUseCaseId ?? null,
      label: input.label,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select(DEP_SELECT)
    .single();
  if (error) throw new Error(error.message);

  // Keep legacy depends_on in sync for prerequisite use cases (roadmap lane).
  if (input.dependencyType === "prerequisite_use_case" && input.toUseCaseId) {
    const { data: item } = await supabase
      .from("portfolio_items")
      .select("depends_on")
      .eq("portfolio_id", input.portfolioId)
      .eq("use_case_id", input.fromUseCaseId)
      .maybeSingle();
    const existing = Array.isArray(item?.depends_on) ? (item!.depends_on as string[]) : [];
    if (!existing.includes(input.toUseCaseId)) {
      await supabase
        .from("portfolio_items")
        .update({ depends_on: [...existing, input.toUseCaseId] })
        .eq("portfolio_id", input.portfolioId)
        .eq("use_case_id", input.fromUseCaseId);
    }
  }

  return rowToDep(data as Record<string, unknown>);
}

export async function softDeleteDependency(supabase: Client, dependencyId: string): Promise<void> {
  const { error } = await supabase
    .from("portfolio_dependencies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", dependencyId);
  if (error) throw new Error(error.message);
}

export async function listScenarios(
  supabase: Client,
  portfolioId: string,
): Promise<StoredScenario[]> {
  const { data, error } = await supabase
    .from("portfolio_scenarios")
    .select(SCN_SELECT)
    .eq("portfolio_id", portfolioId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToScenario(r as Record<string, unknown>));
}

export async function saveScenario(
  supabase: Client,
  userId: string,
  portfolioId: string,
  draftRaw: unknown,
): Promise<StoredScenario> {
  const draft = scenarioDraftSchema.parse(draftRaw) as PortfolioScenarioDraft;
  const tenant = await portfolioTenant(supabase, portfolioId);

  const { data, error } = await supabase
    .from("portfolio_scenarios")
    .insert({
      portfolio_id: portfolioId,
      workspace_id: tenant.workspaceId,
      organization_id: tenant.organizationId,
      name: draft.name,
      description: draft.description,
      weights: draft.weights,
      budget: draft.budget,
      capacity: draft.capacity,
      constraints_text: draft.constraints,
      created_by: userId,
    })
    .select(SCN_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return rowToScenario(data as Record<string, unknown>);
}

export async function softDeleteScenario(supabase: Client, scenarioId: string): Promise<void> {
  const { error } = await supabase
    .from("portfolio_scenarios")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", scenarioId);
  if (error) throw new Error(error.message);
}
