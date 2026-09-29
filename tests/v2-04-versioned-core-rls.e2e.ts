/**
 * V2-04 versioned core — cross-tenant denial for new tables + immutability.
 *
 * Requires migration 20260923120000_v2_04_versioned_core_model.sql applied
 * and seeded demo accounts (same as tests/rls-isolation.e2e.ts).
 *
 * Run: bun run tests/v2-04-versioned-core-rls.e2e.ts
 */
import { createClient } from "@supabase/supabase-js";
import { CANVAS_SECTION_KEYS } from "../src/lib/lifecycle/canvas-sections";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const emailA = process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app";
const emailB = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";
const marker = `V204-${Date.now()}`;

const failures: string[] = [];
function check(label: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function signIn(email: string) {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`);
  return { client, userId: data.user.id };
}

async function tableReady(client: ReturnType<typeof createClient>, table: string) {
  const { error } = await client.from(table).select("id").limit(1);
  if (error && /does not exist|schema cache|Could not find/i.test(error.message)) {
    console.warn(`⏭ skip: ${table} not present — apply V2-04 migration first (${error.message})`);
    return false;
  }
  return true;
}

async function provisionUseCase(user: Awaited<ReturnType<typeof signIn>>, label: string) {
  const { data: workspaceId, error: wsErr } = await user.client.rpc("ensure_user_workspace");
  if (wsErr) throw wsErr;
  const { data: board, error: boardErr } = await user.client
    .from("use_case_boards")
    .insert({
      workspace_id: workspaceId as string,
      title: `${marker} ${label} board`,
      board_type: "studio",
      status: "active",
      created_by: user.userId,
    })
    .select("id")
    .single();
  if (boardErr) throw boardErr;
  const { data: uc, error: ucErr } = await user.client
    .from("ai_use_cases")
    .insert({
      board_id: board.id,
      title: `${marker} ${label} case`,
      problem_statement: "V2-04 isolation",
      status: "draft",
      created_by: user.userId,
    })
    .select("id, workspace_id")
    .single();
  if (ucErr) throw ucErr;
  return {
    workspaceId: workspaceId as string,
    useCaseId: uc.id as string,
    ucWorkspaceId: uc.workspace_id as string | null,
  };
}

async function captureOpp(user: Awaited<ReturnType<typeof signIn>>, label: string) {
  const { data: workspaceId, error: wsErr } = await user.client.rpc("ensure_user_workspace");
  if (wsErr) throw wsErr;
  const { data, error } = await user.client
    .from("opportunities")
    .insert({
      title: `${marker} ${label}`,
      workspace_id: workspaceId as string,
      created_by: user.userId,
      status: "signal",
    })
    .select("id, workspace_id")
    .single();
  if (error) throw error;
  return { id: data.id as string, workspaceId: data.workspace_id as string };
}

const a = await signIn(emailA);
const b = await signIn(emailB);
check("two distinct users", a.userId !== b.userId);

const readyVersions = await tableReady(a.client, "opportunity_versions");
const readySections = await tableReady(a.client, "use_case_canvas_sections");
if (!readyVersions || !readySections) {
  console.log("\nV2-04 tables missing — migration not applied on this database yet.");
  process.exit(0);
}

const oppA = await captureOpp(a, "A");
const oppB = await captureOpp(b, "B");

const { data: ovA, error: ovErr } = await a.client
  .from("opportunity_versions")
  .insert({
    opportunity_id: oppA.id,
    version: 2,
    kind: "submitted",
    snapshot: { title: `${marker} snap A` },
    workspace_id: oppA.workspaceId,
    created_by: a.userId,
  })
  .select("id")
  .single();
check("user A can insert own opportunity version", !ovErr && !!ovA?.id);

const { data: aSeesOvB } = await a.client
  .from("opportunity_versions")
  .select("id")
  .eq("opportunity_id", oppB.id);
check("user A cannot read B opportunity versions", !aSeesOvB || aSeesOvB.length === 0);

if (ovA?.id) {
  const { data: mutated, error: mutErr } = await a.client
    .from("opportunity_versions")
    .update({ snapshot: { hijacked: true } })
    .eq("id", ovA.id)
    .select("id");
  check(
    "opportunity version snapshot is immutable",
    (!!mutErr && /immutable|cannot/i.test(mutErr.message)) || !mutated || mutated.length === 0,
  );
}

const ucA = await provisionUseCase(a, "A");
const ucB = await provisionUseCase(b, "B");
const sectionKey = CANVAS_SECTION_KEYS[0];

const { data: secA, error: secErr } = await a.client
  .from("use_case_canvas_sections")
  .insert({
    use_case_id: ucA.useCaseId,
    section_key: sectionKey,
    title: "Problem",
    content: { body: "draft" },
    workspace_id: ucA.ucWorkspaceId ?? ucA.workspaceId,
    created_by: a.userId,
  })
  .select("id")
  .single();
check("user A can insert draft canvas section", !secErr && !!secA?.id);

const { data: aSeesSecB } = await a.client
  .from("use_case_canvas_sections")
  .select("id")
  .eq("use_case_id", ucB.useCaseId);
check("user A cannot read B canvas sections", !aSeesSecB || aSeesSecB.length === 0);

const { data: hijackSec } = await a.client
  .from("use_case_canvas_sections")
  .update({ content: { body: "hijacked" } })
  .eq("use_case_id", ucB.useCaseId)
  .select("id");
check("user A cannot mutate B canvas sections", !hijackSec || hijackSec.length === 0);

const { data: anonRows } = await createClient(url, anonKey, { auth: { persistSession: false } })
  .from("use_case_canvas_sections")
  .select("id")
  .limit(1);
check("anonymous cannot read canvas sections", !anonRows || anonRows.length === 0);

if (failures.length) {
  console.error(`\n❌ V2-04 RLS checks failed: ${failures.length}`);
  process.exit(1);
}
console.log("\n✅ V2-04 versioned-core RLS denials passed.");
