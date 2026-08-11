/**
 * Pilot invitation delivery — client-safe planning and message composition.
 *
 * A seat is only real once the participant can reach it. Every invitation row
 * carries a single-use-ish secret token; this module turns a cohort of
 * invitations into the exact set of messages to send, the claim link each one
 * carries, and the CSV an admin can hand out when email cannot be sent yet.
 *
 * No transport, no database client, no secrets beyond the tokens handed in.
 */

import type { PilotInvitation } from "./pilot.model";

export const INVITE_DISPATCH_KIND = "invitation_invite";
export const INVITE_QUERY_PARAM = "invite";

/** Claim URL for one invitation token, anchored on the serving origin. */
export function invitationLink(origin: string, token: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/pilot?${INVITE_QUERY_PARAM}=${encodeURIComponent(token)}`;
}

export type InviteMessage = { subject: string; body: string };

export function invitationMessage(input: {
  fullName: string | null;
  organization: string | null;
  cohort: string;
  link: string;
}): InviteMessage {
  const greeting = input.fullName?.trim() ? `Hello ${input.fullName.trim()},` : "Hello,";
  return {
    subject: "Your UseCasesX Founding Access pilot seat",
    body: [
      greeting,
      "",
      "You have a seat in the UseCasesX Founding Access pilot. The mission is one pass through " +
        "the journey: capture three AI use cases, score them, build a portfolio and export the summary.",
      "",
      `Claim your seat: ${input.link}`,
      "",
      "The link is personal to you. Sign in (or register) with the address this message was sent to, " +
        "and the seat attaches to your account automatically.",
      "",
      `Cohort: ${input.cohort}`,
    ].join("\n"),
  };
}

export type InviteDispatchRow = {
  invitationId: string;
  email: string;
  fullName: string | null;
  token: string;
  link: string;
  subject: string;
  body: string;
};

export type InviteSkip = { email: string; reason: string };

/**
 * Decides which seats get a message. Revoked seats are never contacted, seats
 * already attached to an account are skipped unless the admin asks to resend,
 * and a seat with no token is reported rather than silently dropped.
 */
export function planInvitationDispatch(
  invitations: readonly PilotInvitation[],
  options: {
    origin: string;
    invitationIds?: readonly string[];
    /** Include seats already claimed by an account. */
    includeClaimed?: boolean;
  },
): { rows: InviteDispatchRow[]; skipped: InviteSkip[] } {
  const selected = options.invitationIds?.length ? new Set(options.invitationIds) : null;
  const rows: InviteDispatchRow[] = [];
  const skipped: InviteSkip[] = [];

  for (const invitation of invitations) {
    if (selected && !selected.has(invitation.id)) continue;
    if (invitation.status === "revoked") {
      skipped.push({ email: invitation.email, reason: "Seat is revoked." });
      continue;
    }
    if (invitation.userId && !options.includeClaimed) {
      skipped.push({ email: invitation.email, reason: "Seat is already claimed by an account." });
      continue;
    }
    const token = invitation.inviteToken;
    if (!token) {
      skipped.push({
        email: invitation.email,
        reason: "Seat has no invitation token; re-create the seat to issue one.",
      });
      continue;
    }
    const link = invitationLink(options.origin, token);
    const message = invitationMessage({
      fullName: invitation.fullName,
      organization: invitation.organization,
      cohort: invitation.cohort,
      link,
    });
    rows.push({
      invitationId: invitation.id,
      email: invitation.email,
      fullName: invitation.fullName,
      token,
      link,
      subject: message.subject,
      body: message.body,
    });
  }

  return { rows, skipped };
}

export type InviteDispatchResult = {
  cohort: string;
  planned: number;
  sent: number;
  blocked: number;
  alreadySent: number;
  failed: number;
  skipped: InviteSkip[];
  /** Why nothing could be emailed, when that is the case. */
  blockedReason: string | null;
  /** Handout links for the seats in this run — admin-only output. */
  links: { email: string; fullName: string | null; link: string }[];
};

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Handout sheet: one row per seat with the claim link. Admin-only artifact. */
export function invitationLinksCsv(
  links: readonly { email: string; fullName: string | null; link: string }[],
): string {
  const rows = [["Email", "Name", "Claim link"]];
  for (const row of links) rows.push([row.email, row.fullName ?? "", row.link]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

/** Human summary of a dispatch run, used in toasts and the audit reason. */
export function describeDispatch(result: InviteDispatchResult): string {
  const parts = [`${result.planned} planned`];
  if (result.sent) parts.push(`${result.sent} emailed`);
  if (result.blocked) parts.push(`${result.blocked} link-only`);
  if (result.alreadySent) parts.push(`${result.alreadySent} already sent`);
  if (result.failed) parts.push(`${result.failed} failed`);
  if (result.skipped.length) parts.push(`${result.skipped.length} skipped`);
  return parts.join(" · ");
}
