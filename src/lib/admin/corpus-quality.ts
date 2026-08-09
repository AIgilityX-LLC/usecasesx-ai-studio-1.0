/**
 * Launch-corpus quality gate — the single definition of what "publishable"
 * means for global catalogue content.
 *
 * It mirrors the database trigger `validate_use_case_provenance` (provenance
 * label + `quality_passed`) and adds the editorial completeness rules used to
 * build the launch corpus. Keeping the rules here means the admin QA action,
 * the exported audit report and the UI badges can never drift apart.
 *
 * This module is pure and client-safe: no Supabase, no `process.env`.
 */

export const PROVENANCE_LABELS = [
  "aigilityx_editorial",
  "community_contribution",
  "partner_contribution",
  "external_sourced",
  "workspace_authored",
  "unspecified",
] as const;
export type ProvenanceLabel = (typeof PROVENANCE_LABELS)[number];

export const QUALITY_STATUSES = [
  "quality_passed",
  "needs_review",
  "unverified",
  "rejected",
] as const;
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

export const PROVENANCE_NAMES: Record<string, string> = {
  aigilityx_editorial: "AigilityX editorial",
  community_contribution: "Community contribution",
  partner_contribution: "Partner contribution",
  external_sourced: "Externally sourced",
  workspace_authored: "Workspace authored",
  unspecified: "Unspecified",
};

export const QUALITY_NAMES: Record<string, string> = {
  quality_passed: "Quality checked",
  needs_review: "Needs review",
  unverified: "Unverified",
  rejected: "Rejected",
};

/** Labels that may appear on public, browsable content. */
export const PUBLIC_PROVENANCE_LABELS = PROVENANCE_LABELS.filter((p) => p !== "unspecified");

export interface QaRecord {
  id: string;
  slug: string;
  title: string;
  status: string;
  visibility: string;
  provenance: string;
  provenance_note: string | null;
  quality_status: string;
  quality_checked_at: string | null;
  summary: string | null;
  business_problem: string | null;
  ai_solution_concept: string | null;
  implementation_notes: string | null;
  governance_required: boolean | null;
  governance_notes: string | null;
  privacy_review_required: boolean | null;
  privacy_notes: string | null;
  cyber_review_required: boolean | null;
  cybersecurity_notes: string | null;
  updated_at: string | null;
}

export type QaSeverity = "blocker" | "warning";

export interface QaIssue {
  code: string;
  severity: QaSeverity;
  message: string;
}

export interface QaResult {
  id: string;
  slug: string;
  title: string;
  status: string;
  provenance: string;
  quality_status: string;
  /** True when no blocker issues remain, i.e. the record may be published. */
  passes: boolean;
  issues: QaIssue[];
}

const nonEmpty = (v: string | null | undefined, min = 1) => (v ?? "").trim().length >= min;

/** Re-execute the quality gate for one catalogue record. */
export function evaluateQualityGate(row: QaRecord): QaResult {
  const issues: QaIssue[] = [];
  const add = (code: string, severity: QaSeverity, message: string) =>
    issues.push({ code, severity, message });

  if (!PROVENANCE_LABELS.includes(row.provenance as ProvenanceLabel))
    add("provenance_unknown", "blocker", `Unknown provenance label "${row.provenance}".`);
  else if (row.provenance === "unspecified")
    add("provenance_missing", "blocker", "No provenance label assigned.");

  if (!QUALITY_STATUSES.includes(row.quality_status as QualityStatus))
    add("quality_unknown", "blocker", `Unknown quality status "${row.quality_status}".`);
  else if (row.quality_status === "rejected")
    add("quality_rejected", "blocker", "Record was rejected in quality review.");
  else if (row.quality_status !== "quality_passed")
    add("quality_not_passed", "blocker", `Quality status is "${row.quality_status}".`);

  if (!row.quality_checked_at)
    add("quality_check_undated", "warning", "No quality-check timestamp recorded.");

  if (!nonEmpty(row.summary, 40))
    add("summary_thin", "blocker", "Summary is missing or shorter than 40 characters.");
  if (!nonEmpty(row.business_problem, 40))
    add("problem_thin", "blocker", "Business problem is missing or too thin.");
  if (!nonEmpty(row.ai_solution_concept, 40))
    add("solution_thin", "blocker", "AI solution concept is missing or too thin.");
  if (!nonEmpty(row.implementation_notes, 40))
    add("implementation_thin", "warning", "No implementation notes for delivery guidance.");

  if (row.governance_required && !nonEmpty(row.governance_notes))
    add("governance_notes_missing", "blocker", "Governance review flagged but no notes recorded.");
  if (row.privacy_review_required && !nonEmpty(row.privacy_notes))
    add("privacy_notes_missing", "blocker", "Privacy review flagged but no notes recorded.");
  if (row.cyber_review_required && !nonEmpty(row.cybersecurity_notes))
    add("cyber_notes_missing", "blocker", "Cyber review flagged but no notes recorded.");

  if (row.provenance !== "aigilityx_editorial" && !nonEmpty(row.provenance_note))
    add("provenance_note_missing", "warning", "Non-editorial provenance without a source note.");

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    provenance: row.provenance,
    quality_status: row.quality_status,
    passes: !issues.some((i) => i.severity === "blocker"),
    issues,
  };
}

export interface QaDiff {
  /** Published today but the gate no longer passes — must be unpublished. */
  publishedFailing: QaResult[];
  /** Passes the gate but is not published — publishable candidates. */
  unpublishedPassing: QaResult[];
  /** Published and still passing. */
  publishedPassing: QaResult[];
  /** Not published and still failing. */
  unpublishedFailing: QaResult[];
}

export interface QaReport {
  generatedAt: string;
  totals: {
    records: number;
    published: number;
    passing: number;
    blockers: number;
    warnings: number;
  };
  byProvenance: Record<string, number>;
  byQualityStatus: Record<string, number>;
  diff: QaDiff;
  results: QaResult[];
}

/** Run the gate over the whole corpus and diff it against what is live. */
export function buildQaReport(rows: QaRecord[], generatedAt = new Date().toISOString()): QaReport {
  const results = rows.map(evaluateQualityGate);
  const diff: QaDiff = {
    publishedFailing: [],
    unpublishedPassing: [],
    publishedPassing: [],
    unpublishedFailing: [],
  };
  const byProvenance: Record<string, number> = {};
  const byQualityStatus: Record<string, number> = {};
  let blockers = 0;
  let warnings = 0;

  for (const r of results) {
    const published = r.status === "published";
    if (published && !r.passes) diff.publishedFailing.push(r);
    else if (published) diff.publishedPassing.push(r);
    else if (r.passes) diff.unpublishedPassing.push(r);
    else diff.unpublishedFailing.push(r);

    byProvenance[r.provenance] = (byProvenance[r.provenance] ?? 0) + 1;
    byQualityStatus[r.quality_status] = (byQualityStatus[r.quality_status] ?? 0) + 1;
    blockers += r.issues.filter((i) => i.severity === "blocker").length;
    warnings += r.issues.filter((i) => i.severity === "warning").length;
  }

  return {
    generatedAt,
    totals: {
      records: results.length,
      published: diff.publishedFailing.length + diff.publishedPassing.length,
      passing: results.filter((r) => r.passes).length,
      blockers,
      warnings,
    },
    byProvenance,
    byQualityStatus,
    diff,
    results,
  };
}

export interface ImportLogEntry {
  ts: string;
  actor: string;
  action: string;
  detail: string;
  useCaseId: string | null;
  slug: string | null;
  provenance: string | null;
  qualityStatus: string | null;
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
}

/** Auditable CSV of the quality gate, one row per record. */
export function qaReportToCsv(report: QaReport): string {
  return toCsv(
    [
      "slug",
      "title",
      "status",
      "provenance",
      "provenance_label",
      "quality_status",
      "gate_result",
      "diff_bucket",
      "blockers",
      "warnings",
      "issues",
      "generated_at",
    ],
    report.results.map((r) => {
      const published = r.status === "published";
      const bucket = published
        ? r.passes
          ? "published_passing"
          : "published_failing"
        : r.passes
          ? "unpublished_passing"
          : "unpublished_failing";
      return [
        r.slug,
        r.title,
        r.status,
        r.provenance,
        PROVENANCE_NAMES[r.provenance] ?? r.provenance,
        r.quality_status,
        r.passes ? "pass" : "fail",
        bucket,
        r.issues.filter((i) => i.severity === "blocker").length,
        r.issues.filter((i) => i.severity === "warning").length,
        r.issues.map((i) => `${i.severity}:${i.code}`).join(" | "),
        report.generatedAt,
      ];
    }),
  );
}

/** Auditable CSV of catalogue import / lifecycle events with provenance. */
export function importLogToCsv(entries: ImportLogEntry[]): string {
  return toCsv(
    [
      "timestamp",
      "actor",
      "action",
      "use_case_id",
      "slug",
      "provenance",
      "quality_status",
      "detail",
    ],
    entries.map((e) => [
      e.ts,
      e.actor,
      e.action,
      e.useCaseId ?? "",
      e.slug ?? "",
      e.provenance ?? "",
      e.qualityStatus ?? "",
      e.detail,
    ]),
  );
}
