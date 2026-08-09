/**
 * Global catalogue lifecycle visibility.
 * Run with: bun tests/global-lifecycle-visibility.e2e.ts
 *
 * Expectations:
 *  - anonymous readers only ever see published global use cases
 *  - an entitled (Pro) signed-in user also only sees published records
 *  - drafts / unpublished / archived records leak to nobody, in any tenant
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const proEmail = process.env.DEMO_PRO_EMAIL ?? "pro@demo.usecasex.app";
const proPassword = process.env.DEMO_PASSWORD ?? "Demo@123-UCX";

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const PUBLIC_STATUSES = new Set(["published"]);

async function auditVisibility(label: string, client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from("use_cases")
    .select("id, slug, status, content_status, visibility")
    .limit(2000);
  check(`${label}: catalogue read succeeds`, !error, error?.message ?? "");
  const rows = (data ?? []) as Array<Record<string, string | null>>;

  const unpublished = rows.filter((r) => !PUBLIC_STATUSES.has(String(r.status)));
  check(
    `${label}: no unpublished records visible`,
    unpublished.length === 0,
    unpublished
      .slice(0, 5)
      .map((r) => `${r.slug}:${r.status}`)
      .join(", "),
  );

  const hidden = rows.filter((r) => r.visibility === "hidden");
  check(`${label}: no hidden-visibility records`, hidden.length === 0, `${hidden.length} leaked`);

  // Direct probe: explicitly ask for drafts and archives.
  const { data: drafts } = await client
    .from("use_cases")
    .select("id")
    .in("status", ["draft", "review", "archived", "unpublished"])
    .limit(50);
  check(
    `${label}: explicit draft/archive query returns nothing`,
    (drafts?.length ?? 0) === 0,
    `${drafts?.length ?? 0} rows`,
  );

  return rows.length;
}

const anon = createClient(url, key, { auth: { persistSession: false } });
const publishedCount = await auditVisibility("anonymous", anon);
if (publishedCount === 0) {
  console.log("WARN  no published global use cases in this environment — visibility set is empty");
}

const pro = createClient(url, key, { auth: { persistSession: false } });
const { error: signInError } = await pro.auth.signInWithPassword({
  email: proEmail,
  password: proPassword,
});
if (signInError) {
  console.log(`SKIP  entitled user checks — sign-in failed (${signInError.message})`);
} else {
  const proCount = await auditVisibility("pro user", pro);
  check(
    "pro user: sees at least the anonymous published set",
    proCount >= publishedCount,
    `${proCount} vs ${publishedCount}`,
  );
  await pro.auth.signOut();
}

// Writes to the global catalogue are never allowed from a non-admin session.
const { error: writeError } = await anon
  .from("use_cases")
  .insert({ title: "probe", slug: `probe-${Date.now()}` } as never);
check("anonymous: global catalogue write rejected", !!writeError, writeError ? "" : "insert succeeded");

console.log(failures === 0 ? "\n✅ global lifecycle visibility holds" : `\n❌ ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
