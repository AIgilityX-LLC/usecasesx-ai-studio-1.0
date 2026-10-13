/**
 * Demo personas for client demonstrations.
 *
 * Creates (idempotently) the demo personas shown on /demo-login, each with
 * its own named organization + default workspace, plan entitlement and role,
 * plus a small end-to-end content set (opportunities → use cases → portfolio →
 * report) for the Pro and Enterprise personas.
 *
 * These accounts are demonstration-only and hold no production data.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *   bun run scripts/seed/demo-personas.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

/** Shared demonstration password. Required; never hardcoded. */
const PASSWORD = process.env.DEMO_PERSONA_PASSWORD;
if (!PASSWORD || PASSWORD.length < 14)
  throw new Error("Set DEMO_PERSONA_PASSWORD (min 14 chars) before seeding demo personas.");
/** Privileged personas (admin/super_admin) never share the demo password. */
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD;
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 14 || ADMIN_PASSWORD === PASSWORD)
  throw new Error("Set DEMO_ADMIN_PASSWORD (min 14 chars, distinct from DEMO_PERSONA_PASSWORD).");
const passwordFor = (persona) =>
  persona.role === "super_admin" || persona.role === "admin" ? ADMIN_PASSWORD : PASSWORD;

const PERSONAS = [
  {
    email: "superadmin@demo.usecasex.app",
    label: "Platform SuperAdmin",
    role: "super_admin",
    plan: "enterprise",
    org: "UseCasesX Demo Platform",
    workspace: "Platform Oversight",
  },
  {
    email: "tenantadmin@demo.usecasex.app",
    label: "Tenant Admin",
    role: "admin",
    plan: "enterprise",
    org: "Northwind Group (Demo Tenant)",
    workspace: "Tenant Administration",
  },
  {
    email: "pro@demo.usecasex.app",
    label: "Pro User",
    role: null,
    plan: "pro",
    org: "Meridian Retail (Pro Demo)",
    workspace: "Pro Demo Workspace",
    content: "pro",
  },
  {
    email: "enterprise@demo.usecasex.app",
    label: "Enterprise User",
    role: null,
    plan: "enterprise",
    org: "Atlas Energy (Enterprise Demo)",
    workspace: "Enterprise Demo Workspace",
    content: "enterprise",
  },
  {
    email: "facilitator@demo.usecasex.app",
    label: "Facilitator / Trainer",
    role: null,
    plan: "pro",
    org: "Workshop Academy (Demo)",
    workspace: "Workshop Demo Workspace",
  },
  {
    email: "participant1@demo.usecasex.app",
    label: "Participant One",
    role: null,
    plan: "pro",
  },
  {
    email: "participant2@demo.usecasex.app",
    label: "Participant Two",
    role: null,
    plan: "pro",
  },
];

/** Demo content per edition. Kept deliberately small and obviously fictional. */
const CONTENT = {
  pro: {
    board: "Pro Demo Board",
    portfolio: "FY26 Retail AI Portfolio",
    objective: "Prove the discovery → portfolio → report journey on a Pro seat.",
    opportunities: [
      {
        title: "Store replenishment forecasting",
        pain_point: "Manual weekly replenishment causes stock-outs on fast movers.",
        desired_outcome: "Forecast-driven replenishment with 20% fewer stock-outs.",
        urgency: "now",
        status: "qualified",
      },
      {
        title: "Customer service triage assistant",
        pain_point: "Agents re-read long email threads before every reply.",
        desired_outcome: "Summarised threads with a suggested next action.",
        urgency: "next",
        status: "opportunity",
      },
    ],
    useCases: [
      {
        title: "Demand forecasting for store replenishment",
        problem_statement: "Weekly replenishment is manual and reactive.",
        ai_type: "Predictive analytics",
        status: "designed",
        decision: "approved",
        delivery_stage: "now",
      },
      {
        title: "Service inbox summarisation",
        problem_statement: "Agents spend 6 minutes per ticket on context gathering.",
        ai_type: "Generative AI",
        status: "idea",
        decision: "shortlisted",
        delivery_stage: "next",
      },
    ],
    report: {
      title: "Pro demo — executive portfolio summary",
      kind: "portfolio_summary",
    },
  },
  enterprise: {
    board: "Enterprise Demo Board",
    portfolio: "Group AI Investment Portfolio",
    objective: "Show governed, ERP-verified value across an enterprise tenant.",
    opportunities: [
      {
        title: "Predictive maintenance for turbine fleet",
        pain_point: "Unplanned outages drive high emergency maintenance cost.",
        desired_outcome: "Failure prediction 14 days ahead with verified savings.",
        urgency: "now",
        status: "converted",
      },
      {
        title: "Regulatory reporting assistant",
        pain_point: "Quarterly regulatory packs take three weeks to assemble.",
        desired_outcome: "Assisted drafting with full provenance and sign-off.",
        urgency: "next",
        status: "qualified",
      },
    ],
    useCases: [
      {
        title: "Turbine failure prediction",
        problem_statement: "Unplanned turbine outages cost the fleet materially each quarter.",
        ai_type: "Predictive analytics",
        status: "in_delivery",
        decision: "approved",
        delivery_stage: "now",
      },
      {
        title: "Regulatory pack drafting assistant",
        problem_statement: "Manual assembly of regulatory packs is slow and error-prone.",
        ai_type: "Generative AI",
        status: "designed",
        decision: "shortlisted",
        delivery_stage: "next",
      },
    ],
    report: {
      title: "Enterprise demo — governed value & assurance summary",
      kind: "portfolio_summary",
    },
  },
};

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 500,
});
if (listErr) throw listErr;

const idByEmail = new Map();
const tenantByEmail = new Map();

for (const persona of PERSONAS) {
  const existing = listed.users.find((u) => u.email?.toLowerCase() === persona.email);
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: persona.email,
      password: passwordFor(persona),
      email_confirm: true,
      user_metadata: { full_name: persona.label },
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: passwordFor(persona),
    });
    if (error) throw error;
  }
  idByEmail.set(persona.email, userId);

  const { error: wsErr } = await admin.rpc("ensure_user_workspace", { _user_id: userId });
  if (wsErr) throw wsErr;

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      full_name: persona.label,
      email: persona.email,
      plan_type: persona.plan,
      entitlement_tier: persona.plan,
      entitlement_expires_at: null,
      profile_completed: true,
    })
    .eq("user_id", userId);
  if (profErr) throw profErr;

  if (persona.role) {
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: persona.role }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;
  }

  // --- tenant setup: named organization + default workspace + entitlement ---
  const { data: prof } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  const orgId = prof?.organization_id;
  if (!orgId) throw new Error(`No organization provisioned for ${persona.email}`);

  if (persona.org) {
    await admin
      .from("organizations")
      .update({ name: persona.org, plan: persona.plan })
      .eq("id", orgId);
  } else {
    await admin.from("organizations").update({ plan: persona.plan }).eq("id", orgId);
  }

  const { data: ws } = await admin
    .from("workspaces")
    .select("id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const workspaceId = ws?.id;
  if (!workspaceId) throw new Error(`No workspace provisioned for ${persona.email}`);

  if (persona.workspace) {
    await admin.from("workspaces").update({ name: persona.workspace }).eq("id", workspaceId);
  }

  await admin
    .from("organization_members")
    .upsert(
      { organization_id: orgId, user_id: userId, role: "owner", status: "active" },
      { onConflict: "organization_id,user_id" },
    );
  await admin
    .from("workspace_members")
    .upsert(
      { workspace_id: workspaceId, user_id: userId, role: "owner" },
      { onConflict: "workspace_id,user_id" },
    );

  // Entitlement row must match the persona plan (ensure_user_workspace seeds 'lite').
  const { data: ents } = await admin
    .from("entitlements")
    .select("id, plan_code")
    .eq("organization_id", orgId);
  const match = (ents ?? []).find((e) => e.plan_code === persona.plan);
  if (match) {
    await admin
      .from("entitlements")
      .update({ revoked_at: null, expires_at: null, source: "demo_seed" })
      .eq("id", match.id);
  } else {
    await admin
      .from("entitlements")
      .insert({ organization_id: orgId, plan_code: persona.plan, source: "demo_seed" });
  }
  for (const e of ents ?? []) {
    if (e.plan_code !== persona.plan) {
      await admin
        .from("entitlements")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", e.id);
    }
  }

  tenantByEmail.set(persona.email, { userId, orgId, workspaceId });
  console.log(`ready  ${persona.email.padEnd(36)} ${persona.label} [${persona.plan}]`);
}

/* ------------------------------------------------------------------ *
 * Demo content for the Pro and Enterprise personas
 * ------------------------------------------------------------------ */
async function seedContent(persona) {
  const spec = CONTENT[persona.content];
  if (!spec) return;
  const { userId, orgId, workspaceId } = tenantByEmail.get(persona.email);

  // Board
  let { data: board } = await admin
    .from("use_case_boards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("title", spec.board)
    .maybeSingle();
  if (!board) {
    const { data, error } = await admin
      .from("use_case_boards")
      .insert({
        workspace_id: workspaceId,
        organization_id: orgId,
        title: spec.board,
        description: "Demonstration board — fictional content.",
        board_type: "demo",
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    board = data;
  }

  // Opportunities
  for (const opp of spec.opportunities) {
    const { data: existing } = await admin
      .from("opportunities")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("title", opp.title)
      .maybeSingle();
    if (existing) continue;
    const { error } = await admin.from("opportunities").insert({
      ...opp,
      workspace_id: workspaceId,
      organization_id: orgId,
      created_by: userId,
      owner_user_id: userId,
      owner_name: persona.label,
      source: "workshop",
    });
    if (error) throw error;
  }

  // Use cases
  const useCaseIds = [];
  for (const [index, uc] of spec.useCases.entries()) {
    let { data: existing } = await admin
      .from("ai_use_cases")
      .select("id")
      .eq("board_id", board.id)
      .eq("title", uc.title)
      .maybeSingle();
    if (!existing) {
      const { data, error } = await admin
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
        })
        .select("id")
        .single();
      if (error) throw error;
      existing = data;
    }
    useCaseIds.push({ id: existing.id, ...uc });
  }

  // Portfolio + items
  let { data: portfolio } = await admin
    .from("portfolios")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", spec.portfolio)
    .maybeSingle();
  if (!portfolio) {
    const { data, error } = await admin
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
    if (error) throw error;
    portfolio = data;
  }

  for (const [index, uc] of useCaseIds.entries()) {
    const { error } = await admin.from("portfolio_items").upsert(
      {
        portfolio_id: portfolio.id,
        use_case_id: uc.id,
        rank: index + 1,
        decision: uc.decision,
        delivery_stage: uc.delivery_stage,
        funding_state: uc.decision === "approved" ? "funded" : "requested",
        added_by: userId,
      },
      { onConflict: "portfolio_id,use_case_id" },
    );
    if (error) throw error;
  }

  // One sample report / export artefact
  const { data: report } = await admin
    .from("generated_reports")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("title", spec.report.title)
    .maybeSingle();
  if (!report) {
    const { error } = await admin.from("generated_reports").insert({
      user_id: userId,
      organization_id: orgId,
      workspace_id: workspaceId,
      title: spec.report.title,
      kind: spec.report.kind,
      use_case_count: useCaseIds.length,
      payload: {
        demo: true,
        portfolio: spec.portfolio,
        generated_for: persona.label,
        sections: ["Portfolio overview", "Prioritised use cases", "Value summary", "Next actions"],
        use_cases: useCaseIds.map((u) => ({ title: u.title, decision: u.decision })),
      },
    });
    if (error) throw error;
  }

  // Export audit event so the export receipt/audit timeline is populated.
  const { data: auditExisting } = await admin
    .from("audit_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("event_type", "report.exported")
    .limit(1)
    .maybeSingle();
  if (!auditExisting) {
    await admin.from("audit_events").insert({
      actor_id: userId,
      entity_type: "report",
      entity_id: portfolio.id,
      event_type: "report.exported",
      organization_id: orgId,
      workspace_id: workspaceId,
      new_value: { format: "pdf", title: spec.report.title, demo: true },
    });
  }

  console.log(`seeded ${persona.email.padEnd(36)} ${spec.portfolio}`);
}

for (const persona of PERSONAS) {
  if (persona.content) await seedContent(persona);
}

/* Facilitator + participants share one demo workspace so a full workshop
   journey (invite → submit → vote → convert) can be shown end to end. */
const facilitator = tenantByEmail.get("facilitator@demo.usecasex.app");
if (facilitator) {
  for (const email of ["participant1@demo.usecasex.app", "participant2@demo.usecasex.app"]) {
    const uid = idByEmail.get(email);
    if (!uid) continue;
    await admin.from("profiles").update({ organization_id: facilitator.orgId }).eq("user_id", uid);
    await admin
      .from("organization_members")
      .upsert(
        { organization_id: facilitator.orgId, user_id: uid, role: "member", status: "active" },
        { onConflict: "organization_id,user_id" },
      );
    await admin
      .from("workspace_members")
      .upsert(
        { workspace_id: facilitator.workspaceId, user_id: uid, role: "member" },
        { onConflict: "workspace_id,user_id" },
      );
    console.log(`joined ${email.padEnd(36)} workshop demo workspace`);
  }
}

console.log(`\n${PERSONAS.length} demo personas ready.`);
