/**
 * Automated evidence-gap reminder emails (server-only).
 *
 * When the evidence-gap watchdog is open, the cohort needs a nudge outside the
 * app: unclaimed seats need to be claimed, registered participants need to
 * answer a checkpoint. This module decides *who* should be emailed for the
 * current window, records one ledger row per recipient per window, and hands
 * the message to the sender.
 *
 * Idempotency is the ledger's job: `idempotency_key` is unique, so re-running
 * the sweep inside the same window cannot email anyone twice.
 *
 * Delivery requires a verified sender domain. Until one is configured the
 * ledger records `blocked_no_sender_domain` with the reason, so admins see the
 * exact backlog instead of silently missing nudges.
 */

import type { EvidenceGapAlert } from "./pilot.triage";
import type { PilotInvitation } from "./pilot.model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export type GapEmailPlanRow = {
  email: string;
  invitationId: string | null;
  kind: "evidence_gap_claim_seat" | "evidence_gap_answer_checkpoint";
  subject: string;
  body: string;
};

export type GapEmailResult = {
  state: EvidenceGapAlert["state"];
  triggered: boolean;
  windowKey: string;
  planned: number;
  sent: number;
  blocked: number;
  alreadySent: number;
  failed: number;
  /** Set when nothing could be sent, so the caller can explain why. */
  blockedReason: string | null;
};

/** Window bucket: one nudge per recipient per watchdog window, not per run. */
export function windowKey(now: Date, windowDays: number): string {
  const bucket = Math.floor(now.getTime() / (Math.max(1, windowDays) * 24 * 60 * 60 * 1000));
  return `w${windowDays}-${bucket}`;
}

/** Who to nudge for the current gap state. Pure decision over invitations. */
export function planGapEmails(
  gap: EvidenceGapAlert,
  input: {
    invitations: readonly PilotInvitation[];
    answeredUserIds: ReadonlySet<string>;
  },
): GapEmailPlanRow[] {
  const active = input.invitations.filter((invitation) => invitation.status !== "revoked");

  if (gap.state === "no_registrations") {
    return active
      .filter((invitation) => !invitation.userId)
      .map((invitation) => ({
        email: invitation.email,
        invitationId: invitation.id,
        kind: "evidence_gap_claim_seat" as const,
        subject: "Your UseCasesX pilot seat is still waiting",
        body:
          `Your pilot seat has not been claimed yet. Register with this email address and open the ` +
          `pilot mission page to start — the first step takes a few minutes.`,
      }));
  }

  if (gap.state === "no_answers") {
    return active
      .filter((invitation) => invitation.userId && !input.answeredUserIds.has(invitation.userId))
      .map((invitation) => ({
        email: invitation.email,
        invitationId: invitation.id,
        kind: "evidence_gap_answer_checkpoint" as const,
        subject: "Two minutes to answer your pilot checkpoint",
        body:
          `You are enrolled in the pilot but have not answered a checkpoint yet. Your answers are ` +
          `the evidence the release decision rests on — please complete one checkpoint.`,
      }));
  }

  // "no_invitations" needs an admin to issue seats; "none" needs nothing.
  return [];
}

type DeliveryOutcome = { delivered: boolean; reason: string };

/**
 * Hands one message to the configured sender.
 *
 * Email delivery needs a verified sender domain. Until one is configured there
 * is no address these reminders could legitimately come from, so the attempt is
 * recorded as blocked with the reason rather than faked. Once the sender domain
 * and its reminder template exist, this is the single place delivery is wired.
 */
async function deliver(_row: GapEmailPlanRow): Promise<DeliveryOutcome> {
  return Promise.resolve({
    delivered: false,
    reason:
      "No verified sender domain is configured, so no reminder email was sent. " +
      "The nudge is queued in the dispatch log and the participant still sees it in the app.",
  });
}

/**
 * Runs one dispatch pass for the cohort. Requires the service client because
 * the dispatch ledger grants no INSERT to signed-in users.
 */
export async function dispatchEvidenceGapEmails(
  supabase: Client,
  input: {
    cohort: string;
    gap: EvidenceGapAlert;
    now?: Date;
    dryRun?: boolean;
  },
): Promise<GapEmailResult> {
  const now = input.now ?? new Date();
  const key = windowKey(now, input.gap.windowDays);
  const base: GapEmailResult = {
    state: input.gap.state,
    triggered: input.gap.triggered,
    windowKey: key,
    planned: 0,
    sent: 0,
    blocked: 0,
    alreadySent: 0,
    failed: 0,
    blockedReason: null,
  };

  if (!input.gap.triggered || input.gap.state === "none") {
    return { ...base, blockedReason: "The evidence-gap window has not elapsed; no email is due." };
  }

  const { listInvitations } = await import("./pilot.server");
  const invitations = await listInvitations(supabase, input.cohort);
  const userIds = invitations
    .map((invitation) => invitation.userId)
    .filter((value): value is string => Boolean(value));

  const answered = new Set<string>();
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("pilot_checkpoint_responses")
      .select("user_id")
      .in("user_id", userIds)
      .limit(2000);
    for (const raw of data ?? []) {
      const row = raw as { user_id: string | null };
      if (row.user_id) answered.add(row.user_id);
    }
  }

  const plan = planGapEmails(input.gap, { invitations, answeredUserIds: answered });
  if (plan.length === 0) {
    return {
      ...base,
      blockedReason:
        input.gap.state === "no_invitations"
          ? "No seats have been issued, so there is nobody to email. Enrol participants first."
          : "Every participant in this gap state has already done what the nudge would ask.",
    };
  }
  if (input.dryRun) return { ...base, planned: plan.length };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = { ...base, planned: plan.length };

  for (const row of plan) {
    const idempotencyKey = `${input.cohort}|${row.kind}|${row.email}|${key}`;
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("pilot_reminder_dispatches")
      .insert({
        cohort: input.cohort,
        invitation_id: row.invitationId,
        recipient_email: row.email,
        kind: row.kind,
        channel: "email",
        status: "queued",
        window_days: input.gap.windowDays,
        idempotency_key: idempotencyKey,
      } as never)
      .select("id")
      .single();

    if (claimError) {
      // Unique violation means this recipient was already nudged this window.
      if (claimError.code === "23505") result.alreadySent += 1;
      else {
        result.failed += 1;
        console.error("[pilot-gap-emails] ledger write failed", claimError.message);
      }
      continue;
    }

    const dispatchId = (claimed as { id: string }).id;
    const outcome = await deliver(row);
    const status = outcome.delivered
      ? "sent"
      : outcome.reason.startsWith("No verified sender domain")
        ? "blocked_no_sender_domain"
        : "failed";
    if (status === "sent") result.sent += 1;
    else if (status === "blocked_no_sender_domain") {
      result.blocked += 1;
      result.blockedReason = outcome.reason;
    } else result.failed += 1;

    await supabaseAdmin
      .from("pilot_reminder_dispatches")
      .update({ status, detail: outcome.reason } as never)
      .eq("id", dispatchId);
  }

  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: input.cohort,
    action: "reminders.emailed",
    actorKind: "system",
    reason: `${result.sent} sent · ${result.blocked} blocked · ${result.alreadySent} already nudged this window`,
    metadata: { state: input.gap.state, windowKey: key },
  });

  return result;
}
