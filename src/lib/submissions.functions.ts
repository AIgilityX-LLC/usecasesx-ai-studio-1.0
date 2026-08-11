import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SubmissionInput, ReviewInput, SubmissionIdInput, REVIEW_ROLES } from "@/lib/submissions";
import { logDbFailure, logStep } from "@/lib/submissions.logging";

/** Submissions owned by the signed-in contributor, newest first. */
export const listMySubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("use_case_submissions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Everything the contributor has in flight: their own submissions in every
 * state, plus the repository records their approved submissions became. The
 * published half is matched on `submitted_by`, so it survives edits made by
 * reviewers after publication.
 */
export const listMyContributions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [submissions, published] = await Promise.all([
      supabase
        .from("use_case_submissions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("use_cases")
        .select("id, slug, title, summary, status, published_at, provenance")
        .eq("submitted_by", userId)
        .order("published_at", { ascending: false, nullsFirst: false }),
    ]);
    if (submissions.error) throw new Error(submissions.error.message);
    if (published.error) throw new Error(published.error.message);
    return { submissions: submissions.data ?? [], published: published.data ?? [] };
  });

/** Create a draft or a submitted contribution. Ownership always comes from the token. */
export const saveSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmissionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("use_case_submissions")
      .insert({
        user_id: context.userId,
        title: data.title,
        summary: data.summary,
        business_problem: data.businessProblem,
        ai_solution: data.aiSolution,
        industry: data.industry ?? null,
        sector: data.sector ?? null,
        tags: data.tags,
        sources: data.sources,
        status: data.status,
      })
      .select("id")
      .single();
    if (error)
      throw logDbFailure("saveSubmission.insert", error, {
        userId: context.userId,
        status: data.status,
      });
    logStep("saveSubmission.ok", { id: row.id, status: data.status, userId: context.userId });
    return { id: row.id, status: data.status };
  });

/** Move one of the contributor's own drafts into the review queue. */
export const submitDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmissionIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("use_case_submissions")
      .update({ status: "submitted" })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "draft");
    if (error)
      throw logDbFailure("submitDraft.update", error, { id: data.id, userId: context.userId });
    logStep("submitDraft.ok", { id: data.id, userId: context.userId });
    return { ok: true };
  });

/** Delete one of the contributor's own drafts. */
export const deleteDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmissionIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("use_case_submissions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Reviewer decision. Approving also publishes the contribution into the global
 * repository (provenance `community_contribution`), so approval is a single,
 * auditable action instead of a manual re-entry.
 */
export const reviewSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Authorize against server-side roles, never the client.
    const roleChecks = await Promise.all(
      REVIEW_ROLES.map((role) => supabase.rpc("has_role", { _user_id: userId, _role: role })),
    );
    if (!roleChecks.some((r) => r.data === true)) throw new Error("Forbidden");

    const { data: submission, error: readErr } = await supabase
      .from("use_case_submissions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr)
      throw logDbFailure("reviewSubmission.read", readErr, {
        submissionId: data.id,
        reviewer: userId,
      });
    if (!submission) throw new Error("Submission not found");

    const { error } = await supabase
      .from("use_case_submissions")
      .update({
        status: data.status,
        review_notes: data.reviewNotes,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error)
      throw logDbFailure("reviewSubmission.update", error, {
        submissionId: data.id,
        reviewer: userId,
        status: data.status,
      });

    if (data.status !== "approved" || !data.publish) {
      logStep("review.decision-only", {
        submissionId: data.id,
        status: data.status,
        reviewer: userId,
      });
      return { published: null };
    }

    // Publishing is a privileged, audited write into the global repository.
    // `publish_use_case_submission` is SECURITY DEFINER and re-checks the
    // reviewer role in the database, so RLS on `use_cases` stays intact and
    // contributors can never publish their own drafts.
    const { data: published, error: pubErr } = await supabase.rpc("publish_use_case_submission", {
      _submission_id: data.id,
      _review_notes: data.reviewNotes ?? null,
    });
    if (pubErr)
      throw logDbFailure("publish_use_case_submission", pubErr, {
        submissionId: data.id,
        reviewer: userId,
      });

    logStep("publish.ok", { submissionId: data.id, published });
    return { published: published as { id: string; slug: string } | null };
  });
