import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SubmissionInput,
  ReviewInput,
  SubmissionIdInput,
  slugifyTitle,
  REVIEW_ROLES,
} from "@/lib/submissions";

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
    if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
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
    if (readErr) throw new Error(readErr.message);
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
    if (error) throw new Error(error.message);

    if (data.status !== "approved" || !data.publish) return { published: null };

    // Publish: derive a unique slug, then link the declared industry when it
    // matches a canonical taxonomy term.
    const base = slugifyTitle(submission.title);
    let slug = base;
    for (let attempt = 2; attempt <= 20; attempt += 1) {
      const { data: clash } = await supabase
        .from("use_cases")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${attempt}`;
    }

    const { data: published, error: pubErr } = await supabase
      .from("use_cases")
      .insert({
        slug,
        title: submission.title,
        summary: submission.summary ?? submission.title,
        business_problem: submission.business_problem,
        ai_solution_concept: submission.ai_solution,
        problem: submission.business_problem,
        solution: submission.ai_solution,
        evidence_urls: submission.sources ?? [],
        submitted_by: submission.user_id,
        status: "published",
        content_status: "published",
        visibility: "both",
        provenance: "community_contribution",
        provenance_note: `Community submission reviewed by ${userId}`,
        quality_status: "quality_passed",
        quality_checked_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .select("id, slug")
      .single();
    if (pubErr) throw new Error(pubErr.message);

    if (submission.industry) {
      const { data: industry } = await supabase
        .from("industries")
        .select("id")
        .or(`slug.eq.${slugifyTitle(submission.industry)},name.eq.${submission.industry}`)
        .maybeSingle();
      if (industry)
        await supabase
          .from("use_case_industries")
          .insert({ use_case_id: published.id, industry_id: industry.id });
    }

    return { published };
  });
