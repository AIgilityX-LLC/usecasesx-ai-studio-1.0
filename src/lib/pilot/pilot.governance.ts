/**
 * Launch governance (pure): waivers, recorded verdicts and reminder dispatches.
 *
 * A waiver is an explicit, named, auditable admin override for one thing only —
 * missing pilot evidence. It can never clear an open P0 finding: code defects
 * are fixed, not waived. Everything here is derived from recorded rows.
 */

import type { FreezeRecommendation, ReleaseVerdict } from "./pilot.triage";

export const WAIVER_SCOPES = ["pilot_evidence"] as const;
export type WaiverScope = (typeof WAIVER_SCOPES)[number];

export type LaunchWaiver = {
  id: string;
  cohort: string;
  scope: WaiverScope | string;
  reason: string;
  approverName: string;
  approverRole: string;
  approvedBy: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  createdAt: string;
};

export type PilotVerdictSnapshot = {
  id: string;
  cohort: string;
  verdict: ReleaseVerdict | string;
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
  recordedBy: string | null;
  createdAt: string;
};

export type ReminderDispatch = {
  id: string;
  cohort: string;
  invitationId: string | null;
  recipientEmail: string;
  kind: string;
  channel: string;
  status: string;
  detail: string | null;
  windowDays: number | null;
  createdAt: string;
};

/** Dispatch statuses the reminder job may record. */
export const DISPATCH_STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
  skipped: "Skipped",
  blocked_no_sender_domain: "Blocked — no sender domain",
};

export function isWaiverActive(waiver: LaunchWaiver, now: Date = new Date()): boolean {
  if (waiver.revokedAt) return false;
  if (!waiver.expiresAt) return true;
  return new Date(waiver.expiresAt).getTime() > now.getTime();
}

export function activeWaiver(
  waivers: readonly LaunchWaiver[],
  options: { scope?: string; now?: Date } = {},
): LaunchWaiver | null {
  const scope = options.scope ?? "pilot_evidence";
  const now = options.now ?? new Date();
  return (
    waivers.find((waiver) => waiver.scope === scope && isWaiverActive(waiver, now)) ?? null
  );
}

export type WaivedVerdict = {
  verdict: ReleaseVerdict;
  headline: string;
  reasons: string[];
  freezeRecommended: boolean;
  /** True when an active waiver changed the verdict. */
  waived: boolean;
  waiver: LaunchWaiver | null;
  /** Why the waiver did or did not apply — always shown to the admin. */
  note: string;
};

/**
 * Applies an active waiver to the computed freeze recommendation.
 *
 * Only `insufficient_evidence` can be waived, and only up to
 * `conditional_go`. Any open P0 keeps the verdict at `no_go`.
 */
export function applyLaunchWaiver(
  freeze: FreezeRecommendation,
  waiver: LaunchWaiver | null,
  now: Date = new Date(),
): WaivedVerdict {
  const base: WaivedVerdict = {
    verdict: freeze.verdict,
    headline: freeze.headline,
    reasons: [...freeze.reasons],
    freezeRecommended: freeze.freezeRecommended,
    waived: false,
    waiver: null,
    note: "No launch waiver is in force — the verdict is the measured one.",
  };

  if (!waiver) return base;
  if (!isWaiverActive(waiver, now)) {
    return { ...base, waiver, note: "The recorded waiver is revoked or expired; it does not apply." };
  }
  if (freeze.counts.p0 > 0) {
    return {
      ...base,
      waiver,
      note: "A waiver cannot clear open P0 findings — fix and re-test them before launch.",
    };
  }
  if (freeze.verdict !== "insufficient_evidence") {
    return {
      ...base,
      waiver,
      note: "The verdict does not depend on missing pilot evidence, so the waiver changes nothing.",
    };
  }

  const approver = `${waiver.approverName} (${waiver.approverRole})`;
  return {
    verdict: "conditional_go",
    headline: "Conditional Go under signed evidence waiver",
    reasons: [
      ...freeze.reasons,
      `Evidence shortfall waived by ${approver}: ${waiver.reason}`,
      waiver.expiresAt
        ? `Waiver expires ${new Date(waiver.expiresAt).toISOString()}.`
        : "Waiver has no expiry — revoke it once pilot evidence lands.",
    ],
    freezeRecommended: true,
    waived: true,
    waiver,
    note: `Launch proceeds on an explicit, audited override by ${approver}. Scope stays frozen: P0 fixes only.`,
  };
}