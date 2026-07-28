/**
 * E2E: items are filtered by board ownership/visibility.
 *
 * Creates a fresh "owner" user with an org+workspace+board+item, then a
 * fresh "outsider" user in a different org, and asserts:
 *   1. Owner can read the board and its items via RLS.
 *   2. Outsider sees zero rows when querying use_case_boards by ID.
 *   3. Outsider sees zero rows when querying ai_use_cases by board_id
 *      (the exact filter shape used by loadBoardWithItems).
 *   4. Outsider sees zero rows when querying ai_use_cases by the item's
 *      own id (no back-door lookup).
 *   5. The DB-side has_role / user_in_workspace helpers agree:
 *      user_in_workspace(outsider, owner_workspace) returns false.
 *
 * Run with:
 *   bun run tests/boards-items-ownership.e2e.ts
 *
 * Requires: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SR) {
  console.error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(URL, SR, { auth: { persistSession: false } });
const PASSWORD = "Passw0rd!2026";

let failures = 0;
async function check(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (e: any) {
    failures += 1;
    console.log(`  ✗ ${label} — ${e?.message ?? e}`);
  }
}

async function provisionUser(label: string) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@usecasex.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  // Trigger ensure_user_workspace via authenticated RPC (creates org+workspace).
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signErr } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (signErr) throw signErr;
  const { data: wsId, error: rpcErr } = await c.rpc("ensure_user_workspace");
  if (rpcErr) throw rpcErr;
  return { userId: data.user.id, email, client: c, workspaceId: wsId as string };
}

async function main() {
  const owner = await provisionUser("owner");
  const outsider = await provisionUser("outsider");
  try {
    // Owner creates a board + one item (via service role so we control IDs).
    const { data: board, error: bErr } = await admin
      .from("use_case_boards")
      .insert({
        workspace_id: owner.workspaceId,
        title: "Owner Private Board",
        description: "Ownership test board",
        board_type: "studio",
        status: "active",
        created_by: owner.userId,
      })
      .select("id")
      .single();
    if (bErr || !board) throw bErr ?? new Error("board insert failed");
    const boardId = board.id;

    const { data: item, error: iErr } = await admin
      .from("ai_use_cases")
      .insert({
        board_id: boardId,
        title: "Owner Private Item",
        problem_statement: "Confidential",
        ai_type: "Predictive ML",
        status: "draft",
        created_by: owner.userId,
      })
      .select("id")
      .single();
    if (iErr || !item) throw iErr ?? new Error("item insert failed");
    const itemId = item.id;

    console.log(`\n— Owner (${owner.email}) —`);
    await check("can read own board", async () => {
      const { data, error } = await owner.client
        .from("use_case_boards")
        .select("id, title")
        .eq("id", boardId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("RLS hid own board");
    });
    await check("can read own board items via .eq(board_id)", async () => {
      const { data, error } = await owner.client
        .from("ai_use_cases")
        .select("id")
        .eq("board_id", boardId);
      if (error) throw error;
      if (!data?.length) throw new Error("RLS hid own items");
    });

    console.log(`\n— Outsider (${outsider.email}) — must NOT see owner's board/items —`);
    await check("cannot read board by id (RLS denies)", async () => {
      const { data, error } = await outsider.client
        .from("use_case_boards")
        .select("id")
        .eq("id", boardId)
        .maybeSingle();
      if (error) throw error;
      if (data) throw new Error("RLS leak: outsider can see board");
    });
    await check("cannot list items by board_id (the loadBoardWithItems filter)", async () => {
      const { data, error } = await outsider.client
        .from("ai_use_cases")
        .select("id")
        .eq("board_id", boardId);
      if (error) throw error;
      if (data?.length) throw new Error(`RLS leak: outsider saw ${data.length} item(s)`);
    });
    await check("cannot fetch item directly by id", async () => {
      const { data, error } = await outsider.client
        .from("ai_use_cases")
        .select("id")
        .eq("id", itemId)
        .maybeSingle();
      if (error) throw error;
      if (data) throw new Error("RLS leak: outsider fetched item by id");
    });
    await check("user_in_workspace(outsider, owner_workspace) = false", async () => {
      const { data, error } = await admin.rpc("user_in_workspace", {
        _user_id: outsider.userId,
        _workspace_id: owner.workspaceId,
      });
      if (error) throw error;
      if (data !== false) throw new Error(`expected false, got ${data}`);
    });

    // Cleanup
    await admin.from("ai_use_cases").delete().eq("id", itemId);
    await admin.from("use_case_boards").delete().eq("id", boardId);
  } finally {
    await owner.client.auth.signOut().catch(() => {});
    await outsider.client.auth.signOut().catch(() => {});
    await admin.auth.admin.deleteUser(owner.userId).catch(() => {});
    await admin.auth.admin.deleteUser(outsider.userId).catch(() => {});
  }

  console.log(`\n${failures === 0 ? "✅ All checks passed." : `❌ ${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e?.message ?? e);
  process.exit(1);
});
