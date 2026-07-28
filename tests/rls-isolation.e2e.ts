/**
 * RLS multi-tenant isolation:
 *   • two demo users (lite + pro) each create a private board + use case
 *   • neither should see the other's board or ai_use_cases rows
 *   • neither should mutate the other's rows
 * Uses the existing seeded demo accounts (see src/lib/demo-accounts.functions.ts).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const userA = process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app";
const userB = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";
const marker = `RLS-${Date.now()}`;

async function signIn(email: string) {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`);
  return { client, userId: data.user.id, email };
}

async function setup(user: Awaited<ReturnType<typeof signIn>>, label: string) {
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
      problem_statement: "Cross-tenant isolation check",
      status: "draft",
      created_by: user.userId,
    })
    .select("id")
    .single();
  if (ucErr) throw ucErr;
  return { boardId: board.id as string, useCaseId: uc.id as string };
}

async function main() {
  const a = await signIn(userA);
  const b = await signIn(userB);
  if (a.userId === b.userId)
    throw new Error("Test misconfigured: both demo accounts resolve to the same user");
  console.log(`✓ signed in two distinct users (${userA}, ${userB})`);

  const aData = await setup(a, "A");
  const bData = await setup(b, "B");
  console.log("✓ each user provisioned private board + use case");

  // A must not read B's board or use case
  const { data: aSeesBoard } = await a.client
    .from("use_case_boards")
    .select("id")
    .eq("id", bData.boardId);
  if (aSeesBoard && aSeesBoard.length > 0)
    throw new Error("User A can SELECT user B's board (RLS leak)");
  const { data: aSeesUc } = await a.client
    .from("ai_use_cases")
    .select("id")
    .eq("id", bData.useCaseId);
  if (aSeesUc && aSeesUc.length > 0)
    throw new Error("User A can SELECT user B's ai_use_case (RLS leak)");
  console.log("✓ user A cannot read user B's rows");

  // B must not read A's rows either
  const { data: bSeesBoard } = await b.client
    .from("use_case_boards")
    .select("id")
    .eq("id", aData.boardId);
  if (bSeesBoard && bSeesBoard.length > 0)
    throw new Error("User B can SELECT user A's board (RLS leak)");
  const { data: bSeesUc } = await b.client
    .from("ai_use_cases")
    .select("id")
    .eq("id", aData.useCaseId);
  if (bSeesUc && bSeesUc.length > 0)
    throw new Error("User B can SELECT user A's ai_use_case (RLS leak)");
  console.log("✓ user B cannot read user A's rows");

  // Cross-tenant UPDATE / DELETE must fail (rowcount 0 under RLS)
  const { data: hijack } = await a.client
    .from("ai_use_cases")
    .update({ title: "HIJACKED by A" })
    .eq("id", bData.useCaseId)
    .select("id");
  if (hijack && hijack.length > 0)
    throw new Error("User A UPDATE succeeded on user B's row (RLS bypass)");
  console.log("✓ cross-tenant UPDATE blocked");

  const { data: nuke } = await a.client
    .from("use_case_boards")
    .delete()
    .eq("id", bData.boardId)
    .select("id");
  if (nuke && nuke.length > 0)
    throw new Error("User A DELETE succeeded on user B's board (RLS bypass)");
  console.log("✓ cross-tenant DELETE blocked");

  // Cleanup — each user removes their own rows
  await a.client.from("ai_use_cases").delete().eq("id", aData.useCaseId);
  await a.client.from("use_case_boards").delete().eq("id", aData.boardId);
  await b.client.from("ai_use_cases").delete().eq("id", bData.useCaseId);
  await b.client.from("use_case_boards").delete().eq("id", bData.boardId);
  await a.client.auth.signOut();
  await b.client.auth.signOut();
}

main()
  .then(() => console.log("\n✅ RLS multi-tenant isolation passed."))
  .catch((err) => {
    console.error("\n❌ RLS isolation failed:", err.message ?? err);
    process.exit(1);
  });
