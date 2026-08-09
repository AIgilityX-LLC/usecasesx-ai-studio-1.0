/**
 * Workshop collaboration — client-safe types and export builders.
 *
 * Invitations, per-stage audit entries and the outcome report document. No
 * server-only imports live here so route components and tests can use it.
 */

import { exportDeliverablePDF, type ExportDoc } from "@/lib/deliverables.export";
import {
  BUCKET_LABEL,
  STAGE_META,
  type OutcomeSummary,
  type WorkshopStage,
} from "@/lib/workshops";

export type WorkshopInvitationRole = "facilitator" | "participant" | "observer";

export type WorkshopInvitation = {
  id: string;
  workshopId: string;
  email: string | null;
  displayName: string | null;
  role: WorkshopInvitationRole;
  token: string;
  expiresAt: string;
  maxUses: number;
  useCount: number;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export function invitationUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/workshops/join/${token}`;
}

export function invitationState(
  invite: Pick<WorkshopInvitation, "revokedAt" | "expiresAt" | "useCount" | "maxUses">,
  now: Date = new Date(),
): "revoked" | "expired" | "used" | "open" {
  if (invite.revokedAt) return "revoked";
  if (new Date(invite.expiresAt).getTime() < now.getTime()) return "expired";
  if (invite.useCount >= invite.maxUses) return "used";
  return "open";
}

/* -------------------------------------------------------------- audit trail */

export type WorkshopAuditAction =
  | "workshop.updated"
  | "participant.joined"
  | "participant.added"
  | "item.submitted"
  | "item.curated"
  | "vote.cast"
  | "item.converted"
  | "outcome.generated"
  | "outcome.published";

export type WorkshopAuditEntry = {
  id: string;
  stage: WorkshopStage;
  action: WorkshopAuditAction;
  actorName: string;
  summary: string;
  at: string;
};

export const AUDIT_ACTION_LABEL: Record<WorkshopAuditAction, string> = {
  "workshop.updated": "Session updated",
  "participant.joined": "Joined via invitation",
  "participant.added": "Participant added",
  "item.submitted": "Submission",
  "item.curated": "Curation",
  "vote.cast": "Score cast",
  "item.converted": "Conversion",
  "outcome.generated": "Outcome generated",
  "outcome.published": "Outcome published",
};

export function groupAuditByStage(
  entries: WorkshopAuditEntry[],
): Array<{ stage: WorkshopStage; entries: WorkshopAuditEntry[] }> {
  const byStage = new Map<WorkshopStage, WorkshopAuditEntry[]>();
  for (const entry of entries) {
    const list = byStage.get(entry.stage) ?? [];
    list.push(entry);
    byStage.set(entry.stage, list);
  }
  return (Object.keys(STAGE_META) as WorkshopStage[])
    .filter((stage) => byStage.has(stage))
    .map((stage) => ({
      stage,
      entries: (byStage.get(stage) ?? []).sort((a, b) => b.at.localeCompare(a.at)),
    }));
}

/* ------------------------------------------------------------ outcome report */

const fmt = (value: number | null) => (value == null ? "—" : value.toFixed(2));

export function buildWorkshopOutcomeDoc(summary: OutcomeSummary): ExportDoc {
  const rows = (list: OutcomeSummary["longlist"]) =>
    list.map((row) => [
      row.title,
      row.businessFunction,
      fmt(row.composite),
      row.bucket ? BUCKET_LABEL[row.bucket] : "Not scored",
      String(row.voters),
      row.converted ? "Converted" : "—",
    ]);
  const columns = ["Item", "Function", "Score", "Classification", "Voters", "Lineage"];

  return {
    title: `${summary.workshopTitle} — Outcome summary`,
    subtitle: [summary.clientName, `Generated ${new Date(summary.generatedAt).toLocaleString()}`]
      .filter(Boolean)
      .join(" · "),
    sections: [
      {
        heading: "Objective",
        kind: "text",
        body: summary.objective || "No objective was recorded for this session.",
      },
      {
        heading: "Session at a glance",
        kind: "table",
        columns: ["Measure", "Count"],
        rows: [
          ["Participants", String(summary.counts.participants)],
          ["Pain points", String(summary.counts.painPoints)],
          ["Opportunities", String(summary.counts.opportunities)],
          ["Candidate use cases", String(summary.counts.useCases)],
          ["Shortlisted", String(summary.counts.shortlisted)],
          ["Converted", String(summary.counts.converted)],
        ],
      },
      {
        heading: "Opportunity Map — demand by function",
        kind: "table",
        columns: ["Business function", "Pain points", "Opportunities", "Use cases"],
        rows: summary.map.map((m) => [
          m.businessFunction,
          String(m.painPoints),
          String(m.opportunities),
          String(m.useCases),
        ]),
      },
      { heading: "Longlist", kind: "table", columns, rows: rows(summary.longlist) },
      { heading: "Shortlist", kind: "table", columns, rows: rows(summary.shortlist) },
      { heading: "Quick wins", kind: "table", columns, rows: rows(summary.quickWins) },
      { heading: "Strategic bets", kind: "table", columns, rows: rows(summary.strategicBets) },
      {
        heading: "Coverage gaps",
        kind: "text",
        body: summary.gaps.length
          ? summary.gaps.map((g) => `• ${g}`).join("\n")
          : "Every function that raised a pain point produced at least one candidate.",
      },
      {
        heading: "Indicative roadmap",
        kind: "table",
        columns: ["Horizon", "Items"],
        rows: summary.roadmap.map((h) => [h.horizon, h.items.join("; ") || "—"]),
      },
      {
        heading: "Next steps",
        kind: "text",
        body: summary.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      },
    ],
  };
}

export function workshopOutcomeFileName(summary: OutcomeSummary): string {
  const slug =
    summary.workshopTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workshop";
  return `${slug}-outcome-summary.pdf`;
}

export function downloadWorkshopOutcomePDF(summary: OutcomeSummary): void {
  exportDeliverablePDF(buildWorkshopOutcomeDoc(summary), workshopOutcomeFileName(summary));
}

/* ----------------------------------------------------- audit trail exports */

function slugify(value: string, fallback: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

const AUDIT_COLUMNS = ["When", "Action", "Who", "Detail"];

function auditRow(entry: WorkshopAuditEntry): string[] {
  return [
    new Date(entry.at).toLocaleString(),
    AUDIT_ACTION_LABEL[entry.action],
    entry.actorName,
    entry.summary,
  ];
}

/** One table per stage, newest first, covering votes and conversions. */
export function buildWorkshopAuditDoc(
  entries: WorkshopAuditEntry[],
  workshopTitle: string,
): ExportDoc {
  const groups = groupAuditByStage(entries);
  return {
    title: `${workshopTitle} — Audit trail`,
    subtitle: `${entries.length} recorded action${entries.length === 1 ? "" : "s"} · Exported ${new Date().toLocaleString()}`,
    sections: groups.length
      ? groups.map((group) => ({
          heading: STAGE_META[group.stage].label,
          kind: "table" as const,
          columns: AUDIT_COLUMNS,
          rows: group.entries.map(auditRow),
        }))
      : [
          {
            heading: "Audit trail",
            kind: "text" as const,
            body: "No activity has been recorded for this session yet.",
          },
        ],
  };
}

export function downloadWorkshopAuditPDF(
  entries: WorkshopAuditEntry[],
  workshopTitle: string,
): void {
  exportDeliverablePDF(
    buildWorkshopAuditDoc(entries, workshopTitle),
    `${slugify(workshopTitle, "workshop")}-audit-trail.pdf`,
  );
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** Spreadsheet-friendly variant: one row per action, stage as a column. */
export function buildWorkshopAuditCSV(entries: WorkshopAuditEntry[]): string {
  const header = ["Stage", "Timestamp (ISO)", "When", "Action", "Who", "Detail"];
  const rows = groupAuditByStage(entries).flatMap((group) =>
    group.entries.map((entry) => [
      STAGE_META[group.stage].label,
      entry.at,
      new Date(entry.at).toLocaleString(),
      AUDIT_ACTION_LABEL[entry.action],
      entry.actorName,
      entry.summary,
    ]),
  );
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadWorkshopAuditCSV(
  entries: WorkshopAuditEntry[],
  workshopTitle: string,
): void {
  const blob = new Blob([buildWorkshopAuditCSV(entries)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(workshopTitle, "workshop")}-audit-trail.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

