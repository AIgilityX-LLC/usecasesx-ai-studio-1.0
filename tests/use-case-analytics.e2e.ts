/** Verifies create/save/edit/delete lifecycle analytics are accepted and attributable during E2E. */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Missing analytics test credentials");
const client = createClient(url, anonKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const runId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const expected = ["use_case_created", "use_case_saved", "use_case_edited", "use_case_deleted"];

async function main() {
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app",
    password: process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123",
  });
  if (error || !data.user) throw error ?? new Error("Analytics actor sign-in failed");

  try {
    for (const cta of expected) {
      const { error: insertError } = await client.from("cta_events").insert({
        cta,
        user_id: data.user.id,
        source_page: "/e2e/launch-readiness",
        session_id: runId,
      });
      if (insertError) throw insertError;
    }
    const { data: events, error: readError } = await admin
      .from("cta_events")
      .select("cta, user_id, session_id")
      .eq("session_id", runId)
      .order("created_at");
    if (readError) throw readError;
    const names = new Set((events ?? []).map((event) => event.cta));
    for (const name of expected)
      if (!names.has(name)) throw new Error(`Missing analytics event: ${name}`);
    if (events?.some((event) => event.user_id !== data.user.id))
      throw new Error("Analytics event attribution mismatch");
    console.log(`✓ lifecycle events persisted: ${expected.join(", ")}`);
  } finally {
    await admin.from("cta_events").delete().eq("session_id", runId);
    await client.auth.signOut();
  }
}

main()
  .then(() => console.log("\n✅ Use case analytics passed."))
  .catch((error) => {
    console.error("\n❌ Use case analytics failed:", error.message);
    process.exit(1);
  });
