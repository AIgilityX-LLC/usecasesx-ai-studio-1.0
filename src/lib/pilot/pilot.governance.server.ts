/**
 * Launch governance (server-only): waiver grants, revocations and recorded
 * verdict snapshots.
 *
 * Every write runs through the caller's authenticated client, so the
 * admin-only policies on these tables are the security boundary, and every
 * action is mirrored into the pilot audit trail.
 */

import type { LaunchWaiver, PilotVerdictSnapshot, ReminderDispatch } from "./pilot.governance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWaiver(row: any): LaunchWaiver {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    scope: String(row.scope),
    reason: String(row.reason),
    approverName: String(row.approver_name),
    approverRole: String(row.approver_role),
    approvedBy: row.approved_by ?? null,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    revokedBy: row.revoked_by ?? null,
    revokeReason: row.revoke_reason ?? null,
    createdAt: String(row.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSnapshot(row: any): PilotVerdictSnapshot {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    verdict: String(row.verdict),
    headline: String(row.headline),
    freezeRecommended: Boolean(row.freeze_recommended),
    reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : [],
    invited: Number(row.invited ?? 0),
    registered: Number(row.registered ?? 0),
    checkpointAnswers: Number(row.checkpoint_answers ?? 0),
    p0Count: Number(row.p0_count ?? 0),
    p1Count: Number(row.p1_count ?? 0),
    evidenceGapState: row.evidence_gap_state ?? null,
    waiverId: row.waiver_id ?? null,
    recordedBy: row.recorded_by ?? null,
    createdAt: String(row.created_at),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDispatch(row: any): ReminderDispatch {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    invitationId: row.invitation_id ?? null,
    recipientEmail: String(row.recipient_email),
    kind: String(row.kind),
    channel: String(row.channel),
    status: String(row.status),
    detail: row.detail ?? null,
    windowDays: row.window_days ?? null,
    createdAt: String(row.created_at),
  };
}

export async function listWaivers(supabase: Client, cohort: string): Promise<LaunchWaiver[]> {
  const { data, error } = await supabase
    .from("pilot_rc_waivers")
    .select("*")
    .eq("cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapWaiver);
}

export async function listVerdictSnapshots(
  supabase: Client,
  cohort: string,
): Promise<PilotVerdictSnapshot[]> {
  const { data, error } = await supabase
    .from("pilot_verdict_snapshots")
    .select("*")
    .eq("cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSnapshot);
}

export async function listReminderDispatches(
  supabase: Client,
  cohort: string,
): Promise<ReminderDispatch[]> {
  const { data, error } = await supabase
    .from("pilot_reminder_dispatches")
    .select("*")
    .eq("cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDispatch);
}

export async function grantWaiver(
  supabase: Client,
  input: {
    cohort: string;
    scope: string;
    reason: string;
    approverName: string;
    approverRole: string;
    expiresAt: string | null;
    actorId: string;
  },
): Promise<LaunchWaiver> {
  const { data, error } = await supabase
    .from("pilot_rc_waivers")
    .insert({
      cohort: input.cohort,
      scope: input.scope,
      reason: input.reason,
      approver_name: input.approverName,
      approver_role: input.approverRole,
      approved_by: input.actorId,
      expires_at: input.expiresAt,
    })
    .select("*")
    .single();
  if (error) {
    // The partial unique index guarantees one active waiver per scope.
    if (error.code === "23505") {
      throw new Error("An active waiver already covers this scope. Revoke it before granting another.");
    }
    throw new Error(error.message);
  }
  const waiver = mapWaiver(data);
  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: waiver.cohort,
    action: "waiver.granted",
    reason: `${waiver.approverName} (${waiver.approverRole}): ${waiver.reason}`,
    actorId: input.actorId,
  });
  return waiver;
}

export async function revokeWaiver(
  supabase: Client,
  input: { id: string; reason: string | null; actorId: string },
): Promise<LaunchWaiver> {
  const { data, error } = await supabase
    .from("pilot_rc_waivers")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: input.actorId,
      revoke_reason: input.reason,
    })
    .eq("id", input.id)
    .is("revoked_at", null)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const waiver = mapWaiver(data);
  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: waiver.cohort,
    action: "waiver.revoked",
    reason: input.reason,
    actorId: input.actorId,
  });
  return waiver;
}

export async function recordVerdictSnapshot(
  supabase: Client,
  input: {
    cohort: string;
    verdict: string;
    headline: string;
    freezeRecommended: boolean;
    reasons: string[];
    invited: number;
    registered: number;
    checkpointAnswers: number;
    p0Count: number;
    p1Count: number;
    evidenceGapState: string | null;
    waiverId: string | null;
    actorId: string;
  },
): Promise<PilotVerdictSnapshot> {
  const { data, error } = await supabase
    .from("pilot_verdict_snapshots")
    .insert({
      cohort: input.cohort,
      verdict: input.verdict,
      headline: input.headline,
      freeze_recommended: input.freezeRecommended,
      reasons: input.reasons,
      invited: input.invited,
      registered: input.registered,
      checkpoint_answers: input.checkpointAnswers,
      p0_count: input.p0Count,
      p1_count: input.p1Count,
      evidence_gap_state: input.evidenceGapState,
      waiver_id: input.waiverId,
      recorded_by: input.actorId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const snapshot = mapSnapshot(data);
  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: snapshot.cohort,
    action: "verdict.recorded",
    toStatus: snapshot.verdict,
    reason: snapshot.headline,
    actorId: input.actorId,
  });
  return snapshot;
}