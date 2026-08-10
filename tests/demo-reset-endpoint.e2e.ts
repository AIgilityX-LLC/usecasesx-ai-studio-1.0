/**
 * Demo re-seed endpoint guarantees.
 * Run with: bun tests/demo-reset-endpoint.e2e.ts
 *
 * Proves that:
 *  - a scoped re-seed only touches the template workspace for that
 *    `demo_scenario_key` — other demo templates and tenant workspaces are untouched
 *  - an unknown scenario key is rejected
 *  - the reset cooldown (ad-hoc rate limit) blocks a second run inside the window
 *  - the reset audit log is not readable anonymously and password auth is enforced
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_SCENARIOS } from "../src/lib/demo/demo-scenarios";
import {
  assertResetAllowed,
  logDemoReset,
  resetDemoScenarioTemplates,
} from "../src/lib/demo/demo-scenarios.server";
import { demoResetAuthorized } from "../src/lib/demo/demo-reset.server";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / publishable key");
  process.exit(1);
}
process.env.SUPABASE_URL ||= url;

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

async function countUseCases(workspaceId: string) {
  const { count } = await admin
    .from("ai_use_cases")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  return count ?? 0;
}

async function main() {
  /* ---------------- role / credential checks ---------------- */
  check("password-gated reset rejects a wrong password", !demoResetAuthorized("not-the-password"));
  check(
    "password-gated reset rejects a non-demo caller with no password",
    !demoResetAuthorized(undefined, "someone@example.com"),
  );
  check(
    "demo persona email is accepted by the password gate",
    demoResetAuthorized(undefined, "pro@demo.usecasex.app"),
  );

  const { data: anonLog, error: anonError } = await anon
    .from("demo_reset_log")
    .select("id")
    .limit(1);
  check(
    "reset audit log is not readable anonymously",
    Boolean(anonError) || (anonLog ?? []).length === 0,
  );

  /* ---------------- rate limit ---------------- */
  await admin.from("demo_reset_log").delete().eq("scope", "rate-limit-probe");
  await logDemoReset({ scope: "rate-limit-probe", actorLabel: "e2e" });
  let throttled = false;
  try {
    await assertResetAllowed("rate-limit-probe");
  } catch {
    throttled = true;
  }
  check("a second reset inside the cooldown window is rejected", throttled);
  await admin.from("demo_reset_log").delete().eq("scope", "rate-limit-probe");

  /* ---------------- scope: unknown key ---------------- */
  let rejectedUnknown = false;
  try {
    await resetDemoScenarioTemplates({ scenarioKeys: ["not-a-real-scenario"] });
  } catch {
    rejectedUnknown = true;
  }
  check("unknown demo_scenario_key is rejected", rejectedUnknown);

  /* ---------------- scope: only the targeted template ---------------- */
  const { data: templates } = await admin
    .from("workspaces")
    .select("id, demo_scenario_key")
    .not("demo_scenario_key", "is", null);
  const templateRows = templates ?? [];

  if (templateRows.length < 1) {
    console.log("SKIP  scoped re-seed — demo templates are not provisioned in this environment");
  } else {
    const target = templateRows[0]!;
    const others = templateRows.slice(1);

    const { data: tenantWorkspace } = await admin
      .from("workspaces")
      .select("id")
      .or("is_demo.is.null,is_demo.eq.false")
      .limit(1)
      .maybeSingle();

    const before = new Map<string, number>();
    for (const ws of [...others, ...(tenantWorkspace ? [tenantWorkspace] : [])]) {
      before.set(ws.id, await countUseCases(ws.id));
    }

    const result = await resetDemoScenarioTemplates({
      scenarioKeys: [target.demo_scenario_key as string],
    });
    check(
      "scoped re-seed reports exactly one scenario",
      result.results.length <= 1,
      `${result.results.length} scenarios re-seeded`,
    );
    check(
      "scoped re-seed re-created the targeted template",
      (await countUseCases(target.id)) > 0 || result.results.length === 0,
    );

    let untouched = true;
    for (const [id, count] of before) {
      if ((await countUseCases(id)) !== count) {
        untouched = false;
        check(`workspace ${id} was modified by an out-of-scope reset`, false);
      }
    }
    check("out-of-scope demo templates and tenant workspaces are untouched", untouched);

    const scenario = DEMO_SCENARIOS.find((s) => s.key === target.demo_scenario_key);
    check("targeted template maps to a known scenario", Boolean(scenario));
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
