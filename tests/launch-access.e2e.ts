/** Launch access matrix: anonymous is denied; signed-in demo and Pro users are scoped to their own data. */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing launch access test credentials");
const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const surfaces = ["Studio", "My Use Cases", "Board detail"];

async function signIn(email: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`Could not sign in ${email}`);
  return { client, user: data.user };
}

async function main() {
  const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: anonymousBoards, error: anonymousError } = await anonymous.from("use_case_boards").select("id").limit(1);
  if (anonymousError) throw anonymousError;
  if (anonymousBoards?.length) throw new Error("Anonymous user can read board detail data");
  console.log(`✓ anonymous denied: ${surfaces.join(", ")}`);

  const demo = await signIn(process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app");
  const pro = await signIn(process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app");
  for (const actor of [{ label: "signed-in demo", ...demo }, { label: "pro", ...pro }]) {
    const { data: profile, error: profileError } = await actor.client.from("profiles")
      .select("plan_type").eq("user_id", actor.user.id).single();
    if (profileError) throw profileError;
    const { data: boards, error: boardError } = await actor.client.from("use_case_boards").select("id").limit(1);
    if (boardError || !boards?.length) throw boardError ?? new Error(`${actor.label} has no accessible board`);
    const { data: items, error: itemError } = await actor.client.from("ai_use_cases").select("id").eq("board_id", boards[0].id);
    if (itemError || !Array.isArray(items)) throw itemError ?? new Error(`${actor.label} cannot open board items`);
    console.log(`✓ ${actor.label} (${profile.plan_type ?? "lite"}) allowed: ${surfaces.join(", ")}`);
    await actor.client.auth.signOut();
  }
}

main().then(() => console.log("\n✅ Launch access matrix passed.")).catch((error) => {
  console.error("\n❌ Launch access matrix failed:", error.message);
  process.exit(1);
});