/**
 * Sovereign Public Value Canvas™ exports with language selection (pure).
 *
 * The English-only builders in `workshops.public-value.ts` stay as they are;
 * these localise the report chrome (headings, columns, controlled vocabularies)
 * while reproducing recorded answers verbatim, because an evidence artefact must
 * quote what was written rather than a translation of it.
 */

import {
  CANVAS_META,
  CANVAS_SECTIONS,
  assessCanvas,
  type CanvasSections,
} from "@/lib/workshops.public-value";
import {
  REPORT_LANGUAGE_LABEL,
  reportStrings,
  type ReportLanguage,
} from "@/lib/i18n/report-language";
import {
  canvasCsvCell,
  canvasDocumentsToCsv,
  type CanvasDocument,
} from "@/lib/workshops.canvas-evidence";

// Formula-neutralizing encoder: canvas answers are user-entered text.
const csvCell = (value: string | number): string => canvasCsvCell(value);

export type CanvasExportInput = {
  workshopTitle: string;
  organisation?: string;
  generatedAt: string;
  sections: CanvasSections;
  language?: ReportLanguage;
  /** Included as an appendix when supporting files are attached. */
  documents?: readonly CanvasDocument[];
  /** Set when exporting a prior version rather than the live canvas. */
  version?: number | null;
};

export function localizedCanvasToCsv(input: CanvasExportInput): string {
  const language = input.language ?? "en";
  const t = reportStrings(language);
  const body = CANVAS_META.map((meta) => [
    t.sections[meta.key],
    meta.purpose,
    input.sections[meta.key]?.text ?? "",
    t.confidence[input.sections[meta.key]?.confidence ?? "unknown"],
  ]);
  const canvas = [[...t.canvasColumns], ...body]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  if (!input.documents || input.documents.length === 0) return canvas;
  return `${canvas}\r\n\r\n${csvCell(t.documents)}\r\n${canvasDocumentsToCsv(
    input.documents,
    language,
  )}`;
}

export function localizedCanvasToMarkdown(input: CanvasExportInput): string {
  const language = input.language ?? "en";
  const t = reportStrings(language);
  const readiness = assessCanvas(input.sections);
  const lines: string[] = [
    `# ${t.canvasTitle} — ${input.workshopTitle}`,
    ``,
    `${t.organisation}: ${input.organisation || t.notRecorded}`,
    `${t.generated} ${input.generatedAt}`,
    `${t.language}: ${REPORT_LANGUAGE_LABEL[language]}`,
    ...(input.version ? [`${t.version}: ${input.version}`] : []),
    ``,
    `**${readiness.answered}/${readiness.total} ${t.sectionsAnswered} (${readiness.completeness}%)**`,
    ``,
    `_${t.freeTextNotice}_`,
    ``,
  ];
  for (const meta of CANVAS_META) {
    const entry = input.sections[meta.key];
    lines.push(
      `## ${t.sections[meta.key]}`,
      ``,
      `_${meta.purpose}_`,
      ``,
      `${t.canvasColumns[3]}: ${t.confidence[entry?.confidence ?? "unknown"]}`,
      ``,
      (entry?.text ?? "").trim() || t.notRecorded,
      ``,
    );
  }
  const documents = input.documents ?? [];
  if (documents.length > 0) {
    lines.push(
      `## ${t.documents}`,
      ``,
      `| ${t.documentColumns.join(" | ")} |`,
      `| --- | --- | --- | --- | --- |`,
    );
    for (const document of documents) {
      lines.push(
        `| ${t.sections[document.section]} | ${document.label.replace(/\|/g, "\\|")} | ${
          document.mimeType
        } | ${document.sizeBytes} | ${document.createdAt} |`,
      );
    }
    lines.push(``);
  }
  return lines.join("\n");
}

/** Header lines shared by the canvas PDF and any summary block. */
export function buildCanvasSummaryLines(input: CanvasExportInput): string[] {
  const t = reportStrings(input.language ?? "en");
  const readiness = assessCanvas(input.sections);
  return [
    `${t.organisation}: ${input.organisation || t.notRecorded}`,
    `${t.generated} ${input.generatedAt}`,
    ...(input.version ? [`${t.version}: ${input.version}`] : []),
    `${readiness.answered}/${readiness.total} ${t.sectionsAnswered} (${readiness.completeness}%)`,
  ];
}

/** One block per section for the PDF renderer: heading plus wrapped answer. */
export function buildCanvasPdfBlocks(
  input: CanvasExportInput,
): Array<{ heading: string; evidence: string; body: string }> {
  const t = reportStrings(input.language ?? "en");
  return CANVAS_SECTIONS.map((section, index) => {
    const entry = input.sections[section];
    return {
      heading: `${index + 1}. ${t.sections[section]}`,
      evidence: `${t.canvasColumns[3]}: ${t.confidence[entry?.confidence ?? "unknown"]}`,
      body: (entry?.text ?? "").trim() || t.notRecorded,
    };
  });
}
