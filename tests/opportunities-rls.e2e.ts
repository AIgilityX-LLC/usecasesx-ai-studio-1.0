/**
 * Opportunity isolation:
 *   • an anonymous client cannot insert or read opportunities
 *   • two demo users each capture an opportunity and cannot see or mutate the
 *     other's row
 * Uses the seeded demo accounts (see src/lib/demo-accounts.functions.ts).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const emailA = process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app";
const emailB = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";
const marker = `OPP-${Date.now()}`;

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

async function capture(user: Awaited<ReturnType<typeof signIn>>, label: string) {
  const { data: workspaceId, error: wsErr } = await user.client.rpc("ensure_user_workspace");
  if (wsErr) throw wsErr;
  const { data, error } = await user.client
    .from("opportunities")
    .insert({
      title: `${marker} ${label}`,
      workspace_id: workspaceId as string,
      user_id: user.userId,
      status: "signal",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const { error: anonInsert } = await anon
  .from("opportunities")
  .insert({ title: `${marker} anon` })
  .select("id");
check("anonymous insert is rejected", !!anonInsert);

const { data: anonRows } = await anon.from("opportunities").select("id").limit(1);
check("anonymous read returns nothing", !anonRows || anonRows.length === 0);

const a = await signIn(emailA);
const b = await signIn(emailB);
const idA = await capture(a, "A");
const idB = await capture(b, "B");

const { data: aSeesB } = await a.client.from("opportunities").select("id").eq("id", idB);
check("user A cannot read user B's opportunity", !aSeesB || aSeesB.length === 0);

const { data: bSeesA } = await b.client.from("opportunities").select("id").eq("id", idA);
check("user B cannot read user A's opportunity", !bSeesA || bSeesA.length === 0);

const { data: updated } = await a.client
  .from("opportunities")
  .update({ title: `${marker} hijacked` })
  .eq("id", idB)
  .select("id");
check("user A cannot mutate user B's opportunity", !updated || updated.length === 0);

const { data: own } = await a.client.from("opportunities").select("id").eq("id", idA);
check("user A can read their own opportunity", !!own && own.length === 1);

await a.client.from("opportunities").delete().eq("id", idA);
await b.client.from("opportunities").delete().eq("id", idB);

if (failures.length) {
  console.error(`\n✗ ${failures.length} opportunity isolation check(s) failed.`);
  process.exit(1);
}
console.log("\n✅ Opportunity isolation verified.");
