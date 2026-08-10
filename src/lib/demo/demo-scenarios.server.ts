/**
 * Demo scenario templates — server-only.
 *
 * Two responsibilities:
 *  1. Seed/reset the labelled demonstration template workspaces (service role).
 *     Every workspace and organisation created here is flagged `is_demo`, so it
 *     is excluded from activation analytics by the `activation_funnel_daily` view.
 *  2. Copy a scenario into the caller's own workspace as user-owned records
 *     carrying template lineage. The copy reads from the static scenario library
 *     (not from the demo tenant), so no cross-tenant read is ever required.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DEMO_DISCLAIMER,
  DEMO_SCENARIOS,
  DEMO_TEMPLATE_VERSION,
  findScenario,
  type DemoScenario,
} from "./demo-scenarios";
import { writeScenario, type Db } from "./demo-scenarios.write";

export { writeScenario };

const TEMPLATE_OWNER_EMAIL = "superadmin@demo.usecasex.app";

function fail(context: string, error: { message?: string } | null | undefined) {
  if (error) throw new Error(`${context}: ${error.message ?? "unknown error"}`);
}

async function resolveTemplateOwner(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("email", TEMPLATE_OWNER_EMAIL)
    .maybeSingle();
  if (data?.user_id) return data.user_id;

  const { data: fallback } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .like("email", "%@demo.usecasex.app")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return fallback?.user_id ?? null;
}

async function ensureDemoOrg(scenario: DemoScenario): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("name", scenario.organization.name)
    .maybeSingle();
  if (existing?.id) {
    await supabaseAdmin.from("organizations").update({ is_demo: true }).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: scenario.organization.name,
      type: scenario.organization.type,
      industry: scenario.organization.industry,
      country: scenario.organization.country,
      plan: "enterprise",
      is_demo: true,
    })
    .select("id")
    .single();
  fail("create demo organization", error);
  return data!.id;
}

async function ensureTemplateWorkspace(
  scenario: DemoScenario,
  orgId: string,
  ownerId: string,
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("demo_scenario_key", scenario.key)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .insert({
      organization_id: orgId,
      name: scenario.workspace,
      description: `${scenario.summary} ${DEMO_DISCLAIMER}`,
      workspace_type: "demo_template",
      created_by: ownerId,
      is_demo: true,
      is_demo_template: true,
      demo_scenario_key: scenario.key,
    })
    .select("id")
    .single();
  fail("create demo template workspace", error);

  await supabaseAdmin
    .from("workspace_members")
    .insert({ workspace_id: data!.id, user_id: ownerId, role: "owner" });

  return data!.id;
}

async function purgeWorkspace(workspaceId: string) {
  const { data: portfolios } = await supabaseAdmin
    .from("portfolios")
    .select("id")
    .eq("workspace_id", workspaceId);
  for (const p of portfolios ?? []) {
    await supabaseAdmin.from("portfolio_items").delete().eq("portfolio_id", p.id);
  }
  await supabaseAdmin.from("portfolios").delete().eq("workspace_id", workspaceId);
  await supabaseAdmin.from("use_case_benefits").delete().eq("workspace_id", workspaceId);
  await supabaseAdmin.from("use_case_scores").delete().eq("workspace_id", workspaceId);
  await supabaseAdmin.from("ai_use_cases").delete().eq("workspace_id", workspaceId);
  await supabaseAdmin.from("use_case_boards").delete().eq("workspace_id", workspaceId);
  await supabaseAdmin.from("opportunities").delete().eq("workspace_id", workspaceId);
  await supabaseAdmin.from("generated_reports").delete().eq("workspace_id", workspaceId);
}

export interface ResetScenarioOptions {
  /** Restrict the reset to these `demo_scenario_key` values. Empty = all. */
  scenarioKeys?: string[];
}

/**
 * Idempotent reset of the labelled demo template workspaces.
 *
 * Scope is always a workspace resolved by `demo_scenario_key` and flagged
 * `is_demo_template`, so no tenant workspace can ever be touched.
 */
export async function resetDemoScenarioTemplates(options: ResetScenarioOptions = {}) {
  const ownerId = await resolveTemplateOwner();
  if (!ownerId) {
    return {
      resetAt: new Date().toISOString(),
      results: [],
      note: "demo personas not provisioned",
    };
  }

  const wanted = new Set((options.scenarioKeys ?? []).filter(Boolean));
  const scenarios = wanted.size ? DEMO_SCENARIOS.filter((s) => wanted.has(s.key)) : DEMO_SCENARIOS;
  if (!scenarios.length) throw new Error("No matching demonstration scenario.");

  const results: Array<{ key: string; label: string; status: string; useCases: number }> = [];

  for (const scenario of scenarios) {
    const orgId = await ensureDemoOrg(scenario);
    const workspaceId = await ensureTemplateWorkspace(scenario, orgId, ownerId);
    await purgeWorkspace(workspaceId);
    const seeded = await writeScenario(supabaseAdmin as unknown as Db, scenario, {
      userId: ownerId,
      orgId,
      workspaceId,
      asSample: false,
    });
    results.push({
      key: scenario.key,
      label: scenario.label,
      status: "reseeded",
      useCases: seeded.counts.useCases,
    });
  }

  return { resetAt: new Date().toISOString(), results };
}

/** Copy a scenario into the caller's own workspace as user-owned records. */
export async function copyScenarioForUser(db: Db, userId: string, scenarioKey: string) {
  const scenario = findScenario(scenarioKey);
  if (!scenario) throw new Error("Unknown demonstration scenario.");

  const { data: workspaceId, error: wsError } = await db.rpc("ensure_user_workspace");
  fail("resolve workspace", wsError);
  if (!workspaceId) throw new Error("Could not resolve your workspace.");

  const { data: workspace } = await db
    .from("workspaces")
    .select("organization_id")
    .eq("id", workspaceId)
    .maybeSingle();

  const written = await writeScenario(db, scenario, {
    userId,
    orgId: workspace?.organization_id ?? null,
    workspaceId: workspaceId as string,
    asSample: true,
  });

  const { error: lineageError } = await db.from("demo_sample_copies").insert({
    user_id: userId,
    workspace_id: workspaceId,
    organization_id: workspace?.organization_id ?? null,
    scenario_key: scenario.key,
    scenario_label: scenario.label,
    template_version: DEMO_TEMPLATE_VERSION,
    entity_counts: written.counts,
  });
  fail("record sample lineage", lineageError);

  return { scenarioKey: scenario.key, label: scenario.label, counts: written.counts };
}

/* ------------------------- reset control / audit -------------------------- */

const RESET_COOLDOWN_SECONDS = 60;

/**
 * Ad-hoc reset throttle. The backend has no shared rate-limiting primitive, so
 * this uses the durable `demo_reset_log` as the cooldown record — good enough
 * to stop repeated destructive re-seeds, not a general-purpose rate limiter.
 */
export async function assertResetAllowed(scope: string) {
  const since = new Date(Date.now() - RESET_COOLDOWN_SECONDS * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("demo_reset_log")
    .select("created_at")
    .eq("status", "ok")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) {
    const waited = Math.round((Date.now() - new Date(data.created_at).getTime()) / 1000);
    throw new Error(
      `A demo reset ran ${waited}s ago. Please wait ${RESET_COOLDOWN_SECONDS - waited}s (scope: ${scope}).`,
    );
  }
}

export async function logDemoReset(entry: {
  actorId?: string | null;
  actorLabel?: string | null;
  scope: string;
  scenarioKey?: string | null;
  status?: string;
  result?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("demo_reset_log").insert({
    actor_id: entry.actorId ?? null,
    actor_label: entry.actorLabel ?? null,
    scope: entry.scope,
    scenario_key: entry.scenarioKey ?? null,
    status: entry.status ?? "ok",
    result: (entry.result ?? {}) as never,
  });
}

/**
 * Delete the caller's own sample copies for the given scenarios.
 * Runs on the caller's RLS-scoped client and is filtered by both
 * `demo_template_key` and the caller's workspace — never other tenants.
 */
export async function deleteSampleCopiesForUser(db: Db, userId: string, scenarioKeys?: string[]) {
  const keys = scenarioKeys?.length ? scenarioKeys : DEMO_SCENARIOS.map((s) => s.key);

  const { data: workspaceId, error: wsError } = await db.rpc("ensure_user_workspace");
  fail("resolve workspace", wsError);
  if (!workspaceId) throw new Error("Could not resolve your workspace.");
  const ws = workspaceId as string;

  const { data: useCases } = await db
    .from("ai_use_cases")
    .select("id")
    .eq("workspace_id", ws)
    .in("demo_template_key", keys);
  const useCaseIds = (useCases ?? []).map((u: { id: string }) => u.id);

  const { data: portfolios } = await db
    .from("portfolios")
    .select("id")
    .eq("workspace_id", ws)
    .in("demo_template_key", keys);
  const portfolioIds = (portfolios ?? []).map((p: { id: string }) => p.id);

  for (const id of portfolioIds) {
    await db.from("portfolio_items").delete().eq("portfolio_id", id);
  }
  if (useCaseIds.length) {
    await db.from("use_case_benefits").delete().in("use_case_id", useCaseIds);
    await db.from("use_case_scores").delete().in("use_case_id", useCaseIds);
  }
  if (portfolioIds.length) await db.from("portfolios").delete().in("id", portfolioIds);
  if (useCaseIds.length) await db.from("ai_use_cases").delete().in("id", useCaseIds);
  await db.from("opportunities").delete().eq("workspace_id", ws).in("demo_template_key", keys);

  for (const key of keys) {
    await db
      .from("generated_reports")
      .delete()
      .eq("workspace_id", ws)
      .contains("payload", { demo_template_key: key });
  }

  const { data: removed } = await db
    .from("demo_sample_copies")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", ws)
    .in("scenario_key", keys)
    .select("id");

  return {
    scenarioKeys: keys,
    removed: {
      opportunities: 0,
      useCases: useCaseIds.length,
      portfolios: portfolioIds.length,
      lineageRecords: (removed ?? []).length,
    },
  };
}

export async function listDemoResetLog(db: Db, limit = 10) {
  const { data, error } = await db
    .from("demo_reset_log")
    .select("id, actor_label, scope, scenario_key, status, result, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
