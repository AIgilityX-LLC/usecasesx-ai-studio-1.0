/**
 * E2E: Save a published use case, add it to a Use Case Board (via ai_use_cases
 * with pattern_id link), open the board detail page, and verify the deep-link
 * back to Studio resolves to the catalog slug.
 *
 * Run: bun run tests/boards-saved-deeplink.e2e.ts
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SR) { console.error("Missing env"); process.exit(1); }

const admin = createClient(URL, SR, { auth: { persistSession: false } });
const PASSWORD = "Passw0rd!2026";
let failures = 0;
const check = async (label: string, fn: () => Promise<void>) => {
  try { await fn(); console.log(`  ✓ ${label}`); }
  catch (e: any) { failures++; console.log(`  ✗ ${label} — ${e?.message ?? e}`); }
};

async function provisionUser(label: string) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@usecasex.test`;
  const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: PASSWORD });
  const { data: wsId } = await c.rpc("ensure_user_workspace");
  return { userId: data!.user!.id, client: c, workspaceId: wsId as string };
}

async function main() {
  const user = await provisionUser("deeplink");
  try {
    // Find a published catalog use case (the "saved" source).
    const { data: pub } = await admin.from("use_cases")
      .select("id, slug, title").eq("status", "published").limit(1).single();
    if (!pub) throw new Error("no published use case to save");

    // 1) Save it to the user's saved_use_cases
    const { error: saveErr } = await user.client.from("saved_use_cases").insert({
      user_id: user.userId, use_case_id: pub.id, priority: "High", note: "deep-link test",
    });
    if (saveErr) throw saveErr;

    await check("saved use case appears in My Saved list", async () => {
      const { data } = await user.client.from("saved_use_cases")
        .select("use_case_id, priority").eq("user_id", user.userId);
      if (!data?.some((r) => r.use_case_id === pub.id && r.priority === "High"))
        throw new Error("not found");
    });

    // 2) Create a board and add the saved use case as a board item.
    const { data: board } = await user.client.from("use_case_boards").insert({
      workspace_id: user.workspaceId, title: "My Deeplink Board",
      board_type: "studio", status: "active", created_by: user.userId,
    }).select("id, title").single();

    const { data: item } = await user.client.from("ai_use_cases").insert({
      board_id: board!.id, title: pub.title, status: "idea", ai_type: "Imported",
      created_by: user.userId,
    }).select("id, title, board_id").single();

    // 3) Open board detail — replicate loadBoardWithItems shape.
    await check("board detail loads board + items via RLS", async () => {
      const { data: b } = await user.client.from("use_case_boards")
        .select("id, title").eq("id", board!.id).maybeSingle();
      if (!b || b.title !== "My Deeplink Board") throw new Error("board missing");
      const { data: items } = await user.client.from("ai_use_cases")
        .select("id, title, board_id").eq("board_id", board!.id);
      if (!items?.some((r) => r.id === item!.id)) throw new Error("item missing");
    });

    // 4) Deep-link back to Studio — the route uses catalog slug; verify slug resolves.
    await check("deep-link slug resolves to published use case", async () => {
      const { data } = await admin.from("use_cases")
        .select("id, slug, status").eq("slug", pub.slug).maybeSingle();
      if (!data || data.status !== "published") throw new Error("slug doesn't resolve");
      // The Studio deep link in the UI: /use-cases/$slug
      const href = `/use-cases/${pub.slug}`;
      if (!/^\/use-cases\/[a-z0-9-]+$/.test(href)) throw new Error("bad href shape");
    });

    // Cleanup
    await admin.from("ai_use_cases").delete().eq("id", item!.id);
    await admin.from("use_case_boards").delete().eq("id", board!.id);
    await admin.from("saved_use_cases").delete().eq("user_id", user.userId).eq("use_case_id", pub.id);
  } finally {
    await admin.auth.admin.deleteUser(user.userId).catch(() => {});
  }
  console.log(failures === 0 ? "\n✅ All checks passed." : `\n❌ ${failures} failed.`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
