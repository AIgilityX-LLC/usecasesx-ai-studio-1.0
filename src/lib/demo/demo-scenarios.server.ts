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

/** Idempotent reset of every labelled demo template workspace. */
export async function resetDemoScenarioTemplates() {
  const ownerId = await resolveTemplateOwner();
  if (!ownerId) {
    return { resetAt: new Date().toISOString(), results: [], note: "demo personas not provisioned" };
  }

  const results: Array<{ key: string; label: string; status: string; useCases: number }> = [];

  for (const scenario of DEMO_SCENARIOS) {
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
