/**
 * V2-05 evidence RLS denial — requires migration applied + demo accounts.
 * Run: bun run tests/v2-05-evidence-rls.e2e.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const emailA = process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app";
const emailB = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";
const marker = `EV-${Date.now()}`;

const failures: string[] = [];
function check(label: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures.push(label);
}

async function signIn(email: string) {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`);
  return { client, userId: data.user.id };
}

async function tableReady(client: ReturnType<typeof createClient>) {
  const { error } = await client.from("evidence_items").select("id").limit(1);
  if (error && /does not exist|schema cache|Could not find/i.test(error.message)) {
    console.warn(`⏭ skip: evidence_items missing — apply V2-05 migration (${error.message})`);
    return false;
  }
  return true;
}

async function workspace(user: Awaited<ReturnType<typeof signIn>>) {
  const { data, error } = await user.client.rpc("ensure_user_workspace");
  if (error) throw error;
  return data as string;
}

try {
  const a = await signIn(emailA);
  const b = await signIn(emailB);
  if (!(await tableReady(a.client))) process.exit(0);

  const wsA = await workspace(a);
  const wsB = await workspace(b);
  const subjectA = crypto.randomUUID();
  const subjectB = crypto.randomUUID();

  const { data: rowA, error: insErr } = await a.client
    .from("evidence_items")
    .insert({
      workspace_id: wsA,
      subject_type: "use_case",
      subject_id: subjectA,
      kind: "note",
      label: `${marker} A`,
      note: "Tenant A note — should not leak",
      created_by: a.userId,
      confidentiality: "internal",
    })
    .select("id")
    .single();
  check("user A can insert evidence in own workspace", !insErr && !!rowA?.id);

  await b.client.from("evidence_items").insert({
    workspace_id: wsB,
    subject_type: "use_case",
    subject_id: subjectB,
    kind: "note",
    label: `${marker} B`,
    note: "Tenant B",
    created_by: b.userId,
    confidentiality: "internal",
  });

  const { data: aSeesB } = await a.client
    .from("evidence_items")
    .select("id")
    .eq("subject_id", subjectB);
  check("user A cannot read B evidence", !aSeesB || aSeesB.length === 0);

  const { data: hijack } = await a.client
    .from("evidence_items")
    .update({ label: "hijacked" })
    .eq("subject_id", subjectB)
    .select("id");
  check("user A cannot mutate B evidence", !hijack || hijack.length === 0);

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: anonRows } = await anon.from("evidence_items").select("id").limit(1);
  check("anonymous cannot read evidence", !anonRows || anonRows.length === 0);

  if (failures.length) {
    console.error(`\n❌ V2-05 evidence RLS failed: ${failures.length}`);
    process.exit(1);
  }
  console.log("\n✅ V2-05 evidence RLS denials passed.");
} catch (e) {
  console.error(e);
  process.exit(1);
}
