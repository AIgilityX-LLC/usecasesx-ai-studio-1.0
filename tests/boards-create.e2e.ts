/**
 * E2E: create a new board as a demo user in Studio context and verify it
 * appears with correct ownership when listing boards from the repository hub
 * (i.e. via the same RLS-scoped queries the UI uses).
 *
 * Steps:
 *   1. Sign in as a demo user (pro@demo.usecasex.app).
 *   2. Resolve their workspace.
 *   3. Insert a new use_case_boards row (mimics "Create board" in Studio).
 *   4. Assert the row appears in the user-scoped list (RLS).
 *   5. Assert created_by + workspace org match the demo user's org.
 *   6. Assert a different demo user cannot see the new board.
 *   7. Cleanup.
 *
 * Run with: bun run tests/boards-create.e2e.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SR) {
  console.error("Missing env: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(URL, SR, { auth: { persistSession: false } });

async function signIn(email: string, password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123") {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return { client: c, userId: data.user.id };
}

let failures = 0;
function assert(cond: any, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else {
    console.error(`✗ ${msg}`);
    failures++;
  }
}

async function main() {
  const owner = await signIn("pro@demo.usecasex.app");
  const outsider = await signIn("lite@demo.usecasex.app");

  // Resolve owner workspace + org.
  const { data: prof } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("user_id", owner.userId)
    .single();
  const orgId = prof?.organization_id;
  assert(orgId, "owner has organization_id");

  const { data: ws } = await admin
    .from("workspaces")
    .select("id, organization_id")
    .eq("organization_id", orgId!)
    .limit(1)
    .maybeSingle();
  assert(ws?.id, "owner has workspace");

  // 1) Create board via owner-scoped client (RLS path used by Studio UI).
  const title = `E2E Studio Board ${Date.now()}`;
  const { data: created, error: createErr } = await owner.client
    .from("use_case_boards")
    .insert({
      title,
      workspace_id: ws!.id,
      created_by: owner.userId,
      board_type: "exploration",
    })
    .select("id, title, workspace_id, created_by")
    .single();
  assert(!createErr && created?.id, `owner can create board (err=${createErr?.message ?? "none"})`);
  if (!created?.id) {
    console.error("Aborting: board not created");
    process.exit(1);
  }

  // 2) Appears in owner's repository-hub board list.
  const { data: ownerList } = await owner.client
    .from("use_case_boards")
    .select("id, title, workspace_id, created_by")
    .eq("workspace_id", ws!.id);
  assert(
    (ownerList ?? []).some((b) => b.id === created.id),
    "new board appears in owner's repository-hub board list",
  );

  // 3) Ownership invariants.
  assert(created.created_by === owner.userId, "created_by = signed-in user");
  const { data: wsCheck } = await admin
    .from("workspaces")
    .select("organization_id")
    .eq("id", created.workspace_id)
    .single();
  assert(wsCheck?.organization_id === orgId, "board.workspace.org === owner.org");

  // 4) Outsider cannot see it via RLS.
  const { data: leak } = await outsider.client
    .from("use_case_boards")
    .select("id")
    .eq("id", created.id);
  assert((leak ?? []).length === 0, "outsider (different org) cannot see new board");

  // Cleanup.
  await admin.from("use_case_boards").delete().eq("id", created.id);

  console.log(failures === 0 ? "\nAll create-board assertions passed." : `\n${failures} assertion(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
