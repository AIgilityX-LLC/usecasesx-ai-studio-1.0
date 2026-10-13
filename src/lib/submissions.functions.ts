import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SubmissionInput,
  ReviewInput,
  SubmissionIdInput,
  REVIEW_ROLES,
  assertNotSelfReview,
} from "@/lib/submissions";
import { logDbFailure, logStep, newCorrelationId } from "@/lib/submissions.logging";
import { recordSubmissionAudit } from "@/lib/submissions.audit";

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
    const cid = newCorrelationId();
    logStep("saveSubmission.start", { cid, userId: context.userId, status: data.status });
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
        cid,
        userId: context.userId,
        status: data.status,
      });
    logStep("saveSubmission.ok", { cid, id: row.id, status: data.status, userId: context.userId });
    await recordSubmissionAudit(context.supabase, {
      eventType: data.status === "submitted" ? "submission.submitted" : "submission.draft_saved",
      submissionId: row.id,
      actorId: context.userId,
      correlationId: cid,
      next: { status: data.status, title: data.title },
    });
    return { id: row.id, status: data.status, correlationId: cid };
  });

/** Move one of the contributor's own drafts into the review queue. */
export const submitDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmissionIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const cid = newCorrelationId();
    const { error } = await context.supabase
      .from("use_case_submissions")
      .update({ status: "submitted" })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "draft");
    if (error)
      throw logDbFailure("submitDraft.update", error, {
        cid,
        id: data.id,
        userId: context.userId,
      });
    logStep("submitDraft.ok", { cid, id: data.id, userId: context.userId });
    await recordSubmissionAudit(context.supabase, {
      eventType: "submission.submitted",
      submissionId: data.id,
      actorId: context.userId,
      correlationId: cid,
      previous: { status: "draft" },
      next: { status: "submitted" },
    });
    return { ok: true, correlationId: cid };
  });

/** Delete one of the contributor's own drafts. */
export const deleteDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubmissionIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const cid = newCorrelationId();
    const { error } = await context.supabase
      .from("use_case_submissions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "draft");
    if (error)
      throw logDbFailure("deleteDraft.delete", error, {
        cid,
        id: data.id,
        userId: context.userId,
      });
    logStep("deleteDraft.ok", { cid, id: data.id, userId: context.userId });
    await recordSubmissionAudit(context.supabase, {
      eventType: "submission.draft_deleted",
      submissionId: data.id,
      actorId: context.userId,
      correlationId: cid,
      previous: { status: "draft" },
    });
    return { ok: true, correlationId: cid };
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
    const cid = newCorrelationId();
    logStep("review.start", { cid, submissionId: data.id, reviewer: userId, status: data.status });

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
        cid,
        submissionId: data.id,
        reviewer: userId,
      });
    if (!submission) throw new Error("Submission not found");

    // SoD: reviewer must not be the submitter (approve, reject, or in_review).
    assertNotSelfReview(submission.user_id as string, userId);

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
        cid,
        submissionId: data.id,
        reviewer: userId,
        status: data.status,
      });

    await recordSubmissionAudit(supabase, {
      eventType: "submission.status_changed",
      submissionId: data.id,
      actorId: userId,
      correlationId: cid,
      previous: { status: submission.status },
      next: { status: data.status, review_notes: data.reviewNotes ?? null },
      severity: data.status === "rejected" ? "notice" : "info",
    });

    if (data.status !== "approved" || !data.publish) {
      logStep("review.decision-only", {
        cid,
        submissionId: data.id,
        status: data.status,
        reviewer: userId,
      });
      return { published: null, correlationId: cid };
    }

    // Publishing is a privileged, audited write into the global repository.
    // `publish_use_case_submission` is SECURITY DEFINER and re-checks the
    // reviewer role in the database, so RLS on `use_cases` stays intact and
    // contributors can never publish their own drafts.
    const { data: published, error: pubErr } = await supabase.rpc("publish_use_case_submission", {
      _submission_id: data.id,
      _review_notes: data.reviewNotes ?? undefined,
    });
    if (pubErr)
      throw logDbFailure("publish_use_case_submission", pubErr, {
        cid,
        submissionId: data.id,
        reviewer: userId,
      });

    logStep("publish.ok", { cid, submissionId: data.id, published });
    const publishedRecord = published as { id: string; slug: string } | null;
    await recordSubmissionAudit(supabase, {
      eventType: "submission.published",
      submissionId: data.id,
      actorId: userId,
      correlationId: cid,
      previous: { status: submission.status },
      next: {
        status: "approved",
        use_case_id: publishedRecord?.id ?? null,
        slug: publishedRecord?.slug ?? null,
        review_notes: data.reviewNotes ?? null,
      },
    });
    return { published: publishedRecord, correlationId: cid };
  });
