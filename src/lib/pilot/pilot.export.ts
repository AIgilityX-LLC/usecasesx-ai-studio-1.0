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
import {
  TRIAGE_CLASSES,
  TRIAGE_CLASS_LABEL,
  type EvidenceGapAlert,
  type FreezeRecommendation,
  type PilotEvidence,
  type TriageFinding,
} from "./pilot.triage";

export function toCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
  // Neutralize spreadsheet formula injection: a leading =, +, -, @ (or tab/CR
  // smuggled before it) would execute when an admin opens the CSV.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
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

/* ------------------------------------------------------- triage report */

export type TriageReportInput = {
  cohort: string;
  windowDays: number;
  generatedAt: string;
  evidence: PilotEvidence;
  findings: readonly TriageFinding[];
  freeze: FreezeRecommendation;
  evidenceGap: EvidenceGapAlert;
};

/** One row per classified finding, with the route holding its evidence. */
export function triageFindingsToCsv(findings: readonly TriageFinding[]): string {
  const header = [
    "Triage",
    "Source",
    "Title",
    "Observations",
    "Detail",
    "Action",
    "Evidence route",
  ];
  const body = findings.map((finding) => [
    TRIAGE_CLASS_LABEL[finding.triage],
    finding.source,
    finding.title,
    finding.observations,
    finding.detail,
    finding.action,
    finding.evidenceRoute ?? "",
  ]);
  return toCsv([header, ...body]);
}

/**
 * Shareable Markdown report: verdict, evidence counts, the evidence-gap state
 * and every classified finding with its evidence link. Pure text so the same
 * artifact can be downloaded in-app or written by a script.
 */
export function buildTriageReportMarkdown(report: TriageReportInput): string {
  const { cohort, evidence, findings, freeze, evidenceGap } = report;
  const lines: string[] = [
    `# Pilot triage report — cohort ${cohort}`,
    ``,
    `Generated ${report.generatedAt} · evidence window ${report.windowDays} days`,
    ``,
    `## Verdict`,
    ``,
    `**${freeze.headline}** (\`${freeze.verdict}\`)`,
    ``,
    freeze.freezeRecommended
      ? `Recommendation: freeze scope now — P0 fixes only until launch.`
      : `Recommendation: keep the pilot running to gather evidence before freezing.`,
    ``,
    `### Reasons`,
    ``,
    ...(freeze.reasons.length === 0
      ? [`- No blocking reason recorded in the current evidence window.`]
      : freeze.reasons.map((reason) => `- ${reason}`)),
    ``,
    `## Evidence gap watchdog`,
    ``,
    `- State: \`${evidenceGap.state}\` · ${evidenceGap.triggered ? "TRIGGERED" : "within window"}`,
    `- Open ${evidenceGap.daysOpen} day(s), window ${evidenceGap.windowDays} day(s)`,
    `- ${evidenceGap.detail}`,
    `- Action: ${evidenceGap.action}`,
    ``,
    `## Evidence counts`,
    ``,
    ...buildFunnelSummaryLines(evidence.cohort).map((line) => `- ${line}`),
    `- Open feedback records: ${evidence.feedback.length}`,
    `- AI task rows: ${evidence.aiUsage.length}`,
    `- Zero-result search rows: ${evidence.noResultSearches.length}`,
    `- Security alerts evaluated: ${evidence.securityAlerts.length}`,
    ``,
    `## Findings by class`,
    ``,
    ...TRIAGE_CLASSES.map((cls) => `- ${TRIAGE_CLASS_LABEL[cls]}: ${freeze.counts[cls]}`),
    ``,
    `## Findings`,
    ``,
  ];

  if (findings.length === 0) {
    lines.push(
      `No classified findings. Findings appear as participants answer checkpoints, send reports, or as AI, search and security signals accumulate.`,
      ``,
    );
  } else {
    for (const finding of findings) {
      lines.push(
        `### ${TRIAGE_CLASS_LABEL[finding.triage]} — ${finding.title}`,
        ``,
        `- Source: ${finding.source} · observations: ${finding.observations}`,
        `- Detail: ${finding.detail}`,
        `- Action: ${finding.action}`,
        `- Evidence: ${finding.evidenceRoute ?? "not linked"}`,
        ``,
      );
    }
  }

  return lines.join("\n");
}
