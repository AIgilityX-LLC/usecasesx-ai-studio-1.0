/**
 * Pilot programme export builders.
 *
 * Pure CSV/summary builders over the admin cohort view — no client, no
 * transport. The PDF is rendered in the browser from `buildFunnelSummaryLines`
 * and the same rows, so both formats always describe identical data.
 */

import {
  pilotStatusLabel,
  willingnessLabel,
  type PilotAuditEvent,
  type PilotCheckpointResponse,
  type PilotCohortRow,
  type PilotCohortSummary,
} from "./pilot.model";

export function toCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const toCsv = (rows: (string | number | boolean | null | undefined)[][]): string =>
  rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");

const iso = (value: string | null): string => (value ? new Date(value).toISOString() : "");

/** One row per invited participant: funnel state and measured mission progress. */
export function pilotFunnelToCsv(rows: PilotCohortRow[]): string {
  const header = [
    "Email",
    "Name",
    "Organisation",
    "Status",
    "Invited at",
    "Registered at",
    "Activated at",
    "Completed at",
    "Mission steps complete",
    "Mission steps total",
    "Mission percent",
    "Checkpoint answers",
    "Blockers reported",
    "Advisory interest",
  ];
  const body = rows.map((row) => [
    row.email,
    row.fullName,
    row.organization,
    pilotStatusLabel(row.status),
    iso(row.invitedAt),
    iso(row.registeredAt),
    iso(row.activatedAt),
    iso(row.completedAt),
    row.progress.completedSteps,
    row.progress.totalSteps,
    row.progress.percent,
    row.checkpointCount,
    row.blockersReported,
    row.advisoryInterest,
  ]);
  return toCsv([header, ...body]);
}

/** One row per checkpoint answer, including the mission references behind it. */
export function pilotCheckpointsToCsv(
  responses: PilotCheckpointResponse[],
  emailByUserId: Record<string, string> = {},
): string {
  const header = [
    "Answered at",
    "Participant",
    "Checkpoint",
    "Mission step",
    "Journey stage",
    "Context route",
    "Clarity rating",
    "Effort rating",
    "Value rating",
    "Funding willingness",
    "Advisory interest",
    "Blocked",
    "Use case ids",
    "Portfolio id",
    "Comment",
  ];
  const body = responses.map((response) => [
    iso(response.createdAt),
    (response.userId ? emailByUserId[response.userId] : null) ?? "",
    response.checkpoint,
    response.missionStep ?? "",
    response.journeyStage ?? "",
    response.contextRoute ?? "",
    response.rating,
    response.effortRating,
    response.valueRating,
    willingnessLabel(response.willingness),
    response.advisoryInterest,
    response.blocked,
    (response.useCaseIds ?? []).join(" "),
    response.portfolioId ?? "",
    response.comment ?? "",
  ]);
  return toCsv([header, ...body]);
}

/** Advisory interest only — the follow-up list, with stated funding appetite. */
export function pilotAdvisoryInterestToCsv(
  rows: PilotCohortRow[],
  responses: PilotCheckpointResponse[],
): string {
  const header = [
    "Email",
    "Name",
    "Organisation",
    "Status",
    "Mission percent",
    "Funding willingness",
    "Signalled at",
  ];
  const interested = rows.filter((row) => row.advisoryInterest);
  const body = interested.map((row) => {
    const signals = responses
      .filter((r) => r.userId === row.userId && r.advisoryInterest)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = signals[0];
    return [
      row.email,
      row.fullName,
      row.organization,
      pilotStatusLabel(row.status),
      row.progress.percent,
      willingnessLabel(latest?.willingness ?? null),
      iso(latest?.createdAt ?? null),
    ];
  });
  return toCsv([header, ...body]);
}

/** One row per audited pilot action, with actor, timestamp and reason. */
export function pilotAuditToCsv(events: PilotAuditEvent[]): string {
  const header = [
    "Occurred at",
    "Action",
    "Participant",
    "From status",
    "To status",
    "Reason",
    "Actor id",
    "Actor kind",
  ];
  const body = events.map((event) => [
    iso(event.createdAt),
    event.action,
    event.subjectEmail ?? "",
    event.fromStatus ?? "",
    event.toStatus ?? "",
    event.reason ?? "",
    event.actorId ?? "",
    event.actorKind,
  ]);
  return toCsv([header, ...body]);
}

/** Headline funnel lines shared by the PDF and the on-screen summary. */
export function buildFunnelSummaryLines(summary: PilotCohortSummary): string[] {
  return [
    `Seats invited: ${summary.invited} of ${summary.seatTarget}`,
    `Registered: ${summary.registered}`,
    `Activated (first mission step): ${summary.activated}`,
    `Mission complete: ${summary.completed}`,
    `Revoked seats: ${summary.revoked}`,
    `Checkpoint answers: ${summary.checkpointResponses}`,
    `Blockers reported: ${summary.blockersReported}`,
    `Advisory interest: ${summary.advisoryInterest}`,
  ];
}

/** Compact participant rows used by the PDF table. */
export function buildFunnelPdfRows(rows: PilotCohortRow[]): string[][] {
  return rows.map((row) => [
    row.email,
    pilotStatusLabel(row.status),
    `${row.progress.completedSteps}/${row.progress.totalSteps}`,
    String(row.checkpointCount),
    row.advisoryInterest ? "yes" : "—",
  ]);
}

export const FUNNEL_PDF_COLUMNS = [
  "Participant",
  "Status",
  "Mission",
  "Answers",
  "Advisory",
] as const;
