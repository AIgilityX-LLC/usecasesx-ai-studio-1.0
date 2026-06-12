/**
 * E2E: Edit + delete a saved use case. Confirm it's removed from Use Case
 * Boards (the board item linked to it is removable) and no longer in the
 * user's saved list (repository "My Saved").
 *
 * Run: bun run tests/saved-edit-delete.e2e.ts
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
  const user = await provisionUser("editdel");
  try {
    const { data: pub } = await admin.from("use_cases")
      .select("id, slug, title").eq("status", "published").limit(1).single();
    if (!pub) throw new Error("no published use case");

    // Save it
    await user.client.from("saved_use_cases").insert({
      user_id: user.userId, use_case_id: pub.id, priority: "Low", note: "initial",
    });

    // Board + linked item
    const { data: board } = await user.client.from("use_case_boards").insert({
      workspace_id: user.workspaceId, title: "Edit/Del Board",
      board_type: "studio", status: "active", created_by: user.userId,
    }).select("id").single();
    const { data: item } = await user.client.from("ai_use_cases").insert({
      board_id: board!.id, title: pub.title, status: "idea", ai_type: "Imported",
      created_by: user.userId,
    }).select("id").single();

    // 1) Edit: update priority + note
    await check("can edit saved use case (priority/note)", async () => {
      const { data, error } = await user.client.from("saved_use_cases")
        .update({ priority: "High", note: "updated" })
        .eq("user_id", user.userId).eq("use_case_id", pub.id)
        .select("priority, note").single();
      if (error) throw error;
      if (data.priority !== "High" || data.note !== "updated") throw new Error("edit didn't persist");
    });

    // 2) Delete from board first
    await check("can delete linked board item", async () => {
      const { error } = await user.client.from("ai_use_cases").delete().eq("id", item!.id);
      if (error) throw error;
      const { data } = await user.client.from("ai_use_cases").select("id").eq("id", item!.id);
      if (data?.length) throw new Error("still present on board");
    });

    // 3) Delete saved
    await check("can delete saved use case", async () => {
      const { error } = await user.client.from("saved_use_cases").delete()
        .eq("user_id", user.userId).eq("use_case_id", pub.id);
      if (error) throw error;
    });

    await check("no longer appears in My Saved list (repository)", async () => {
      const { data } = await user.client.from("saved_use_cases")
        .select("id").eq("user_id", user.userId).eq("use_case_id", pub.id);
      if (data?.length) throw new Error("still in saved list");
    });

    await check("no longer linked on any of user's boards", async () => {
      const { data: boards } = await user.client.from("use_case_boards")
        .select("id").eq("workspace_id", user.workspaceId);
      const ids = (boards ?? []).map((b) => b.id);
      if (ids.length) {
        const { data: leftovers } = await user.client.from("ai_use_cases")
          .select("id, title").in("board_id", ids).eq("title", pub.title);
        if (leftovers?.length) throw new Error(`${leftovers.length} leftover item(s)`);
      }
    });

    // Catalog row itself unaffected — repository still shows the published use case.
    await check("catalog use_cases row untouched (published)", async () => {
      const { data } = await admin.from("use_cases")
        .select("id, status").eq("id", pub.id).single();
      if (!data || data.status !== "published") throw new Error("catalog row broken");
    });

    await admin.from("use_case_boards").delete().eq("id", board!.id);
  } finally {
    await admin.auth.admin.deleteUser(user.userId).catch(() => {});
  }
  console.log(failures === 0 ? "\n✅ All checks passed." : `\n❌ ${failures} failed.`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
