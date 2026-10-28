/**
 * Demo tenant reset/re-seed. Server-only: touches demonstration workspaces
 * with the service-role client and never production tenant data.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import {
  DEMO_CONTENT,
  DEMO_EDITION_EMAIL,
  type DemoEdition,
  type DemoContentSpec,
} from "./demo-content";

export { demoResetAuthorized } from "./demo-auth";

type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"];
type UseCaseInsert = Database["public"]["Tables"]["ai_use_cases"]["Insert"];

function fail(context: string, error: { message?: string } | null) {
  if (error) throw new Error(`${context}: ${error.message ?? "unknown error"}`);
}

interface Tenant {
  userId: string;
  orgId: string;
  workspaceId: string;
  label: string;
}

async function resolveTenant(edition: DemoEdition): Promise<Tenant | null> {
  const email = DEMO_EDITION_EMAIL[edition];
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name, organization_id")
    .eq("email", email)
    .maybeSingle();
  if (!profile?.organization_id) return null;

  const { data: workspace } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!workspace) return null;

  return {
    userId: profile.user_id,
    orgId: profile.organization_id,
    workspaceId: workspace.id,
    label: profile.full_name ?? email,
  };
}

async function purge(tenant: Tenant) {
  const ws = tenant.workspaceId;

  const { data: portfolios } = await supabaseAdmin
    .from("portfolios")
    .select("id")
    .eq("workspace_id", ws);
  for (const p of portfolios ?? []) {
    await supabaseAdmin.from("portfolio_items").delete().eq("portfolio_id", p.id);
  }
  fail(
    "delete portfolios",
    (await supabaseAdmin.from("portfolios").delete().eq("workspace_id", ws)).error,
  );
  fail(
    "delete use cases",
    (await supabaseAdmin.from("ai_use_cases").delete().eq("workspace_id", ws)).error,
  );
  fail(
    "delete boards",
    (await supabaseAdmin.from("use_case_boards").delete().eq("workspace_id", ws)).error,
  );
  fail(
    "delete opportunities",
    (await supabaseAdmin.from("opportunities").delete().eq("workspace_id", ws)).error,
  );
  fail(
    "delete reports",
    (await supabaseAdmin.from("generated_reports").delete().eq("workspace_id", ws)).error,
  );
  await supabaseAdmin
    .from("audit_events")
    .delete()
    .eq("workspace_id", ws)
    .eq("event_type", "report.exported");
}

async function seed(tenant: Tenant, spec: DemoContentSpec) {
  const { userId, orgId, workspaceId } = tenant;

  const { data: board, error: boardError } = await supabaseAdmin
    .from("use_case_boards")
    .insert({
      workspace_id: workspaceId,
      organization_id: orgId,
      title: spec.board,
      description: "Demonstration board — fictional content.",
      board_type: "demo",
      status: "active",
      created_by: userId,
    })
    .select("id")
    .single();
  fail("create board", boardError);
  if (!board) throw new Error("create board: no row returned");

  for (const opp of spec.opportunities) {
    const { error } = await supabaseAdmin.from("opportunities").insert({
      ...opp,
      workspace_id: workspaceId,
      organization_id: orgId,
      created_by: userId,
      owner_user_id: userId,
      owner_name: tenant.label,
      source: "workshop",
    } as unknown as OpportunityInsert);
    fail("insert opportunity", error);
  }

  const useCases: Array<{ id: string; decision: string; delivery_stage: string; title: string }> =
    [];
  for (const [index, uc] of spec.useCases.entries()) {
    const { data, error } = await supabaseAdmin
      .from("ai_use_cases")
      .insert({
        board_id: board.id,
        workspace_id: workspaceId,
        organization_id: orgId,
        title: uc.title,
        problem_statement: uc.problem_statement,
        ai_type: uc.ai_type,
        status: uc.status,
        position: index,
        created_by: userId,
        owner_user_id: userId,
      } as unknown as UseCaseInsert)
      .select("id")
      .single();
    fail("insert use case", error);
    if (!data) throw new Error("insert use case: no row returned");
    useCases.push({
      id: data.id,
      decision: uc.decision,
      delivery_stage: uc.delivery_stage,
      title: uc.title,
    });
  }

  const { data: portfolio, error: portfolioError } = await supabaseAdmin
    .from("portfolios")
    .insert({
      user_id: userId,
      organization_id: orgId,
      workspace_id: workspaceId,
      name: spec.portfolio,
      objective: spec.objective,
      portfolio_type: "Custom Portfolio",
      status: "Active",
      visibility: "workspace",
    })
    .select("id")
    .single();
  fail("create portfolio", portfolioError);
  if (!portfolio) throw new Error("create portfolio: no row returned");

  for (const [index, uc] of useCases.entries()) {
    const { error } = await supabaseAdmin.from("portfolio_items").insert({
      portfolio_id: portfolio.id,
      use_case_id: uc.id,
      rank: index + 1,
      decision: uc.decision,
      delivery_stage: uc.delivery_stage,
      funding_state: uc.decision === "approved" ? "funded" : "requested",
      added_by: userId,
    });
    fail("insert portfolio item", error);
  }

  const { error: reportError } = await supabaseAdmin.from("generated_reports").insert({
    user_id: userId,
    organization_id: orgId,
    workspace_id: workspaceId,
    title: spec.report.title,
    kind: spec.report.kind,
    use_case_count: useCases.length,
    payload: {
      demo: true,
      portfolio: spec.portfolio,
      generated_for: tenant.label,
      sections: ["Portfolio overview", "Prioritised use cases", "Value summary", "Next actions"],
      use_cases: useCases.map((u) => ({ title: u.title, decision: u.decision })),
    },
  });
  fail("insert report", reportError);

  await supabaseAdmin.from("audit_events").insert({
    actor_id: userId,
    entity_type: "report",
    entity_id: portfolio.id,
    event_type: "report.exported",
    organization_id: orgId,
    workspace_id: workspaceId,
    new_value: { format: "pdf", title: spec.report.title, demo: true },
  });

  return { portfolioId: portfolio.id, useCases: useCases.length };
}

export async function resetDemoTenants() {
  const results: Array<{ edition: DemoEdition; status: string; useCases?: number }> = [];

  for (const edition of ["pro", "enterprise"] as DemoEdition[]) {
    const tenant = await resolveTenant(edition);
    if (!tenant) {
      results.push({ edition, status: "not_provisioned" });
      continue;
    }
    await purge(tenant);
    const seeded = await seed(tenant, DEMO_CONTENT[edition]);
    results.push({ edition, status: "reseeded", useCases: seeded.useCases });
  }

  return { resetAt: new Date().toISOString(), results };
}

export interface DemoArtifact {
  edition: DemoEdition;
  reportTitle: string;
  portfolio: string;
  generatedAt: string | null;
  auditEventId: string | null;
  useCases: Array<{ title: string; decision: string }>;
}

export async function listDemoArtifacts(): Promise<DemoArtifact[]> {
  const artifacts: DemoArtifact[] = [];

  for (const edition of ["pro", "enterprise"] as DemoEdition[]) {
    const tenant = await resolveTenant(edition);
    if (!tenant) continue;
    const spec = DEMO_CONTENT[edition];

    const { data: report } = await supabaseAdmin
      .from("generated_reports")
      .select("title, created_at, payload")
      .eq("workspace_id", tenant.workspaceId)
      .eq("title", spec.report.title)
      .maybeSingle();
    if (!report) continue;

    const { data: audit } = await supabaseAdmin
      .from("audit_events")
      .select("id")
      .eq("workspace_id", tenant.workspaceId)
      .eq("event_type", "report.exported")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = (report.payload ?? {}) as {
      use_cases?: Array<{ title: string; decision: string }>;
    };

    artifacts.push({
      edition,
      reportTitle: report.title,
      portfolio: spec.portfolio,
      generatedAt: report.created_at ?? null,
      auditEventId: audit?.id ?? null,
      useCases: payload.use_cases ?? [],
    });
  }

  return artifacts;
}
