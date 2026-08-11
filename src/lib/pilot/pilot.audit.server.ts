/**
 * Pilot audit trail (server-only).
 *
 * Append-only: every invitation creation, account link, status transition and
 * invitation pause/resume is recorded with the actor, the timestamp, the status
 * it moved from and to, and the reason when one was given. Writes go through
 * the service client because the table intentionally grants no INSERT to
 * signed-in users; reads run on the caller's client so only platform admins
 * (per RLS) can see the trail.
 */

import type { PilotAuditEvent } from "./pilot.model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const AUDIT_LIMIT = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAudit(row: any): PilotAuditEvent {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    invitationId: row.invitation_id ?? null,
    subjectEmail: row.subject_email ?? null,
    subjectUserId: row.subject_user_id ?? null,
    action: String(row.action),
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status ?? null,
    reason: row.reason ?? null,
    actorId: row.actor_id ?? null,
    actorKind: String(row.actor_kind ?? "admin"),
    createdAt: String(row.created_at),
  };
}

export type PilotAuditInput = {
  cohort: string;
  invitationId?: string | null;
  subjectEmail?: string | null;
  subjectUserId?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  actorId?: string | null;
  actorKind?: "admin" | "participant" | "system";
  metadata?: Record<string, unknown>;
};

/** Records one pilot action. Never throws into the caller's flow. */
export async function writePilotAudit(input: PilotAuditInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pilot_audit_events").insert({
      cohort: input.cohort,
      invitation_id: input.invitationId ?? null,
      subject_email: input.subjectEmail ?? null,
      subject_user_id: input.subjectUserId ?? null,
      action: input.action,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      reason: input.reason ?? null,
      actor_id: input.actorId ?? null,
      actor_kind: input.actorKind ?? "admin",
      metadata: input.metadata ?? {},
    } as never);
    if (error) console.error("[pilot-audit] write failed", error.message);
  } catch (error) {
    console.error(
      "[pilot-audit] write failed",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

export async function listPilotAudit(
  supabase: Client,
  cohort: string,
): Promise<PilotAuditEvent[]> {
  const { data, error } = await supabase
    .from("pilot_audit_events")
    .select("*")
    .eq("cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(AUDIT_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAudit);
}
