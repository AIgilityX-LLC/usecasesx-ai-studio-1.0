/**
 * End-to-end reproduction for the "user has organization_id = NULL" case.
 *
 * Verifies that:
 *   1. ensure_user_workspace() auto-provisions an org + workspace.
 *   2. A board can be inserted, listed, and deleted by that user.
 *   3. An audit_events row is written for board create + delete.
 *
 * Run with:
 *   bun run tests/boards.e2e.ts
 *
 * Requires server env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  process.stdout.write(`• ${label} … `);
  try {
    const r = await fn();
    console.log("ok");
    return r;
  } catch (e: any) {
    console.log("FAIL");
    throw e;
  }
}

async function main() {
  const email = `boards-e2e-${Date.now()}@usecasex.test`;
  const password = "Passw0rd!2026";

  // 1. Create a fresh user — handle_new_user inserts a profile with organization_id = NULL.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error("user create failed");
  const userId = created.user.id;
  console.log(`Created user ${userId} (${email})`);

  try {
    // Confirm starting condition: organization_id IS NULL.
    await step("verify profile.organization_id is NULL", async () => {
      const { data, error } = await admin
        .from("profiles")
        .select("organization_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data?.organization_id != null)
        throw new Error(`expected NULL, got ${data?.organization_id}`);
    });

    // 2. Sign in as that user → user-scoped client (RLS applies as the user).
    const userClient = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? SERVICE_ROLE,
      {
        auth: { persistSession: false },
      },
    );
    const { error: signErr } = await userClient.auth.signInWithPassword({ email, password });
    if (signErr) throw signErr;

    // 3. ensure_user_workspace must succeed and return a workspace id.
    const workspaceId = await step("rpc ensure_user_workspace", async () => {
      const { data, error } = await userClient.rpc("ensure_user_workspace" as any);
      if (error) throw error;
      if (!data) throw new Error("no workspace id returned");
      return data as unknown as string;
    });
    console.log(`  workspace=${workspaceId}`);

    // 4. Insert a board.
    const boardId = await step("insert use_case_boards row", async () => {
      const { data, error } = await userClient
        .from("use_case_boards")
        .insert({
          workspace_id: workspaceId,
          title: "E2E Smoke Board",
          created_by: userId,
          board_type: "studio",
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("no row");
      return data.id as string;
    });

    // 5. List boards — the row should appear.
    await step("list boards", async () => {
      const { data, error } = await userClient
        .from("use_case_boards")
        .select("id")
        .eq("id", boardId);
      if (error) throw error;
      if (!data?.length) throw new Error("board not visible to owner");
    });

    // 6. Audit row for create.
    await step("audit_events has board.created", async () => {
      const { data, error } = await admin
        .from("audit_events")
        .select("event_type")
        .eq("entity_id", boardId)
        .eq("event_type", "board.created");
      if (error) throw error;
      if (!data?.length) throw new Error("missing audit_events board.created row");
    });

    // 7. Delete board.
    await step("delete board", async () => {
      const { error } = await userClient.from("use_case_boards").delete().eq("id", boardId);
      if (error) throw error;
    });

    // 8. Audit row for delete.
    await step("audit_events has board.deleted", async () => {
      const { data, error } = await admin
        .from("audit_events")
        .select("event_type")
        .eq("entity_id", boardId)
        .eq("event_type", "board.deleted");
      if (error) throw error;
      if (!data?.length) throw new Error("missing audit_events board.deleted row");
    });

    console.log("\n✅ All steps passed.");
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}

main().catch((e) => {
  console.error("\n❌ E2E failed:", e?.message ?? e);
  process.exit(1);
});
