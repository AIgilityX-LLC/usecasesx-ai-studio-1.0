/**
 * Scenario writer — client-agnostic.
 *
 * Takes any Supabase client (service-role for demo templates, RLS-scoped for a
 * user's own sample copy) and writes one complete scenario journey.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_DISCLAIMER,
  DEMO_TEMPLATE_VERSION,
  sampleName,
  scoreTotal,
  type DemoScenario,
} from "./demo-scenarios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = SupabaseClient<any, any, any>;

function fail(context: string, error: { message?: string } | null | undefined) {
  if (error) throw new Error(`${context}: ${error.message ?? "unknown error"}`);
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
