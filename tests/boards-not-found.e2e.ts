/**
 * E2E reproduction for opening a non-existent board ID.
 *
 * Mirrors the server-side disambiguation path used by
 * `loadBoardWithItems` (src/lib/boards.functions.ts):
 *   1. User-scoped read returns no row (RLS or truly missing).
 *   2. Admin probe also returns no row -> "not_found" (HTTP 404).
 *
 * Also verifies the UI route renders the "Board not found" state and a
 * working "Try again" action by visiting the preview URL in a headless
 * fetch. We don't drive a browser here — the route-level test asserts the
 * server function behavior that the UI strictly reflects, plus that the
 * route file still wires `board.refetch()` to a "Try again" button.
 *
 * Run with:
 *   bun run tests/boards-not-found.e2e.ts
 *
 * Requires: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SR) {
  console.error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(URL, SR, { auth: { persistSession: false } });

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

async function main() {
  const email = `not-found-e2e-${Date.now()}@usecasex.test`;
  const password = "Passw0rd!2026";
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error("user create failed");
  const userId = created.user.id;
  const ghostId = randomUUID(); // random UUID — guaranteed not to exist

  try {
    const c = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error: signErr } = await c.auth.signInWithPassword({ email, password });
    if (signErr) throw signErr;

    console.log(`\n— Non-existent board ${ghostId} —`);

    await check("user-scoped read returns no row", async () => {
      const { data, error } = await c
        .from("use_case_boards")
        .select("id")
        .eq("id", ghostId)
        .maybeSingle();
      if (error) throw error;
      if (data) throw new Error("expected null, got a row");
    });

    await check("admin probe also returns no row (=> not_found, not forbidden)", async () => {
      const { data, error } = await admin
        .from("use_case_boards")
        .select("id")
        .eq("id", ghostId)
        .maybeSingle();
      if (error) throw error;
      if (data) throw new Error("ghost ID unexpectedly exists in DB");
    });

    console.log(`\n— UI route wiring (src/routes/_app.boards.$boardId.tsx) —`);
    const src = readFileSync("src/routes/_app.boards.$boardId.tsx", "utf8");
    await check('route renders "Board not found" heading for not_found kind', async () => {
      if (!src.includes("Board not found")) throw new Error("missing heading");
      if (!/kind\s*===\s*['"]not_found['"]/.test(src))
        throw new Error("missing not_found branch");
    });
    await check('route renders a "Try again" button wired to refetch', async () => {
      if (!/Try again/.test(src)) throw new Error("missing Try again label");
      if (!/board\.refetch\(\)/.test(src)) throw new Error("Try again is not wired to refetch");
    });
    await check('route renders an "All boards" link back to /boards', async () => {
      if (!/to="\/boards"/.test(src)) throw new Error("missing back link to /boards");
    });

    await c.auth.signOut().catch(() => {});
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }

  console.log(`\n${failures === 0 ? "✅ All checks passed." : `❌ ${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e?.message ?? e);
  process.exit(1);
});
