/**
 * Launch-corpus publishing gate.
 * Run with: bun tests/launch-corpus-quality.e2e.ts
 *
 * Proves that:
 *  - the database trigger blocks publishing a record with no provenance label
 *  - the database trigger blocks publishing a record that failed the quality gate
 *  - the record only becomes publicly discoverable once it carries a provenance
 *    label AND `quality_passed`
 *  - the shared quality gate used by the admin QA action agrees with the trigger
 */
import { createClient } from "@supabase/supabase-js";
import { evaluateQualityGate, type QaRecord } from "../src/lib/admin/corpus-quality";

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

const slug = `qa-gate-probe-${Date.now()}`;
const LONG = "A".repeat(80);

async function main() {
  // 1. Draft with no provenance and no quality check.
  const { data: created, error: createError } = await admin
    .from("use_cases")
    .insert({
      slug,
      title: "QA gate probe",
      summary: `${LONG} summary`,
      business_problem: `${LONG} problem`,
      ai_solution_concept: `${LONG} solution`,
      implementation_notes: `${LONG} implementation`,
      status: "draft",
      visibility: "free_lite",
      provenance: "unspecified",
      quality_status: "unverified",
    })
    .select("id")
    .single();
  check("draft insert without provenance succeeds", !createError, createError?.message ?? "");
  if (!created) {
    process.exit(1);
  }
  const id = created.id as string;

  try {
    // 2. Publishing with no provenance must be blocked by the trigger.
    const noProvenance = await admin
      .from("use_cases")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", id);
    check(
      "publish blocked without provenance",
      !!noProvenance.error,
      noProvenance.error?.message ?? "update unexpectedly succeeded",
    );

    // 3. Provenance set but quality gate not passed — still blocked.
    await admin.from("use_cases").update({ provenance: "aigilityx_editorial" }).eq("id", id);
    const notPassed = await admin
      .from("use_cases")
      .update({ status: "published", quality_status: "needs_review" })
      .eq("id", id);
    check(
      "publish blocked when quality gate not passed",
      !!notPassed.error,
      notPassed.error?.message ?? "update unexpectedly succeeded",
    );

    // 4. Still invisible to the public.
    const hidden = await anon.from("use_cases").select("id").eq("slug", slug);
    check("unpublished record is not publicly discoverable", (hidden.data?.length ?? 0) === 0);

    // 5. Shared gate (used by the admin QA action) agrees with the trigger.
    const { data: preRow } = await admin
      .from("use_cases")
      .select("*")
      .eq("id", id)
      .single();
    const preResult = evaluateQualityGate(preRow as unknown as QaRecord);
    check(
      "shared quality gate marks the record as failing",
      !preResult.passes,
      preResult.issues.map((i) => i.code).join(", "),
    );

    // 6. Pass the gate, then publish.
    const published = await admin
      .from("use_cases")
      .update({
        quality_status: "quality_passed",
        quality_checked_at: new Date().toISOString(),
        provenance_note: "Synthetic QA probe record",
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", id);
    check("publish succeeds once provenance + quality pass", !published.error, published.error?.message ?? "");

    const { data: postRow } = await admin.from("use_cases").select("*").eq("id", id).single();
    const postResult = evaluateQualityGate(postRow as unknown as QaRecord);
    check("shared quality gate marks the published record as passing", postResult.passes,
      postResult.issues.map((i) => i.code).join(", "));

    const visible = await anon.from("use_cases").select("id, provenance, quality_status").eq("slug", slug);
    check("published record is publicly discoverable", (visible.data?.length ?? 0) === 1);
    check(
      "public record carries a provenance label and passed quality",
      visible.data?.[0]?.provenance === "aigilityx_editorial" &&
        visible.data?.[0]?.quality_status === "quality_passed",
    );

    // 7. Regressing provenance on a published record must be rejected.
    const regress = await admin
      .from("use_cases")
      .update({ provenance: "unspecified" })
      .eq("id", id);
    check(
      "provenance cannot be removed while published",
      !!regress.error,
      regress.error?.message ?? "update unexpectedly succeeded",
    );
  } finally {
    await admin.from("use_cases").delete().eq("id", id);
  }

  console.log(failures === 0 ? "\n✅ launch-corpus quality gate holds" : `\n❌ ${failures} failure(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
