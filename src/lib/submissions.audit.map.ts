/** Pure mapping from raw `audit_events` rows to the admin audit table shape. */
import type { SubmissionStatus } from "@/lib/submissions";
import type { SubmissionAuditRow } from "@/lib/submissions.audit";

export type { SubmissionAuditRow };

interface RawEvent {
  id: string;
  created_at: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  previous_value: unknown;
  new_value: unknown;
  request_id: string | null;
}

interface RawSubmission {
  id: string;
  title: string;
  status: string;
  review_notes: string | null;
  reviewed_by: string | null;
}

interface RawProfile {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const asStatus = (v: unknown): SubmissionStatus | null =>
  typeof v === "string" && ["draft", "submitted", "in_review", "approved", "rejected"].includes(v)
    ? (v as SubmissionStatus)
    : null;

const asText = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export function buildAuditRows(
  events: RawEvent[],
  submissions: RawSubmission[],
  profiles: RawProfile[],
): SubmissionAuditRow[] {
  const subById = new Map(submissions.map((s) => [s.id, s]));
  const nameById = new Map(
    profiles.map((p) => [p.user_id ?? "", p.full_name?.trim() || p.email || null]),
  );

  return events.map((e) => {
    const prev = asRecord(e.previous_value);
    const next = asRecord(e.new_value);
    const submissionId =
      e.entity_type === "use_case_submission"
        ? e.entity_id
        : (asText(next["submission_id"]) ?? null);
    const sub = submissionId ? subById.get(submissionId) : undefined;
    return {
      id: e.id,
      createdAt: e.created_at,
      eventType: e.event_type,
      correlationId: e.request_id,
      submissionId: submissionId ?? null,
      submissionTitle: sub?.title ?? asText(next["title"]),
      actorId: e.actor_id,
      actorName: (e.actor_id && nameById.get(e.actor_id)) || null,
      fromStatus: asStatus(prev["status"]),
      toStatus: asStatus(next["status"]),
      reviewNotes: asText(next["review_notes"]) ?? sub?.review_notes ?? null,
      publishedSlug: asText(next["slug"]),
    };
  });
}
