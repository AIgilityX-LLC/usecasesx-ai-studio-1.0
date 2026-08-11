/**
 * Pilot invitation delivery (server-only).
 *
 * Two jobs, both audited:
 *  1. Dispatch — record one ledger row per seat per run and hand the message to
 *     the sender. Email needs a verified sender domain; until one exists the
 *     ledger records `blocked_no_sender_domain` and the admin still gets the
 *     claim links, so seats are never left with a placeholder identity.
 *  2. Claim — attach a signed-in account to a seat by its token, so a
 *     participant whose sign-in address differs from the invited address still
 *     lands in the cohort.
 *
 * The dispatch ledger grants no INSERT to signed-in users, so writes go through
 * the service client after the caller has already been authorised.
 */

import {
  INVITE_DISPATCH_KIND,
  describeDispatch,
  planInvitationDispatch,
  type InviteDispatchResult,
  type InviteDispatchRow,
} from "./pilot.invites";
import type { PilotInvitation } from "./pilot.model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const NO_SENDER_DOMAIN =
  "No verified sender domain is configured, so no invitation email was sent. " +
  "The seat is real and the claim link below works — hand it to the participant directly.";

type DeliveryOutcome = { delivered: boolean; reason: string };

/**
 * Single place email delivery is wired. It stays honest about the current
 * state: without a verified sender domain there is no address these invitations
 * could legitimately come from, so nothing is faked.
 */
async function deliver(_row: InviteDispatchRow): Promise<DeliveryOutcome> {
  return Promise.resolve({ delivered: false, reason: NO_SENDER_DOMAIN });
}

/** Run bucket: a plain send is once-per-seat; a resend opens a new bucket. */
function runKey(now: Date, resend: boolean): string {
  return resend ? `resend-${now.toISOString().slice(0, 13)}` : "initial";
}

export async function dispatchPilotInvitations(
  supabase: Client,
  input: {
    cohort: string;
    origin: string;
    invitationIds?: readonly string[];
    resend?: boolean;
    dryRun?: boolean;
    now?: Date;
    actorId?: string | null;
  },
): Promise<InviteDispatchResult> {
  const now = input.now ?? new Date();
  const { listInvitations } = await import("./pilot.server");
  const invitations = await listInvitations(supabase, input.cohort);
  const { rows, skipped } = planInvitationDispatch(invitations, {
    origin: input.origin,
    invitationIds: input.invitationIds,
    includeClaimed: Boolean(input.resend),
  });

  const result: InviteDispatchResult = {
    cohort: input.cohort,
    planned: rows.length,
    sent: 0,
    blocked: 0,
    alreadySent: 0,
    failed: 0,
    skipped,
    blockedReason: null,
    links: [],
  };

  if (rows.length === 0 || input.dryRun) {
    if (rows.length === 0) {
      result.blockedReason =
        skipped.length > 0
          ? "Every selected seat was skipped — see the reasons listed."
          : "There are no seats to invite yet. Enrol participants first.";
    }
    result.links = rows.map((row) => ({
      email: row.email,
      fullName: row.fullName,
      link: row.link,
    }));
    return result;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bucket = runKey(now, Boolean(input.resend));

  for (const row of rows) {
    const idempotencyKey = `${input.cohort}|${INVITE_DISPATCH_KIND}|${row.email}|${bucket}`;
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("pilot_reminder_dispatches")
      .insert({
        cohort: input.cohort,
        invitation_id: row.invitationId,
        recipient_email: row.email,
        kind: INVITE_DISPATCH_KIND,
        channel: "email",
        status: "queued",
        window_days: 0,
        idempotency_key: idempotencyKey,
      } as never)
      .select("id")
      .single();

    if (claimError) {
      // Unique violation: this seat was already invited in this run bucket.
      if (claimError.code === "23505") result.alreadySent += 1;
      else {
        result.failed += 1;
        console.error("[pilot-invites] ledger write failed", claimError.message);
      }
      // The link is still useful to the admin even when no new send happened.
      result.links.push({ email: row.email, fullName: row.fullName, link: row.link });
      continue;
    }

    const dispatchId = (claimed as { id: string }).id;
    const outcome = await deliver(row);
    const status = outcome.delivered
      ? "sent"
      : outcome.reason === NO_SENDER_DOMAIN
        ? "blocked_no_sender_domain"
        : "failed";
    if (status === "sent") result.sent += 1;
    else if (status === "blocked_no_sender_domain") {
      result.blocked += 1;
      result.blockedReason = outcome.reason;
    } else result.failed += 1;

    // Never persist the token or the claim link in the ledger detail.
    await supabaseAdmin
      .from("pilot_reminder_dispatches")
      .update({ status, detail: outcome.reason } as never)
      .eq("id", dispatchId);

    result.links.push({ email: row.email, fullName: row.fullName, link: row.link });
  }

  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: input.cohort,
    action: "invitations.dispatched",
    actorId: input.actorId ?? null,
    reason: describeDispatch(result),
    metadata: { resend: Boolean(input.resend) },
  });

  return result;
}

export type ClaimOutcome = {
  invitation: PilotInvitation;
  linked: boolean;
};

/**
 * Attaches the signed-in account to the seat identified by `token`.
 * Requires the service client: an unclaimed seat is not readable under RLS by
 * the person about to claim it.
 */
export async function claimInvitationByToken(input: {
  token: string;
  userId: string;
}): Promise<ClaimOutcome> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("pilot_invitations")
    .select("*")
    .eq("invite_token", input.token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row)
    throw new Error("That invitation link is not valid. Ask your facilitator for a new one.");

  const seat = row as {
    id: string;
    cohort: string;
    email: string;
    status: string;
    user_id: string | null;
  };
  if (seat.status === "revoked") {
    throw new Error("That pilot seat has been revoked. Ask your facilitator for a new invitation.");
  }
  if (seat.user_id && seat.user_id !== input.userId) {
    throw new Error("That invitation link has already been claimed by another account.");
  }

  const { mapInvitationRow } = await import("./pilot.server");
  if (seat.user_id === input.userId) {
    return { invitation: mapInvitationRow(row), linked: false };
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("pilot_invitations")
    .update({
      user_id: input.userId,
      status: seat.status === "invited" ? "registered" : seat.status,
      registered_at: new Date().toISOString(),
    } as never)
    .eq("id", seat.id)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  const invitation = mapInvitationRow(updated);
  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: invitation.cohort,
    invitationId: invitation.id,
    subjectEmail: invitation.email,
    subjectUserId: input.userId,
    action: "invitation.linked",
    fromStatus: seat.status,
    toStatus: invitation.status,
    reason: "Claimed with an invitation link",
    actorId: input.userId,
  });
  return { invitation, linked: true };
}
