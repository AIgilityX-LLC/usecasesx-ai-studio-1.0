/**
 * Pilot enrolment analytics (pure).
 *
 * Two admin-facing reads over data the pilot already records:
 *
 * 1. A per-participant audit timeline — seat issued, seat claimed, onboarding
 *    completed and later updated, activation, completion and revocation, merged
 *    with the recorded admin actions so the actor and reason travel with the
 *    event. Nothing is synthesised: every row comes from a stored timestamp.
 * 2. A cohort funnel — invited vs claimed vs onboarded vs activated, both as a
 *    cumulative series over time and broken down by sector and country from the
 *    onboarding intake.
 */

import { pilotAuditActionLabel, pilotStatusLabel } from "./pilot.model";
import type { PilotAuditEvent, PilotCohortRow } from "./pilot.model";
import type { PilotOnboardingProfile } from "./pilot.onboarding";
import { toCsvCell } from "./pilot.export";

export type CohortOnboardingProfile = PilotOnboardingProfile & { userId: string };

/* --------------------------------------------------- participant timeline */

export const PARTICIPANT_EVENT_KINDS = [
  "invited",
  "claimed",
  "onboarded",
  "onboarding_updated",
  "activated",
  "completed",
  "revoked",
  "status_changed",
  "admin",
] as const;
export type ParticipantEventKind = (typeof PARTICIPANT_EVENT_KINDS)[number];

export const PARTICIPANT_EVENT_LABEL: Record<ParticipantEventKind, string> = {
  invited: "Invite issued",
  claimed: "Seat claimed",
  onboarded: "Onboarding completed",
  onboarding_updated: "Onboarding updated",
  activated: "Seat activated",
  completed: "Mission complete",
  revoked: "Seat revoked",
  status_changed: "Status changed",
  admin: "Admin action",
};

export type ParticipantTimelineEvent = {
  /** ISO timestamp the event was recorded at. */
  at: string;
  kind: ParticipantEventKind;
  title: string;
  detail: string;
  actor: string | null;
};

const iso = (value: string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

const kindForStatus = (status: string | null): ParticipantEventKind => {
  switch (status) {
    case "invited":
      return "invited";
    case "registered":
      return "claimed";
    case "activated":
      return "activated";
    case "completed":
      return "completed";
    case "revoked":
      return "revoked";
    default:
      return "status_changed";
  }
};

/** Audit events that belong to one seat, matched on invitation id then email. */
export function auditForParticipant(
  row: Pick<PilotCohortRow, "id" | "email" | "userId">,
  audit: readonly PilotAuditEvent[],
): PilotAuditEvent[] {
  return audit.filter((event) => {
    if (event.invitationId && event.invitationId === row.id) return true;
    if (event.subjectEmail && event.subjectEmail.toLowerCase() === row.email.toLowerCase()) {
      return true;
    }
    return Boolean(event.subjectUserId) && event.subjectUserId === row.userId;
  });
}

/**
 * One participant's lifecycle, oldest first.
 *
 * Recorded admin actions take precedence over the seat's own timestamps, so a
 * status change keeps its actor and reason instead of appearing twice.
 */
export function buildParticipantTimeline(input: {
  row: PilotCohortRow;
  audit: readonly PilotAuditEvent[];
  onboarding?: CohortOnboardingProfile | null;
}): ParticipantTimelineEvent[] {
  const events: ParticipantTimelineEvent[] = [];
  const seen = new Set<string>();
  const key = (at: string, kind: ParticipantEventKind) => `${at.slice(0, 19)}|${kind}`;
  const push = (
    at: string | null,
    event: Omit<ParticipantTimelineEvent, "at">,
    { force = false }: { force?: boolean } = {},
  ) => {
    if (!at) return;
    const id = key(at, event.kind);
    if (!force && seen.has(id)) return;
    seen.add(id);
    events.push({ at, ...event });
  };

  for (const event of auditForParticipant(input.row, input.audit)) {
    const kind =
      event.action === "invitation.created"
        ? "invited"
        : event.action === "invitation.revoked"
          ? "revoked"
          : event.action === "invitation.status_changed"
            ? kindForStatus(event.toStatus)
            : "admin";
    push(iso(event.createdAt), {
      kind,
      title: pilotAuditActionLabel(event.action),
      detail:
        [
          event.fromStatus || event.toStatus
            ? `${event.fromStatus ? pilotStatusLabel(event.fromStatus) : "—"} → ${
                event.toStatus ? pilotStatusLabel(event.toStatus) : "—"
              }`
            : null,
          event.reason,
        ]
          .filter(Boolean)
          .join(" · ") || "No reason recorded",
      actor: event.actorId ?? event.actorKind,
    });
  }

  push(iso(input.row.invitedAt), {
    kind: "invited",
    title: PARTICIPANT_EVENT_LABEL.invited,
    detail: input.row.organization
      ? `Organisation: ${input.row.organization}`
      : "No organisation recorded",
    actor: null,
  });
  push(iso(input.row.registeredAt), {
    kind: "claimed",
    title: PARTICIPANT_EVENT_LABEL.claimed,
    detail: "Invitation link claimed and account linked to the seat",
    actor: null,
  });

  const profile = input.onboarding ?? null;
  if (profile) {
    push(iso(profile.completedAt), {
      kind: "onboarded",
      title: PARTICIPANT_EVENT_LABEL.onboarded,
      detail: [
        profile.roleTitle,
        profile.sector,
        profile.country,
        profile.contactConsent ? "contactable" : "no contact consent",
      ]
        .filter(Boolean)
        .join(" · "),
      actor: profile.userId,
    });
    if (
      profile.updatedAt &&
      new Date(profile.updatedAt).getTime() > new Date(profile.completedAt).getTime() + 1000
    ) {
      push(iso(profile.updatedAt), {
        kind: "onboarding_updated",
        title: PARTICIPANT_EVENT_LABEL.onboarding_updated,
        detail: "Participant revised their intake answers",
        actor: profile.userId,
      });
    }
  }

  push(iso(input.row.activatedAt), {
    kind: "activated",
    title: PARTICIPANT_EVENT_LABEL.activated,
    detail: `${input.row.progress.completedSteps}/${input.row.progress.totalSteps} mission steps complete now`,
    actor: null,
  });
  push(iso(input.row.completedAt), {
    kind: "completed",
    title: PARTICIPANT_EVENT_LABEL.completed,
    detail: `${input.row.checkpointCount} checkpoint answer(s) recorded`,
    actor: null,
  });

  return events.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title));
}

/* ----------------------------------------------------------- funnel series */

export type FunnelStage = "invited" | "claimed" | "onboarded" | "activated";

export type FunnelSeriesPoint = {
  /** Calendar day, YYYY-MM-DD. */
  date: string;
  invited: number;
  claimed: number;
  onboarded: number;
  activated: number;
};

const day = (value: string | null | undefined): string | null =>
  value ? new Date(value).toISOString().slice(0, 10) : null;

/**
 * Cumulative funnel by calendar day. Only days where something happened appear,
 * so an empty cohort produces an empty series rather than a fabricated shape.
 */
export function buildFunnelSeries(
  rows: readonly PilotCohortRow[],
  onboarding: readonly CohortOnboardingProfile[],
): FunnelSeriesPoint[] {
  const active = rows.filter((row) => row.status !== "revoked");
  const byDay = new Map<
    string,
    { invited: number; claimed: number; onboarded: number; activated: number }
  >();
  const bump = (date: string | null, stage: FunnelStage) => {
    if (!date) return;
    const entry = byDay.get(date) ?? { invited: 0, claimed: 0, onboarded: 0, activated: 0 };
    entry[stage] += 1;
    byDay.set(date, entry);
  };

  for (const row of active) {
    bump(day(row.invitedAt), "invited");
    bump(day(row.registeredAt), "claimed");
    bump(day(row.activatedAt), "activated");
  }
  const activeUserIds = new Set(active.map((row) => row.userId).filter(Boolean) as string[]);
  for (const profile of onboarding) {
    if (!activeUserIds.has(profile.userId)) continue;
    bump(day(profile.completedAt), "onboarded");
  }

  const running = { invited: 0, claimed: 0, onboarded: 0, activated: 0 };
  return [...byDay.keys()].sort().map((date) => {
    const entry = byDay.get(date)!;
    running.invited += entry.invited;
    running.claimed += entry.claimed;
    running.onboarded += entry.onboarded;
    running.activated += entry.activated;
    return { date, ...running };
  });
}

/* -------------------------------------------------------- funnel breakdown */

export type EnrollmentDimension = "sector" | "country";

export type FunnelBreakdownRow = {
  key: string;
  invited: number;
  claimed: number;
  onboarded: number;
  activated: number;
};

export const NOT_RECORDED = "Not recorded";

/**
 * Funnel split by the dimension the participant declared at intake. Seats with
 * no intake yet are grouped under "Not recorded" rather than dropped, so the
 * columns still reconcile with the cohort totals.
 */
export function buildFunnelBreakdown(
  rows: readonly PilotCohortRow[],
  onboarding: readonly CohortOnboardingProfile[],
  dimension: EnrollmentDimension,
): FunnelBreakdownRow[] {
  const profileByUser = new Map(onboarding.map((profile) => [profile.userId, profile]));
  const buckets = new Map<string, FunnelBreakdownRow>();

  for (const row of rows) {
    if (row.status === "revoked") continue;
    const profile = row.userId ? profileByUser.get(row.userId) : undefined;
    const raw = profile ? (dimension === "sector" ? profile.sector : profile.country) : null;
    const key = raw && String(raw).trim() ? String(raw).trim() : NOT_RECORDED;
    const bucket = buckets.get(key) ?? { key, invited: 0, claimed: 0, onboarded: 0, activated: 0 };
    bucket.invited += 1;
    if (row.userId) bucket.claimed += 1;
    if (profile) bucket.onboarded += 1;
    if (row.activatedAt) bucket.activated += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => b.invited - a.invited || a.key.localeCompare(b.key));
}

/** Conversion percentage, guarded against an empty cohort. */
export function conversionPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/* ------------------------------------------------------------------ export */

export function participantTimelineToCsv(
  email: string,
  events: readonly ParticipantTimelineEvent[],
): string {
  const header = ["Participant", "Occurred at", "Event type", "Event", "Detail", "Actor"];
  const body = events.map((event) => [
    email,
    event.at,
    PARTICIPANT_EVENT_LABEL[event.kind],
    event.title,
    event.detail,
    event.actor ?? "",
  ]);
  return [header, ...body].map((row) => row.map(toCsvCell).join(",")).join("\r\n");
}

export function funnelAnalyticsToCsv(input: {
  series: readonly FunnelSeriesPoint[];
  bySector: readonly FunnelBreakdownRow[];
  byCountry: readonly FunnelBreakdownRow[];
}): string {
  const lines: string[][] = [
    ["Section", "Key", "Invited", "Claimed", "Onboarded", "Activated"],
    ...input.series.map((point) => [
      "Cumulative by day",
      point.date,
      String(point.invited),
      String(point.claimed),
      String(point.onboarded),
      String(point.activated),
    ]),
    ...input.bySector.map((row) => [
      "By sector",
      row.key,
      String(row.invited),
      String(row.claimed),
      String(row.onboarded),
      String(row.activated),
    ]),
    ...input.byCountry.map((row) => [
      "By country",
      row.key,
      String(row.invited),
      String(row.claimed),
      String(row.onboarded),
      String(row.activated),
    ]),
  ];
  return lines.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
}
