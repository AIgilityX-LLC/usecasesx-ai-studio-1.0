/**
 * E2E: board items pagination + sorting under RLS.
 *
 * Setup (admin, ephemeral):
 *   - Create owner + outsider users in separate orgs/workspaces.
 *   - Create one board for owner with 25 ai_use_cases seeded with
 *     monotonically increasing titles and created_at offsets.
 *
 * Assertions (against owner-scoped RLS client):
 *   1. Page-size pagination: range(0,9) → 10 rows, range(10,19) → 10 rows,
 *      range(20,24) → 5 rows; no row appears on two pages.
 *   2. Sort by title ascending vs descending returns the same set in
 *      mirrored order.
 *   3. Sort by created_at ascending returns the oldest first.
 *   4. Ownership filter still enforced: outsider sees zero rows even when
 *      requesting the same range/sort.
 *
 * Run with: bun run tests/boards-items-pagination.e2e.ts
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

let failures = 0;
function assert(cond: any, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else {
    console.error(`✗ ${msg}`);
    failures++;
  }
}

async function mkUser(label: string) {
  const email = `e2e-paging-${label}-${Date.now()}@example.test`;
  const password = "Passw0rd!Passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
  const userId = data.user.id;

  const { data: org } = await admin
    .from("organizations")
    .insert({ name: `E2E Paging ${label}`, plan: "lite" })
    .select("id")
    .single();
  await admin
    .from("profiles")
    .upsert({ user_id: userId, email, organization_id: org!.id }, { onConflict: "user_id" });
  const { data: ws } = await admin
    .from("workspaces")
    .insert({ organization_id: org!.id, name: `E2E WS ${label}`, created_by: userId })
    .select("id")
    .single();

  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signErr } = await c.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(`signIn ${label}: ${signErr.message}`);

  return { userId, email, orgId: org!.id, wsId: ws!.id, client: c };
}

async function cleanup(userId: string, orgId: string) {
  await admin.from("ai_use_cases").delete().eq("created_by", userId);
  await admin.from("use_case_boards").delete().eq("created_by", userId);
  await admin.from("workspaces").delete().eq("organization_id", orgId);
  await admin.from("profiles").delete().eq("user_id", userId);
  await admin.from("organizations").delete().eq("id", orgId);
  await admin.auth.admin.deleteUser(userId);
}

async function main() {
  const owner = await mkUser("owner");
  const outsider = await mkUser("outsider");

  try {
    // Create board.
    const { data: board, error: bErr } = await admin
      .from("use_case_boards")
      .insert({
        title: "Paging board",
        workspace_id: owner.wsId,
        created_by: owner.userId,
        board_type: "exploration",
      })
      .select("id")
      .single();
    if (bErr || !board) throw new Error(`create board: ${bErr?.message}`);

    // Seed 25 items.
    const base = Date.now();
    const items = Array.from({ length: 25 }).map((_, i) => ({
      board_id: board.id,
      title: `Item ${String(i).padStart(3, "0")}`,
      created_by: owner.userId,
      created_at: new Date(base - (25 - i) * 1000).toISOString(),
    }));
    const { error: iErr } = await admin.from("ai_use_cases").insert(items);
    if (iErr) throw new Error(`seed items: ${iErr.message}`);

    // 1) Pagination
    const pageA = await owner.client
      .from("ai_use_cases")
      .select("id, title")
      .eq("board_id", board.id)
      .order("title", { ascending: true })
      .range(0, 9);
    const pageB = await owner.client
      .from("ai_use_cases")
      .select("id, title")
      .eq("board_id", board.id)
      .order("title", { ascending: true })
      .range(10, 19);
    const pageC = await owner.client
      .from("ai_use_cases")
      .select("id, title")
      .eq("board_id", board.id)
      .order("title", { ascending: true })
      .range(20, 24);

    assert(pageA.data?.length === 10, `page A returns 10 rows (got ${pageA.data?.length})`);
    assert(pageB.data?.length === 10, `page B returns 10 rows (got ${pageB.data?.length})`);
    assert(pageC.data?.length === 5, `page C returns 5 rows (got ${pageC.data?.length})`);

    const ids = new Set<string>();
    let dup = false;
    for (const p of [pageA.data, pageB.data, pageC.data]) {
      for (const r of p ?? []) {
        if (ids.has(r.id)) dup = true;
        ids.add(r.id);
      }
    }
    assert(!dup && ids.size === 25, "no duplicate rows across pages; total = 25");

    // 2) Sort asc vs desc mirror
    const asc = await owner.client
      .from("ai_use_cases")
      .select("title")
      .eq("board_id", board.id)
      .order("title", { ascending: true });
    const desc = await owner.client
      .from("ai_use_cases")
      .select("title")
      .eq("board_id", board.id)
      .order("title", { ascending: false });
    const ascTitles = (asc.data ?? []).map((r) => r.title);
    const descTitles = (desc.data ?? []).map((r) => r.title);
    assert(
      JSON.stringify(ascTitles) === JSON.stringify([...descTitles].reverse()),
      "title desc is mirror of title asc",
    );
    assert(ascTitles[0] === "Item 000" && ascTitles[24] === "Item 024", "asc sort order correct");

    // 3) Sort by created_at asc → oldest first (Item 000 was created first)
    const byDate = await owner.client
      .from("ai_use_cases")
      .select("title, created_at")
      .eq("board_id", board.id)
      .order("created_at", { ascending: true })
      .limit(1);
    assert(byDate.data?.[0]?.title === "Item 000", "created_at asc returns oldest first");

    // 4) Outsider ownership filter
    const outPage = await outsider.client
      .from("ai_use_cases")
      .select("id")
      .eq("board_id", board.id)
      .order("title", { ascending: true })
      .range(0, 9);
    assert((outPage.data ?? []).length === 0, "outsider sees 0 rows for owner's board (RLS)");

    const outBoard = await outsider.client.from("use_case_boards").select("id").eq("id", board.id);
    assert((outBoard.data ?? []).length === 0, "outsider cannot read the board itself");
  } finally {
    await cleanup(owner.userId, owner.orgId);
    await cleanup(outsider.userId, outsider.orgId);
  }

  console.log(
    failures === 0 ? "\nAll pagination assertions passed." : `\n${failures} assertion(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
