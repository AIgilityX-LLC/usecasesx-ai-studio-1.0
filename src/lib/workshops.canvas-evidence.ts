/**
 * Canvas evidence — supporting documents and version history (pure).
 *
 * Documents are the proof behind a canvas section; versions are the record of
 * what changed between submissions. Both are read-only artefacts once written,
 * so everything here is derived from stored rows: no completeness, diff or
 * timeline entry is inferred.
 */

import {
  CANVAS_SECTIONS,
  assessCanvas,
  normalizeCanvasSections,
  type CanvasSection,
  type CanvasSections,
} from "@/lib/workshops.public-value";
import { reportStrings, type ReportLanguage } from "@/lib/i18n/report-language";
import { humanBytes } from "@/lib/storage/storage-policy";

export type CanvasDocument = {
  id: string;
  workshopId: string;
  section: CanvasSection;
  label: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  note: string | null;
  uploadedBy: string;
  createdAt: string;
};

export type CanvasVersion = {
  id: string;
  workshopId: string;
  version: number;
  sections: CanvasSections;
  completeness: number;
  answered: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export function isCanvasSection(value: unknown): value is CanvasSection {
  return typeof value === "string" && (CANVAS_SECTIONS as readonly string[]).includes(value);
}

/** Groups documents by section so each section can show its own evidence. */
export function documentsBySection(
  documents: readonly CanvasDocument[],
): Record<CanvasSection, CanvasDocument[]> {
  return CANVAS_SECTIONS.reduce(
    (acc, section) => ({
      ...acc,
      [section]: documents.filter((document) => document.section === section),
    }),
    {} as Record<CanvasSection, CanvasDocument[]>,
  );
}

const csvCell = (value: string | number): string => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function canvasDocumentsToCsv(
  documents: readonly CanvasDocument[],
  language: ReportLanguage = "en",
): string {
  const t = reportStrings(language);
  const rows = documents.map((document) => [
    t.sections[document.section],
    document.label,
    document.mimeType,
    humanBytes(document.sizeBytes),
    document.createdAt,
  ]);
  return [[...t.documentColumns], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/* ------------------------------------------------------- version comparison */

export type SectionChange = {
  section: CanvasSection;
  /** How the answer moved between the two versions. */
  change: "unchanged" | "added" | "removed" | "edited";
  confidenceChanged: boolean;
  fromLength: number;
  toLength: number;
  fromConfidence: string;
  toConfidence: string;
};

export type CanvasVersionDiff = {
  fromVersion: number | null;
  toVersion: number;
  changes: SectionChange[];
  changedSections: CanvasSection[];
  completenessDelta: number;
  headline: string;
};

/**
 * Compares two recorded versions. `from` may be null for the first version, in
 * which case every answered section reads as added.
 */
export function diffCanvasVersions(
  from: CanvasVersion | null,
  to: CanvasVersion,
): CanvasVersionDiff {
  const changes: SectionChange[] = CANVAS_SECTIONS.map((section) => {
    const before = from?.sections[section];
    const after = to.sections[section];
    const beforeText = (before?.text ?? "").trim();
    const afterText = (after?.text ?? "").trim();
    const change: SectionChange["change"] =
      beforeText === afterText
        ? "unchanged"
        : !beforeText
          ? "added"
          : !afterText
            ? "removed"
            : "edited";
    return {
      section,
      change,
      confidenceChanged: (before?.confidence ?? "unknown") !== (after?.confidence ?? "unknown"),
      fromLength: beforeText.length,
      toLength: afterText.length,
      fromConfidence: before?.confidence ?? "unknown",
      toConfidence: after?.confidence ?? "unknown",
    };
  });
  const changedSections = changes
    .filter((entry) => entry.change !== "unchanged" || entry.confidenceChanged)
    .map((entry) => entry.section);
  const completenessDelta = to.completeness - (from?.completeness ?? 0);
  return {
    fromVersion: from?.version ?? null,
    toVersion: to.version,
    changes,
    changedSections,
    completenessDelta,
    headline:
      changedSections.length === 0
        ? "No section changed between these versions"
        : `${changedSections.length} section(s) changed · completeness ${
            completenessDelta >= 0 ? "+" : ""
          }${completenessDelta}%`,
  };
}

/** Version index rows for the admin history table, newest first. */
export function versionHistoryRows(versions: readonly CanvasVersion[]): CanvasVersion[] {
  return [...versions].sort((a, b) => b.version - a.version);
}

export function canvasVersionsToCsv(
  versions: readonly CanvasVersion[],
  language: ReportLanguage = "en",
): string {
  const t = reportStrings(language);
  const header = [t.version, t.generated, t.sectionsAnswered, "%", "Note"];
  const rows = versionHistoryRows(versions).map((version) => [
    version.version,
    version.createdAt,
    `${version.answered}/${CANVAS_SECTIONS.length}`,
    version.completeness,
    version.note ?? "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Rebuilds a stored row into a normalized, safe version record. */
export function normalizeCanvasVersion(row: {
  id: string;
  workshop_id: string;
  version: number;
  sections: unknown;
  completeness?: number | null;
  answered?: number | null;
  note?: string | null;
  created_by?: string | null;
  created_at: string;
}): CanvasVersion {
  const sections = normalizeCanvasSections(row.sections);
  const readiness = assessCanvas(sections);
  return {
    id: row.id,
    workshopId: row.workshop_id,
    version: Number(row.version),
    sections,
    completeness: Number(row.completeness ?? readiness.completeness),
    answered: Number(row.answered ?? readiness.answered),
    note: row.note ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}
