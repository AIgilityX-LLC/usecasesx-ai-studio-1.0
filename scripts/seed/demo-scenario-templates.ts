/**
 * Seeds/resets the labelled demonstration template workspaces.
 * Run with: bun scripts/seed/demo-scenario-templates.ts
 *
 * Uses the service-role key from the environment; nothing here ships to the browser.
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_DISCLAIMER, DEMO_SCENARIOS } from "../../src/lib/demo/demo-scenarios";
import { writeScenario, type Db } from "../../src/lib/demo/demo-scenarios.write";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } }) as unknown as Db;

async function ownerId(): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", "superadmin@demo.usecasex.app")
    .maybeSingle();
  if (data?.user_id) return data.user_id;
  const { data: fallback } = await admin
    .from("profiles")
    .select("user_id")
    .like("email", "%@demo.usecasex.app")
    .limit(1)
    .maybeSingle();
  if (!fallback?.user_id) throw new Error("No demo persona profile found — seed demo accounts first.");
  return fallback.user_id;
}

async function purge(workspaceId: string) {
  const { data: portfolios } = await admin
    .from("portfolios")
    .select("id")
    .eq("workspace_id", workspaceId);
  for (const p of portfolios ?? []) {
    await admin.from("portfolio_items").delete().eq("portfolio_id", p.id);
  }
  for (const table of [
    "portfolios",
    "use_case_benefits",
    "use_case_scores",
    "ai_use_cases",
    "use_case_boards",
    "opportunities",
    "generated_reports",
  ]) {
    await admin.from(table).delete().eq("workspace_id", workspaceId);
  }
}

async function main() {
  const owner = await ownerId();

  for (const scenario of DEMO_SCENARIOS) {
    let orgId: string;
    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("name", scenario.organization.name)
      .maybeSingle();
    if (org?.id) {
      orgId = org.id;
      await admin.from("organizations").update({ is_demo: true }).eq("id", orgId);
    } else {
      const { data, error } = await admin
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
      if (error) throw new Error(`create org: ${error.message}`);
      orgId = data.id;
    }

    let workspaceId: string;
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .eq("demo_scenario_key", scenario.key)
      .maybeSingle();
    if (ws?.id) {
      workspaceId = ws.id;
    } else {
      const { data, error } = await admin
        .from("workspaces")
        .insert({
          organization_id: orgId,
          name: scenario.workspace,
          description: `${scenario.summary} ${DEMO_DISCLAIMER}`,
          workspace_type: "demo_template",
          created_by: owner,
          is_demo: true,
          is_demo_template: true,
          demo_scenario_key: scenario.key,
        })
        .select("id")
        .single();
      if (error) throw new Error(`create workspace: ${error.message}`);
      workspaceId = data.id;
      await admin
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: owner, role: "owner" });
    }

    await purge(workspaceId);
    const written = await writeScenario(admin, scenario, {
      userId: owner,
      orgId,
      workspaceId,
      asSample: false,
    });
    console.log(`seeded ${scenario.key}:`, written.counts);
  }
}

void main();
