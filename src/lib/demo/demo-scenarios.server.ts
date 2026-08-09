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

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DEMO_DISCLAIMER,
  DEMO_SCENARIOS,
  DEMO_TEMPLATE_VERSION,
  findScenario,
  sampleName,
  scoreTotal,
  type DemoScenario,
} from "./demo-scenarios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

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

/**
 * Writes one complete scenario (board → opportunities → use cases → scores →
 * benefits → portfolio → roadmap items → report) into a workspace.
 *
 * Works for both the demo template workspaces (service-role client) and a
 * user's own workspace (RLS-scoped client), because the shape is identical.
 */
export async function writeScenario(
  db: Db,
  scenario: DemoScenario,
  target: { userId: string; orgId: string | null; workspaceId: string; asSample: boolean },
) {
  const { userId, orgId, workspaceId, asSample } = target;
  const name = (value: string) => (asSample ? sampleName(value) : value);

  const { data: board, error: boardError } = await db
    .from("use_case_boards")
    .insert({
      workspace_id: workspaceId,
      organization_id: orgId,
      title: name(scenario.board),
      description: DEMO_DISCLAIMER,
      board_type: asSample ? "sample" : "demo_template",
      created_by: userId,
    })
    .select("id")
    .single();
  fail("create board", boardError);

  for (const opp of scenario.opportunities) {
    const { error } = await db.from("opportunities").insert({
      workspace_id: workspaceId,
      organization_id: orgId,
      created_by: userId,
      owner_user_id: userId,
      title: name(opp.title),
      pain_point: opp.pain_point,
      desired_outcome: opp.desired_outcome,
      business_function: opp.business_function,
      strategic_objective: opp.strategic_objective,
      urgency: opp.urgency,
      status: opp.status,
      source: "workshop",
      demo_template_key: scenario.key,
      evidence: [{ note: DEMO_DISCLAIMER }],
    });
    fail("insert opportunity", error);
  }

  const created: Array<{ id: string; title: string; decision: string }> = [];

  for (const [index, uc] of scenario.useCases.entries()) {
    const { data: row, error } = await db
      .from("ai_use_cases")
      .insert({
        board_id: board!.id,
        workspace_id: workspaceId,
        organization_id: orgId,
        title: name(uc.title),
        problem_statement: uc.problem_statement,
        ai_type: uc.ai_type,
        status: uc.status,
        position: index,
        created_by: userId,
        owner_user_id: userId,
        priority_score: scoreTotal(uc.score),
        demo_template_key: scenario.key,
      })
      .select("id")
      .single();
    fail("insert use case", error);

    fail(
      "insert score",
      (
        await db.from("use_case_scores").insert({
          user_id: userId,
          use_case_id: row!.id,
          workspace_id: workspaceId,
          organization_id: orgId,
          value: uc.score.value,
          feasibility: uc.score.feasibility,
          readiness: uc.score.readiness,
          risk: uc.score.risk,
          strategic: uc.score.strategic,
          ttv: uc.score.ttv,
          total: Math.round(scoreTotal(uc.score)),
        })
      ).error,
    );

    for (const benefit of uc.benefits) {
      const { error: benefitError } = await db.from("use_case_benefits").insert({
        use_case_id: row!.id,
        workspace_id: workspaceId,
        organization_id: orgId,
        created_by: userId,
        name: benefit.name,
        kpi: benefit.kpi,
        category: benefit.category,
        unit_type: benefit.unit_type,
        currency: benefit.currency,
        period: benefit.period,
        baseline_value: benefit.baseline_value,
        target_value: benefit.target_value,
        expected_value: benefit.expected_value,
        confidence: benefit.confidence,
        benefit_owner: benefit.benefit_owner,
        measurement_frequency: benefit.measurement_frequency,
        evidence_source: benefit.evidence_source,
        state: benefit.state,
        verification_method: "manual",
        notes: DEMO_DISCLAIMER,
      });
      fail("insert benefit", benefitError);
    }

    created.push({ id: row!.id, title: uc.title, decision: uc.portfolio.decision });
  }

  const { data: portfolio, error: portfolioError } = await db
    .from("portfolios")
    .insert({
      user_id: userId,
      organization_id: orgId,
      workspace_id: workspaceId,
      name: name(scenario.portfolio.name),
      objective: scenario.portfolio.objective,
      portfolio_type: "Custom Portfolio",
      status: "Active",
      visibility: "workspace",
      target_quarter: scenario.portfolio.targetQuarter,
      demo_template_key: scenario.key,
    })
    .select("id")
    .single();
  fail("create portfolio", portfolioError);

  for (const [index, uc] of scenario.useCases.entries()) {
    const { error } = await db.from("portfolio_items").insert({
      portfolio_id: portfolio!.id,
      use_case_id: created[index]!.id,
      rank: index + 1,
      added_by: userId,
      decision: uc.portfolio.decision,
      funding_state: uc.portfolio.funding_state,
      delivery_stage: uc.portfolio.delivery_stage,
      target_period: uc.portfolio.target_period,
      milestone: uc.portfolio.milestone,
      planned_start_date: uc.portfolio.planned_start_date,
      planned_end_date: uc.portfolio.planned_end_date,
      delivery_owner: uc.portfolio.delivery_owner,
      notes: DEMO_DISCLAIMER,
    });
    fail("insert portfolio item", error);
  }

  const { error: reportError } = await db.from("generated_reports").insert({
    user_id: userId,
    organization_id: orgId,
    workspace_id: workspaceId,
    title: name(scenario.report.title),
    kind: scenario.report.kind,
    use_case_count: created.length,
    payload: {
      demo: true,
      demo_template_key: scenario.key,
      template_version: DEMO_TEMPLATE_VERSION,
      disclaimer: DEMO_DISCLAIMER,
      portfolio: scenario.portfolio.name,
      sections: ["Portfolio overview", "Prioritised use cases", "Value summary", "Next actions"],
      use_cases: created.map((u) => ({ title: u.title, decision: u.decision })),
    },
  });
  fail("insert report", reportError);

  return {
    boardId: board!.id,
    portfolioId: portfolio!.id,
    counts: {
      opportunities: scenario.opportunities.length,
      useCases: created.length,
      benefits: scenario.useCases.reduce((sum, uc) => sum + uc.benefits.length, 0),
      portfolioItems: created.length,
      reports: 1,
    },
  };
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
