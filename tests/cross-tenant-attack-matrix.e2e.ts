/**
 * Phase 3 — OWASP-style cross-tenant attack matrix.
 *
 * Tenant A seeds resources; Tenant B (valid session) attempts IDOR-style
 * reads/writes by primary key and by forged workspace_id. All must fail.
 *
 * Covers: project/board, use case, KPI (benefit), attachment (evidence_items),
 * portfolio, report (generated_reports when present).
 *
 * Run: bun run test:cross-tenant
 * Requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, two demo accounts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const emailA = process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app";
const emailB = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";

let failures = 0;
const pass = (msg: string) => console.log(`✓ ${msg}`);
const fail = (msg: string) => {
  failures += 1;
  console.error(`✗ ${msg}`);
};

function assertDenied(label: string, result: { data: unknown; error: unknown }) {
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  if (result.error || rows.length === 0) pass(label);
  else fail(`${label} — leaked ${rows.length} row(s)`);
}

function assertWriteDenied(label: string, result: { data: unknown; error: unknown }) {
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  if (result.error || rows.length === 0) pass(label);
  else fail(`${label} — write succeeded`);
}

type Tenant = {
  client: SupabaseClient<any, any, any>;
  userId: string;
  workspaceId: string;
  orgId: string;
};

async function signIn(email: string): Promise<Tenant> {
  const client = createClient<any, any, any>(url!, anonKey!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`);
  const { data: workspaceId, error: wsErr } = await client.rpc("ensure_user_workspace");
  if (wsErr) throw wsErr;
  const { data: ws, error: readErr } = await client
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId as string)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!ws) throw new Error(`workspace not resolvable for ${email}`);
  return {
    client,
    userId: data.user.id,
    workspaceId: ws.id as string,
    orgId: ws.organization_id as string,
  };
}

async function main() {
  const stamp = Date.now();
  const a = await signIn(emailA);
  const b = await signIn(emailB);
  if (a.userId === b.userId || a.workspaceId === b.workspaceId) {
    throw new Error("Misconfigured demo tenants — need two distinct workspaces");
  }
  pass("Tenant A and Tenant B are distinct");

  // ---- A seeds: board/project, use case, benefit (KPI), evidence (attachment), portfolio, report
  const { data: boardA, error: boardErr } = await a.client
    .from("use_case_boards")
    .insert({
      title: `Attack matrix board ${stamp}`,
      workspace_id: a.workspaceId,
      created_by: a.userId,
    })
    .select("id")
    .single();
  if (boardErr || !boardA) throw boardErr ?? new Error("A could not create board/project");

  const { data: useCaseA, error: ucErr } = await a.client
    .from("ai_use_cases")
    .insert({
      title: `Attack matrix use case ${stamp}`,
      board_id: boardA.id,
      created_by: a.userId,
      workspace_id: a.workspaceId,
    })
    .select("id")
    .single();
  if (ucErr || !useCaseA) throw ucErr ?? new Error("A could not create use case");

  const { data: portfolioA, error: pErr } = await a.client
    .from("portfolios")
    .insert({
      name: `Attack matrix portfolio ${stamp}`,
      user_id: a.userId,
      workspace_id: a.workspaceId,
      visibility: "private",
      portfolio_type: "standard",
      status: "draft",
    })
    .select("id")
    .single();
  if (pErr || !portfolioA) throw pErr ?? new Error("A could not create portfolio");

  // KPI proxy: use_case_benefits (measurable KPI rows) when table exists
  let benefitId: string | null = null;
  {
    const inserted = await a.client
      .from("use_case_benefits")
      .insert({
        use_case_id: useCaseA.id,
        workspace_id: a.workspaceId,
        title: `KPI ${stamp}`,
        created_by: a.userId,
      })
      .select("id")
      .maybeSingle();
    if (!inserted.error && inserted.data?.id) {
      benefitId = inserted.data.id as string;
      pass("A seeded KPI/benefit row");
    } else {
      console.warn(
        `skip KPI seed (${inserted.error?.message ?? "no row"}) — matrix still checks deny paths if id known`,
      );
    }
  }

  // Attachment: evidence_items
  let evidenceId: string | null = null;
  {
    const inserted = await a.client
      .from("evidence_items")
      .insert({
        workspace_id: a.workspaceId,
        organization_id: a.orgId,
        subject_type: "use_case",
        subject_id: useCaseA.id,
        kind: "note",
        label: `Attachment ${stamp}`,
        note: "cross-tenant probe",
        created_by: a.userId,
        owner_user_id: a.userId,
      })
      .select("id")
      .maybeSingle();
    if (!inserted.error && inserted.data?.id) {
      evidenceId = inserted.data.id as string;
      pass("A seeded evidence/attachment row");
    } else {
      console.warn(`skip evidence seed (${inserted.error?.message ?? "no row"})`);
    }
  }

  // Report
  let reportId: string | null = null;
  {
    const inserted = await a.client
      .from("generated_reports")
      .insert({
        workspace_id: a.workspaceId,
        created_by: a.userId,
        title: `Attack matrix report ${stamp}`,
        report_type: "portfolio",
      })
      .select("id")
      .maybeSingle();
    if (!inserted.error && inserted.data?.id) {
      reportId = inserted.data.id as string;
      pass("A seeded generated_reports row");
    } else {
      console.warn(`skip report seed (${inserted.error?.message ?? "no row"})`);
    }
  }

  // ---- Named attack matrix (B → A's resources)
  assertDenied(
    "Tenant A → Tenant B project (board) READ must fail for B",
    await b.client.from("use_case_boards").select("id").eq("id", boardA.id),
  );
  assertDenied(
    "Tenant A → Tenant B use case READ must fail for B",
    await b.client.from("ai_use_cases").select("id").eq("id", useCaseA.id),
  );
  assertDenied(
    "Tenant A → Tenant B portfolio READ must fail for B",
    await b.client.from("portfolios").select("id").eq("id", portfolioA.id),
  );

  if (benefitId) {
    assertDenied(
      "Tenant A → Tenant B KPI READ must fail for B",
      await b.client.from("use_case_benefits").select("id").eq("id", benefitId),
    );
  }

  if (evidenceId) {
    assertDenied(
      "Tenant A → Tenant B attachment READ must fail for B",
      await b.client.from("evidence_items").select("id").eq("id", evidenceId),
    );
  }

  if (reportId) {
    assertDenied(
      "Tenant A → Tenant B report READ must fail for B",
      await b.client.from("generated_reports").select("id").eq("id", reportId),
    );
  }

  // Forged workspace_id writes
  assertWriteDenied(
    "B cannot insert use case into A's workspace via forged workspace_id",
    await b.client
      .from("ai_use_cases")
      .insert({
        title: `Forged ${stamp}`,
        board_id: boardA.id,
        created_by: b.userId,
        workspace_id: a.workspaceId,
      })
      .select("id"),
  );
  assertWriteDenied(
    "B cannot insert evidence into A's workspace",
    await b.client
      .from("evidence_items")
      .insert({
        workspace_id: a.workspaceId,
        organization_id: a.orgId,
        subject_type: "use_case",
        subject_id: useCaseA.id,
        kind: "note",
        label: `Forged attachment ${stamp}`,
        created_by: b.userId,
      })
      .select("id"),
  );
  assertWriteDenied(
    "B cannot update A's portfolio by id",
    await b.client.from("portfolios").update({ name: "hijacked" }).eq("id", portfolioA.id).select("id"),
  );
  assertWriteDenied(
    "B cannot delete A's use case by id",
    await b.client.from("ai_use_cases").delete().eq("id", useCaseA.id).select("id"),
  );

  // Cleanup (best-effort)
  if (reportId) await a.client.from("generated_reports").delete().eq("id", reportId);
  if (evidenceId) await a.client.from("evidence_items").delete().eq("id", evidenceId);
  if (benefitId) await a.client.from("use_case_benefits").delete().eq("id", benefitId);
  await a.client.from("ai_use_cases").delete().eq("id", useCaseA.id);
  await a.client.from("use_case_boards").delete().eq("id", boardA.id);
  await a.client.from("portfolios").delete().eq("id", portfolioA.id);

  if (failures > 0) {
    console.error(`\n${failures} attack-matrix check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nCross-tenant attack matrix held (IDOR / forged workspace_id).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
