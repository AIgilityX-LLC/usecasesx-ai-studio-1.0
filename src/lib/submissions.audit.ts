/**
 * Append-only audit trail for the submission → review → publish lifecycle.
 *
 * Rows land in `public.audit_events`; `request_id` carries the per-request
 * correlation ID so every step of one flow can be grouped together. Admin-tier
 * users read the trail; contributors only ever see their own rows (existing RLS).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SubmissionStatus } from "@/lib/submissions";

export const SUBMISSION_ENTITY = "use_case_submission";

export type SubmissionAuditEventType =
  | "submission.draft_saved"
  | "submission.submitted"
  | "submission.draft_deleted"
  | "submission.status_changed"
  | "submission.published";

export interface SubmissionAuditInput {
  eventType: SubmissionAuditEventType;
  submissionId: string;
  actorId: string;
  correlationId: string;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  severity?: "info" | "notice" | "warning";
}

/**
 * Best-effort write: a failed audit insert must never roll back or block the
 * user-facing action, but it is logged so the gap is visible.
 */
export async function recordSubmissionAudit(
  supabase: SupabaseClient<Database>,
  input: SubmissionAuditInput,
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    actor_id: input.actorId,
    entity_type: SUBMISSION_ENTITY,
    entity_id: input.submissionId,
    event_type: input.eventType,
    previous_value: (input.previous ?? null) as never,
    new_value: (input.next ?? null) as never,
    request_id: input.correlationId,
    severity: input.severity ?? "info",
    source: "submissions",
  });
  if (error) {
    console.error(
      `[submissions] [cid=${input.correlationId}] audit.write FAILED`,
      JSON.stringify({ eventType: input.eventType, message: error.message, code: error.code }),
    );
  }
}

/** One row as rendered by the admin audit page. */
export interface SubmissionAuditRow {
  id: string;
  createdAt: string;
  eventType: string;
  correlationId: string | null;
  submissionId: string | null;
  submissionTitle: string | null;
  actorId: string | null;
  actorName: string | null;
  fromStatus: SubmissionStatus | null;
  toStatus: SubmissionStatus | null;
  reviewNotes: string | null;
  publishedSlug: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  "submission.draft_saved": "Draft saved",
  "submission.submitted": "Submitted for review",
  "submission.draft_deleted": "Draft deleted",
  "submission.status_changed": "Status changed",
  "submission.published": "Published to repository",
  "use_case.published_from_submission": "Repository record created",
};

export function auditEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}
