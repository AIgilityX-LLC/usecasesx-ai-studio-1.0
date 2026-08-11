/**
 * Submission lifecycle integration test:
 *   contributor drafts → submits for review → reviewer approves & publishes
 *   → the row appears in `use_cases` and is publicly readable.
 * Also asserts the contributor cannot publish their own submission.
 *
 * Uses the seeded demo accounts (pro@ = contributor, admin@ = reviewer).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const contributorEmail = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";
const reviewerEmail = process.env.SMOKE_ADMIN_EMAIL ?? "admin@demo.usecasex.app";
const marker = `SUBMIT-${Date.now()}`;

async function signIn(email: string) {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`);
  return { client, userId: data.user.id };
}

const checks: string[] = [];
function assert(label: string, condition: unknown) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks.push(label);
}

async function main() {
  const contributor = await signIn(contributorEmail);
  const reviewer = await signIn(reviewerEmail);

  // 1. Draft
  const { data: draft, error: draftErr } = await contributor.client
    .from("use_case_submissions")
    .insert({
      user_id: contributor.userId,
      title: `${marker} automated contribution`,
      summary: "Integration test submission covering the publish pipeline.",
      business_problem: "Reviewers had to re-enter approved community submissions by hand.",
      ai_solution: "Approval publishes the record through an audited database routine.",
      industry: "Public Sector",
      tags: ["integration-test"],
      sources: ["https://example.org/evidence"],
      status: "draft",
    })
    .select("id, status")
    .single();
  if (draftErr) throw draftErr;
  assert("contributor can create a draft", draft.status === "draft");

  // 2. Submit for review
  const { error: submitErr } = await contributor.client
    .from("use_case_submissions")
    .update({ status: "submitted" })
    .eq("id", draft.id)
    .eq("user_id", contributor.userId);
  if (submitErr) throw submitErr;

  // 3. Contributor must NOT be able to publish
  const selfPublish = await contributor.client.rpc("publish_use_case_submission", {
    _submission_id: draft.id,
  });
  assert("contributor cannot publish their own submission", selfPublish.error !== null);

  // 4. Reviewer approves
  const { error: approveErr } = await reviewer.client
    .from("use_case_submissions")
    .update({
      status: "approved",
      review_notes: "Approved by integration test.",
      reviewed_by: reviewer.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", draft.id);
  if (approveErr) throw approveErr;

  // 5. Reviewer publishes through the security-definer routine (no RLS error)
  const { data: publishedRaw, error: publishErr } = await reviewer.client.rpc(
    "publish_use_case_submission",
    { _submission_id: draft.id, _review_notes: "Published by integration test." },
  );
  if (publishErr) throw publishErr;
  const published = publishedRaw as { id: string; slug: string };
  assert("publish returns an id + slug", Boolean(published?.id && published?.slug));

  // 6. Row exists in use_cases and is publicly readable
  const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data: publicRow, error: publicErr } = await anon
    .from("use_cases")
    .select("id, slug, title, status, provenance, submitted_by")
    .eq("id", published.id)
    .maybeSingle();
  if (publicErr) throw publicErr;
  assert("published row is readable anonymously", Boolean(publicRow));
  assert("status is published", publicRow!.status === "published");
  assert("provenance is community_contribution", publicRow!.provenance === "community_contribution");
  assert("authorship stays with the contributor", publicRow!.submitted_by === contributor.userId);

  // Cleanup: drop the test artefacts with the reviewer's privileges.
  await reviewer.client.from("use_cases").delete().eq("id", published.id);
  await reviewer.client.from("use_case_submissions").delete().eq("id", draft.id);

  console.log(`✓ submission → review → approve → publish verified (${checks.length} checks)`);
  for (const c of checks) console.log(`  • ${c}`);
}

main().catch((error) => {
  console.error("✗ submission publish flow failed:", error?.message ?? error);
  process.exit(1);
});
