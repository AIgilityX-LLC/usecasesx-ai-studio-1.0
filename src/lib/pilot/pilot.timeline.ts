/**
 * Pilot evidence timeline (pure).
 *
 * Merges everything the pilot actually recorded — seats issued and claimed,
 * mission activation, checkpoint answers, admin actions, reminder dispatches,
 * recorded verdicts and launch waivers — into one chronological evidence trail,
 * then renders it as CSV or Markdown. No event is synthesised: each row comes
 * from a stored timestamp.
 */

import {
  pilotAuditActionLabel,
  pilotStatusLabel,
  type PilotAuditEvent,
  type PilotCheckpointResponse,
  type PilotCohortRow,
} from "./pilot.model";
import {
  DISPATCH_STATUS_LABEL,
  type LaunchWaiver,
  type PilotVerdictSnapshot,
  type ReminderDispatch,
} from "./pilot.governance";
import { describeRun, type LaunchCheckRun } from "@/lib/qa/launch-runs";
import { toCsvCell } from "./pilot.export";
import { reportStrings, type ReportLanguage } from "@/lib/i18n/report-language";
import type { CanvasDocument } from "@/lib/workshops.canvas-evidence";
import { CANVAS_SECTION_LABEL } from "@/lib/workshops.public-value";
import { humanBytes } from "@/lib/storage/storage-policy";

export const TIMELINE_CATEGORIES = [
  "seat",
  "mission",
  "checkpoint",
  "admin",
  "reminder",
  "verdict",
  "waiver",
  "launch_check",
  "document",
] as const;
export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];

export const TIMELINE_CATEGORY_LABEL: Record<TimelineCategory, string> = {
  seat: "Seat",
  mission: "Mission",
  checkpoint: "Checkpoint",
  admin: "Admin action",
  reminder: "Reminder",
  verdict: "Verdict",
  waiver: "Waiver",
  launch_check: "Launch check",
  document: "Document",
};

export type PilotTimelineEvent = {
  /** ISO timestamp the event was recorded at. */
  at: string;
  category: TimelineCategory;
  title: string;
  detail: string;
  participant: string | null;
  actor: string | null;
};

export type TimelineInput = {
  cohort: string;
  rows: readonly PilotCohortRow[];
  checkpoints: readonly PilotCheckpointResponse[];
  audit: readonly PilotAuditEvent[];
  emailByUserId?: Record<string, string>;
  dispatches?: readonly ReminderDispatch[];
  snapshots?: readonly PilotVerdictSnapshot[];
  waivers?: readonly LaunchWaiver[];
  launchCheckRuns?: readonly LaunchCheckRun[];
  /** Canvas evidence files, linked into the trail by the section they prove. */
  canvasDocuments?: readonly CanvasDocument[];
};

const iso = (value: string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

/** Chronological evidence trail, oldest first. */
export function buildPilotTimeline(input: TimelineInput): PilotTimelineEvent[] {
  const emailByUserId = input.emailByUserId ?? {};
  const events: PilotTimelineEvent[] = [];
  const push = (at: string | null, event: Omit<PilotTimelineEvent, "at">) => {
    if (!at) return;
    events.push({ at, ...event });
  };

  for (const row of input.rows) {
    push(iso(row.invitedAt), {
      category: "seat",
      title: "Seat issued",
      detail: row.organization ? `Organisation: ${row.organization}` : "No organisation recorded",
      participant: row.email,
      actor: null,
    });
    push(iso(row.registeredAt), {
      category: "seat",
      title: "Seat claimed",
      detail: `Status ${pilotStatusLabel(row.status)}`,
      participant: row.email,
      actor: null,
    });
    push(iso(row.activatedAt), {
      category: "mission",
      title: "Mission activated",
      detail: `${row.progress.completedSteps}/${row.progress.totalSteps} steps complete at export time`,
      participant: row.email,
      actor: null,
    });
    push(iso(row.completedAt), {
      category: "mission",
      title: "Mission complete",
      detail: `${row.checkpointCount} checkpoint answer(s) recorded`,
      participant: row.email,
      actor: null,
    });
  }

  for (const response of input.checkpoints) {
    const email = response.userId ? (emailByUserId[response.userId] ?? null) : null;
    push(iso(response.createdAt), {
      category: "checkpoint",
      title: `Checkpoint answered — ${response.checkpoint}`,
      detail:
        [
          response.missionStep ? `step ${response.missionStep}` : null,
          response.rating === null || response.rating === undefined
            ? null
            : `clarity ${response.rating}/5`,
          response.blocked ? "reported blocked" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "No structured ratings recorded",
      participant: email,
      actor: null,
    });
  }

  for (const event of input.audit) {
    push(iso(event.createdAt), {
      category: "admin",
      title: pilotAuditActionLabel(event.action),
      detail:
        [
          event.fromStatus || event.toStatus
            ? `${event.fromStatus ?? "—"} → ${event.toStatus ?? "—"}`
            : null,
          event.reason,
        ]
          .filter(Boolean)
          .join(" · ") || "No reason recorded",
      participant: event.subjectEmail ?? null,
      actor: event.actorId ?? event.actorKind,
    });
  }

  for (const dispatch of input.dispatches ?? []) {
    push(iso(dispatch.createdAt), {
      category: "reminder",
      title: `Reminder ${DISPATCH_STATUS_LABEL[dispatch.status] ?? dispatch.status} — ${dispatch.kind}`,
      detail: [dispatch.channel, dispatch.detail].filter(Boolean).join(" · "),
      participant: dispatch.recipientEmail,
      actor: "scheduler",
    });
  }

  for (const snapshot of input.snapshots ?? []) {
    push(iso(snapshot.createdAt), {
      category: "verdict",
      title: `Verdict recorded — ${snapshot.verdict}`,
      detail: `${snapshot.headline} · ${snapshot.checkpointAnswers} answer(s), ${snapshot.registered}/${snapshot.invited} seats claimed, P0 ${snapshot.p0Count} / P1 ${snapshot.p1Count}`,
      participant: null,
      actor: snapshot.recordedBy,
    });
  }

  for (const waiver of input.waivers ?? []) {
    push(iso(waiver.createdAt), {
      category: "waiver",
      title: `Launch waiver granted — ${waiver.scope}`,
      detail: `${waiver.approverName} (${waiver.approverRole}): ${waiver.reason}${
        waiver.expiresAt ? ` · expires ${new Date(waiver.expiresAt).toISOString()}` : ""
      }`,
      participant: null,
      actor: waiver.approvedBy,
    });
    push(iso(waiver.revokedAt), {
      category: "waiver",
      title: "Launch waiver revoked",
      detail: waiver.revokeReason ?? "No reason recorded",
      participant: null,
      actor: waiver.revokedBy,
    });
  }

  for (const run of input.launchCheckRuns ?? []) {
    push(iso(run.createdAt), {
      category: "launch_check",
      title: "Signed-in launch checks re-run",
      detail: describeRun(run),
      participant: null,
      actor: run.actorEmail ?? run.actorId,
    });
  }

  for (const document of input.canvasDocuments ?? []) {
    push(iso(document.createdAt), {
      category: "document",
      title: `Canvas document attached — ${document.label}`,
      detail: [
        CANVAS_SECTION_LABEL[document.section],
        document.mimeType,
        humanBytes(document.sizeBytes),
        document.note,
      ]
        .filter(Boolean)
        .join(" · "),
      participant: null,
      actor: emailByUserId[document.uploadedBy] ?? document.uploadedBy,
    });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title));
}

/** Language-aware CSV of the same rows, for multilingual evidence packs. */
export function localizedTimelineToCsv(
  events: readonly PilotTimelineEvent[],
  language: ReportLanguage = "en",
): string {
  const t = reportStrings(language);
  const body = events.map((event) => [
    event.at,
    t.categories[event.category] ?? TIMELINE_CATEGORY_LABEL[event.category],
    event.title,
    event.participant ?? "",
    event.detail,
    event.actor ?? "",
  ]);
  return [[...t.timelineColumns], ...body].map((row) => row.map(toCsvCell).join(",")).join("\r\n");
}

/** Localised category label, falling back to English for unknown values. */
export function timelineCategoryLabel(
  category: TimelineCategory,
  language: ReportLanguage = "en",
): string {
  return reportStrings(language).categories[category] ?? TIMELINE_CATEGORY_LABEL[category];
}

export function pilotTimelineToCsv(events: readonly PilotTimelineEvent[]): string {
  const header = ["Occurred at", "Category", "Event", "Participant", "Detail", "Actor"];
  const body = events.map((event) => [
    event.at,
    TIMELINE_CATEGORY_LABEL[event.category],
    event.title,
    event.participant ?? "",
    event.detail,
    event.actor ?? "",
  ]);
  return [header, ...body].map((row) => row.map(toCsvCell).join(",")).join("\r\n");
}

/** Column headers for the PDF rendering of the timeline. */
export const TIMELINE_PDF_COLUMNS = ["Occurred at", "Category", "Event", "Participant"] as const;

/** Localised PDF column headers, in the same order. */
export function timelinePdfColumns(language: ReportLanguage = "en"): string[] {
  return reportStrings(language).timelineColumns.slice(0, 4);
}

/** Flattened rows for the PDF, in the same order as the CSV. */
export function buildTimelinePdfRows(
  events: readonly PilotTimelineEvent[],
  language: ReportLanguage = "en",
): string[][] {
  return events.map((event) => [
    event.at.replace("T", " ").slice(0, 19),
    timelineCategoryLabel(event.category, language),
    event.title,
    event.participant ?? "—",
  ]);
}

/** Summary lines shared by the PDF header and the Markdown artifact. */
export function buildTimelineSummaryLines(input: {
  cohort: string;
  events: readonly PilotTimelineEvent[];
  language?: ReportLanguage;
}): string[] {
  const t = reportStrings(input.language ?? "en");
  const counts = countTimeline(input.events);
  const first = input.events[0]?.at ?? null;
  const last = input.events[input.events.length - 1]?.at ?? null;
  return [
    `${t.cohort}: ${input.cohort}`,
    `${t.eventsRecorded}: ${input.events.length}`,
    `${t.firstEvent}: ${first ?? t.noneRecorded}`,
    `${t.latestEvent}: ${last ?? t.noneRecorded}`,
    ...TIMELINE_CATEGORIES.map(
      (category) => `${timelineCategoryLabel(category, input.language)}: ${counts[category]}`,
    ),
  ];
}

export type TimelineCounts = Record<TimelineCategory, number>;

export function countTimeline(events: readonly PilotTimelineEvent[]): TimelineCounts {
  return TIMELINE_CATEGORIES.reduce(
    (acc, category) => ({
      ...acc,
      [category]: events.filter((event) => event.category === category).length,
    }),
    {} as TimelineCounts,
  );
}

/** Shareable Markdown evidence timeline for the release record. */
export function buildTimelineMarkdown(input: {
  cohort: string;
  generatedAt: string;
  events: readonly PilotTimelineEvent[];
  language?: ReportLanguage;
}): string {
  const t = reportStrings(input.language ?? "en");
  const counts = countTimeline(input.events);
  const first = input.events[0]?.at ?? null;
  const last = input.events[input.events.length - 1]?.at ?? null;
  const lines: string[] = [
    `# ${t.timelineTitle} — ${t.cohort} ${input.cohort}`,
    ``,
    `${t.generated} ${input.generatedAt}`,
    ``,
    `- ${t.eventsRecorded}: ${input.events.length}`,
    `- ${t.firstEvent}: ${first ?? t.noneRecorded}`,
    `- ${t.latestEvent}: ${last ?? t.noneRecorded}`,
    ...TIMELINE_CATEGORIES.map(
      (category) => `- ${timelineCategoryLabel(category, input.language)}: ${counts[category]}`,
    ),
    ``,
    `## ${t.trail}`,
    ``,
  ];

  if (input.events.length === 0) {
    lines.push(t.emptyTimeline, ``);
    return lines.join("\n");
  }

  lines.push(`| ${t.timelineColumns.slice(0, 5).join(" | ")} |`, `| --- | --- | --- | --- | --- |`);
  for (const event of input.events) {
    const cell = (value: string) => value.replace(/\|/g, "\\|");
    lines.push(
      `| ${event.at} | ${timelineCategoryLabel(event.category, input.language)} | ${cell(event.title)} | ${cell(
        event.participant ?? "—",
      )} | ${cell(event.detail || "—")} |`,
    );
  }
  lines.push(``);
  return lines.join("\n");
}
