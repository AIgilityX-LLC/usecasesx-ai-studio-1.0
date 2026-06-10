/**
 * E2E reproduction for the "open board" flow against seeded demo data.
 *
 * For every demo workspace owner (admin / enterprise / pro / lite / moderator):
 *   1. Sign in as the demo user.
 *   2. List their boards via RLS (should return at least one).
 *   3. Open the first board: fetch title + items via the same RLS path the
 *      UI uses. Both must succeed and the items count must be >= 0.
 *   4. Negative: a different demo user MUST NOT see board #1's contents
 *      (RLS denies → no row → UI shows "Access denied").
 *
 * Also asserts ownership invariants for the seeded boards:
 *   - Every demo workspace has at least one board.
 *   - Every board's created_by belongs to a profile whose organization_id
 *     matches the board's workspace.organization_id (so RLS sees it).
 *
 * Run with:
 *   bun run tests/boards-open.e2e.ts
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

const DEMO = [
  "admin@demo.usecasex.app",
  "enterprise@demo.usecasex.app",
  "pro@demo.usecasex.app",
  "lite@demo.usecasex.app",
  "moderator@demo.usecasex.app",
];
const PASSWORD = "Demo@123";

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

async function asUser(email: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

async function main() {
  // Ownership invariants — admin-side assertions on seeded data.
  console.log("\n— Ownership invariants —");
  for (const email of DEMO) {
    await check(`${email}: profile has organization_id`, async () => {
      const { data } = await admin.from("profiles").select("organization_id").eq("email", email).maybeSingle();
      if (!data?.organization_id) throw new Error("profile.organization_id is NULL");
    });
    await check(`${email}: has >=1 board in own workspace`, async () => {
      const { data: prof } = await admin.from("profiles").select("user_id, organization_id").eq("email", email).single();
      const { data: ws } = await admin.from("workspaces").select("id").eq("organization_id", prof!.organization_id).limit(1).single();
      const { data: boards } = await admin.from("use_case_boards").select("id, created_by").eq("workspace_id", ws!.id);
      if (!boards?.length) throw new Error("no boards in workspace");
      const wrong = boards.filter((b: any) => b.created_by !== prof!.user_id);
      if (wrong.length) throw new Error(`${wrong.length} board(s) not owned by ${email}`);
    });
  }

  // Per-user open-board flow.
  for (const email of DEMO) {
    console.log(`\n— ${email} open-board flow —`);
    const c = await asUser(email);
    const { data: { user } } = await c.auth.getUser();

    const boards = await (async () => {
      const { data, error } = await c.from("use_case_boards").select("id, title").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    })();
    await check(`lists own boards (got ${boards.length})`, async () => {
      if (boards.length === 0) throw new Error("no boards visible");
    });
    if (boards.length === 0) continue;

    const boardId = boards[0].id;
    await check(`open board ${boardId} — title loads`, async () => {
      const { data, error } = await c.from("use_case_boards")
        .select("id, title, workspace_id").eq("id", boardId).maybeSingle();
      if (error) throw error;
      if (!data?.title) throw new Error("title missing");
    });
    await check(`open board ${boardId} — items load`, async () => {
      const { data, error } = await c.from("ai_use_cases")
        .select("id, title").eq("board_id", boardId);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("items query returned non-array");
    });

    // Negative: a different demo user must not see this board.
    const otherEmail = DEMO.find((e) => e !== email)!;
    const other = await asUser(otherEmail);
    await check(`other user (${otherEmail}) is denied this board`, async () => {
      const { data, error } = await other.from("use_case_boards").select("id").eq("id", boardId).maybeSingle();
      if (error) throw error;
      if (data) throw new Error("RLS leak: other user can see this board");
    });
    await other.auth.signOut().catch(() => {});
    await c.auth.signOut().catch(() => {});
    void user;
  }

  console.log(`\n${failures === 0 ? "✅ All checks passed." : `❌ ${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e?.message ?? e);
  process.exit(1);
});
