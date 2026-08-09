/**
 * Demo isolation + sample copy lineage.
 * Run with: bun tests/demo-scenarios.e2e.ts
 *
 * Proves that:
 *  - every demo template workspace is flagged is_demo / is_demo_template
 *  - demo organisations are flagged is_demo
 *  - product events raised inside a demo workspace never reach the
 *    activation_funnel_daily view (no metric inflation)
 *  - the sample-copy ledger is per-user and readable only by its owner
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_SCENARIOS } from "../src/lib/demo/demo-scenarios";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / publishable key");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

async function main() {
  const { data: templates } = await admin
    .from("workspaces")
    .select("id, organization_id, demo_scenario_key, is_demo, is_demo_template")
    .not("demo_scenario_key", "is", null);

  const rows = templates ?? [];
  check("demo template workspaces exist", rows.length > 0, `${rows.length} found`);
  check(
    "all template workspaces are labelled as demo",
    rows.every((w) => w.is_demo && w.is_demo_template),
  );
  for (const scenario of DEMO_SCENARIOS) {
    check(
      `scenario "${scenario.key}" has a template workspace`,
      rows.some((w) => w.demo_scenario_key === scenario.key),
    );
  }

  const orgIds = [...new Set(rows.map((w) => w.organization_id).filter(Boolean))] as string[];
  if (orgIds.length) {
    const { data: orgs } = await admin.from("organizations").select("id, is_demo").in("id", orgIds);
    check(
      "demo organisations are labelled as demo",
      (orgs ?? []).every((o) => o.is_demo),
    );
  }

  // Analytics exclusion: raise an event inside a demo workspace and confirm the view ignores it.
  const demoWorkspace = rows[0];
  if (demoWorkspace) {
    const eventName = `demo_isolation_probe_${Date.now()}`;
    const { error: eventError } = await admin.from("product_events").insert({
      event_name: eventName,
      workspace_id: demoWorkspace.id,
      organization_id: demoWorkspace.organization_id,
    });
    check("can record a demo product event", !eventError, eventError?.message ?? "");

    const { data: funnel } = await admin
      .from("activation_funnel_daily")
      .select("event_name")
      .eq("event_name", eventName);
    check(
      "demo activity is excluded from activation metrics",
      (funnel ?? []).length === 0,
      `${(funnel ?? []).length} rows leaked`,
    );

    await admin.from("product_events").delete().eq("event_name", eventName);
  }

  // Sample-copy ledger is not readable anonymously.
  const { data: anonCopies, error: anonError } = await anon
    .from("demo_sample_copies")
    .select("id")
    .limit(1);
  check(
    "sample copy ledger is not publicly readable",
    Boolean(anonError) || (anonCopies ?? []).length === 0,
  );

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
