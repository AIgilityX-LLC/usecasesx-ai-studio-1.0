/**
 * E2E: Create a use case in Studio (ai_use_cases under user's workspace board),
 * save it, and verify it appears in My Use Cases listing with correct metadata.
 *
 * Run: bun run tests/studio-my-use-cases.e2e.ts
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
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: PASSWORD });
  const { data: wsId, error: rpcErr } = await c.rpc("ensure_user_workspace");
  if (rpcErr) throw rpcErr;
  return { userId: data.user.id, email, client: c, workspaceId: wsId as string };
}

async function main() {
  const user = await provisionUser("studio");
  try {
    // 1) Studio creates a board
    const { data: board } = await user.client.from("use_case_boards").insert({
      workspace_id: user.workspaceId,
      title: "Studio Drafts",
      board_type: "studio",
      status: "active",
      created_by: user.userId,
    }).select("id").single();
    if (!board) throw new Error("board create failed");

    // 2) Studio saves a generated use case
    const title = `AI Triage Assistant ${Date.now()}`;
    const { data: uc, error: ucErr } = await user.client.from("ai_use_cases").insert({
      board_id: board.id,
      title,
      problem_statement: "Tier-1 IT tickets pile up",
      ai_type: "Agentic",
      status: "draft",
      created_by: user.userId,
      priority_score: 7.5,
      risk_level: "Medium",
    }).select("id, title, ai_type, status, priority_score, risk_level, board_id").single();
    if (ucErr || !uc) throw ucErr ?? new Error("uc insert failed");

    // 3) My Use Cases query (the listing UI uses board_id filter via workspace)
    await check("appears in My Use Cases list (RLS-scoped)", async () => {
      const { data } = await user.client.from("ai_use_cases")
        .select("id, title, ai_type, status, priority_score, risk_level")
        .eq("board_id", board.id);
      const found = (data ?? []).find((r) => r.id === uc.id);
      if (!found) throw new Error("not found");
      if (found.title !== title) throw new Error("title mismatch");
      if (found.ai_type !== "Agentic") throw new Error("ai_type mismatch");
      if (Number(found.priority_score) !== 7.5) throw new Error("priority_score mismatch");
      if (found.risk_level !== "Medium") throw new Error("risk_level mismatch");
      if (found.status !== "draft") throw new Error("status mismatch");
    });

    // Cleanup
    await admin.from("ai_use_cases").delete().eq("id", uc.id);
    await admin.from("use_case_boards").delete().eq("id", board.id);
  } finally {
    await admin.auth.admin.deleteUser(user.userId).catch(() => {});
  }
  console.log(failures === 0 ? "\n✅ All checks passed." : `\n❌ ${failures} failed.`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
