import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REVIEW_ROLES } from "@/lib/submissions";
import { buildAuditRows, type SubmissionAuditRow } from "@/lib/submissions.audit.map";

/**
 * Admin-tier read of the submission lifecycle trail: status changes, reviewer
 * notes, who approved what, and the correlation ID tying one flow together.
 */
export const listSubmissionAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        correlationId: z.string().trim().max(64).optional(),
        limit: z.number().int().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: SubmissionAuditRow[] }> => {
    const { supabase, userId } = context;

    const roleChecks = await Promise.all(
      REVIEW_ROLES.map((role) => supabase.rpc("has_role", { _user_id: userId, _role: role })),
    );
    if (!roleChecks.some((r) => r.data === true)) throw new Error("Forbidden");

    const limit = Math.min(Math.max(data.limit ?? 200, 1), 500);
    let query = supabase
      .from("audit_events")
      .select(
        "id, created_at, event_type, entity_type, entity_id, actor_id, previous_value, new_value, request_id",
      )
      .in("entity_type", ["use_case_submission", "use_case"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data.correlationId) query = query.eq("request_id", data.correlationId);

    const { data: events, error } = await query;
    if (error) throw new Error(error.message);
    const lifecycle = (events ?? []).filter(
      (e) =>
        e.entity_type === "use_case_submission" ||
        e.event_type === "use_case.published_from_submission",
    );

    const submissionIds = [
      ...new Set(
        lifecycle.flatMap((e) => {
          const nv = (e.new_value ?? {}) as { submission_id?: string };
          return [e.entity_type === "use_case_submission" ? e.entity_id : nv.submission_id].filter(
            (x): x is string => typeof x === "string",
          );
        }),
      ),
    ];
    const actorIds = [...new Set(lifecycle.map((e) => e.actor_id).filter((x): x is string => !!x))];

    const [subs, actors] = await Promise.all([
      submissionIds.length
        ? supabase
            .from("use_case_submissions")
            .select("id, title, status, review_notes, reviewed_by")
            .in("id", submissionIds)
        : Promise.resolve({ data: [], error: null }),
      actorIds.length
        ? supabase.from("profiles").select("user_id, full_name, email").in("user_id", actorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    return {
      rows: buildAuditRows(lifecycle, subs.data ?? [], actors.data ?? []),
    };
  });
