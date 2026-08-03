/**
 * Portfolio export.
 *
 * Pure builders (CSV / JSON / print-ready sections) plus thin browser download
 * helpers. Exports carry only the portfolio's own decision record — the
 * authoritative use case and its scores are never rewritten by an export.
 *
 * Columns are selectable: the caller passes the ordered list of column keys it
 * wants and every format (CSV, JSON table, PDF) honours the same selection.
 */

import jsPDF from "jspdf";
import saveAs from "file-saver";

import { exportDeliverablePDF, type ExportDoc } from "@/lib/deliverables.export";
import {
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISIONS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  PORTFOLIO_VISIBILITY_LABELS,
  REVIEW_CADENCE_LABELS,
  type PortfolioEntry,
} from "@/lib/portfolio-model";
import type { Portfolio } from "@/lib/usecasex.store";

export type PortfolioExportFormat = "csv" | "json" | "pdf" | "board-pack";

export type PortfolioExportColumnKey =
  | "rank"
  | "title"
  | "slug"
  | "decision"
  | "targetPeriod"
  | "funding"
  | "nextAction"
  | "notes"
  | "added";

export interface PortfolioExportColumnDef {
  key: PortfolioExportColumnKey;
  label: string;
  /** Relative width hint used by the board-pack table layout. */
  weight: number;
  /** Human-facing text used by CSV and PDF. */
  value: (entry: PortfolioEntry) => string;
  /** Raw stored value used by the JSON export. */
  raw?: (entry: PortfolioEntry) => unknown;
}

export const PORTFOLIO_EXPORT_COLUMN_DEFS: PortfolioExportColumnDef[] = [
  { key: "rank", label: "Rank", weight: 0.5, value: (e) => (e.rank == null ? "" : String(e.rank)) },
  { key: "title", label: "Use case", weight: 2.2, value: (e) => e.useCaseTitle ?? "" },
  { key: "slug", label: "Slug", weight: 1.4, value: (e) => e.useCaseSlug ?? "" },
  {
    key: "decision",
    label: "Decision",
    weight: 1,
    value: (e) => PORTFOLIO_ITEM_DECISION_LABELS[e.decision] ?? e.decision,
    raw: (e) => e.decision,
  },
  { key: "targetPeriod", label: "Target period", weight: 1, value: (e) => e.targetPeriod ?? "" },
  {
    key: "funding",
    label: "Funding",
    weight: 1,
    value: (e) => FUNDING_STATE_LABELS[e.fundingState] ?? e.fundingState,
    raw: (e) => e.fundingState,
  },
  { key: "nextAction", label: "Next action", weight: 1.8, value: (e) => e.nextAction ?? "" },
  { key: "notes", label: "Notes", weight: 1.8, value: (e) => e.notes ?? "" },
  {
    key: "added",
    label: "Added",
    weight: 0.9,
    value: (e) => (e.addedAt ? new Date(e.addedAt).toISOString().slice(0, 10) : ""),
  },
];

export const DEFAULT_PORTFOLIO_EXPORT_COLUMNS: PortfolioExportColumnKey[] =
  PORTFOLIO_EXPORT_COLUMN_DEFS.map((c) => c.key);

/** Legacy label list — the full default column set, in order. */
export const PORTFOLIO_EXPORT_COLUMNS = PORTFOLIO_EXPORT_COLUMN_DEFS.map(
  (c) => c.label,
) as readonly string[];

export interface PortfolioExportOptions {
  columns?: PortfolioExportColumnKey[];
  /** When set, only entries with these decisions are exported. */
  decisions?: string[];
}

function resolveColumns(columns?: PortfolioExportColumnKey[]): PortfolioExportColumnDef[] {
  if (!columns || columns.length === 0) return PORTFOLIO_EXPORT_COLUMN_DEFS;
  const selected = columns
    .map((key) => PORTFOLIO_EXPORT_COLUMN_DEFS.find((c) => c.key === key))
    .filter((c): c is PortfolioExportColumnDef => Boolean(c));
  return selected.length > 0 ? selected : PORTFOLIO_EXPORT_COLUMN_DEFS;
}

function resolveEntries(portfolio: Portfolio, options?: PortfolioExportOptions): PortfolioEntry[] {
  const entries = portfolio.entries;
  if (!options?.decisions || options.decisions.length === 0) return entries;
  return entries.filter((entry) => options.decisions?.includes(entry.decision));
}

export function portfolioColumnLabels(options?: PortfolioExportOptions): string[] {
  return resolveColumns(options?.columns).map((c) => c.label);
}

/** RFC-4180 escaping so commas, quotes and newlines survive a spreadsheet. */
export function toCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function portfolioRows(portfolio: Portfolio, options?: PortfolioExportOptions): string[][] {
  const columns = resolveColumns(options?.columns);
  return resolveEntries(portfolio, options).map((entry) => columns.map((c) => c.value(entry)));
}

export function portfolioToCsv(portfolio: Portfolio, options?: PortfolioExportOptions): string {
  const lines = [
    portfolioColumnLabels(options).join(","),
    ...portfolioRows(portfolio, options).map((row) => row.map(toCsvCell).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function portfolioToJson(portfolio: Portfolio, options?: PortfolioExportOptions): string {
  const columns = resolveColumns(options?.columns);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      columns: columns.map((c) => c.key),
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        type: portfolio.type,
        status: portfolio.status,
        objective: portfolio.objective ?? null,
        visibility: portfolio.visibility,
        reviewCadence: portfolio.reviewCadence ?? null,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt ?? null,
      },
      entries: resolveEntries(portfolio, options).map((entry) =>
        Object.fromEntries(
          columns.map((c) => [c.key, c.raw ? c.raw(entry) : c.value(entry) || null]),
        ),
      ),
    },
    null,
    2,
  );
}

export function portfolioSummaryLines(portfolio: Portfolio): string[] {
  return [
    `Type: ${portfolio.type}`,
    `Status: ${portfolio.status}`,
    `Visibility: ${PORTFOLIO_VISIBILITY_LABELS[portfolio.visibility] ?? portfolio.visibility}`,
    `Review cadence: ${
      portfolio.reviewCadence
        ? (REVIEW_CADENCE_LABELS[portfolio.reviewCadence] ?? portfolio.reviewCadence)
        : "Not set"
    }`,
    `Use cases: ${portfolio.entries.length}`,
  ];
}

export function portfolioToExportDoc(
  portfolio: Portfolio,
  options?: PortfolioExportOptions,
): ExportDoc {
  return {
    title: portfolio.name,
    subtitle: portfolio.objective ?? "AI opportunity portfolio",
    sections: [
      { heading: "Portfolio summary", kind: "text", body: portfolioSummaryLines(portfolio).join("\n") },
      {
        heading: "Portfolio decisions",
        kind: "table",
        columns: portfolioColumnLabels(options),
        rows: portfolioRows(portfolio, options),
      },
    ],
  };
}

export function portfolioFileName(portfolio: Portfolio, extension: string): string {
  const slug =
    portfolio.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "portfolio";
  return `${slug}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

/** Counts per decision, used by the board pack cover. */
export function portfolioDecisionCounts(entries: PortfolioEntry[]): Array<[string, number]> {
  return PORTFOLIO_ITEM_DECISIONS.map((decision) => [
    PORTFOLIO_ITEM_DECISION_LABELS[decision],
    entries.filter((e) => e.decision === decision).length,
  ]).filter(([, count]) => (count as number) > 0) as Array<[string, number]>;
}

/**
 * Board-pack PDF: cover sheet, decision summary, then one banded table per
 * decision group with repeating headers and page numbering.
 */
export function exportPortfolioBoardPack(
  portfolio: Portfolio,
  fileName: string,
  options?: PortfolioExportOptions,
) {
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const margin = 40;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const width = pageW - margin * 2;
  const columns = resolveColumns(options?.columns);
  const entries = [...resolveEntries(portfolio, options)].sort(
    (a, b) => (a.rank ?? 9999) - (b.rank ?? 9999),
  );
  const generated = new Date();

  const totalWeight = columns.reduce((sum, c) => sum + c.weight, 0);
  const colWidths = columns.map((c) => (c.weight / totalWeight) * width);
  const colX = colWidths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? margin : (acc[i - 1] as number) + (colWidths[i - 1] as number));
    return acc;
  }, []);

  let y = margin;

  // ---- Cover ----------------------------------------------------------
  pdf.setFillColor(17, 24, 39);
  pdf.rect(0, 0, pageW, 150, "F");
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("PORTFOLIO REVIEW PACK", margin, 56);
  pdf.setFontSize(24);
  pdf.text(pdf.splitTextToSize(portfolio.name, width), margin, 88);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(
    pdf.splitTextToSize(portfolio.objective ?? "AI opportunity portfolio", width),
    margin,
    116,
  );
  pdf.setTextColor(0);
  y = 190;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Portfolio summary", margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  [...portfolioSummaryLines(portfolio), `Generated: ${generated.toLocaleString()}`].forEach(
    (line) => {
      pdf.text(line, margin, y);
      y += 14;
    },
  );

  y += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Decision mix", margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const counts = portfolioDecisionCounts(entries);
  if (counts.length === 0) {
    pdf.text("No entries in scope for this pack.", margin, y);
    y += 14;
  } else {
    counts.forEach(([decisionLabel, count]) => {
      pdf.text(`${decisionLabel}: ${count}`, margin, y);
      y += 14;
    });
  }

  // ---- Decision tables ------------------------------------------------
  const drawHeader = () => {
    pdf.setFillColor(243, 244, 246);
    pdf.rect(margin, y - 11, width, 18, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    columns.forEach((c, i) => {
      pdf.text(
        pdf.splitTextToSize(c.label, (colWidths[i] as number) - 6),
        (colX[i] as number) + 3,
        y,
      );
    });
    y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
  };

  const newPage = () => {
    pdf.addPage();
    y = margin + 10;
  };

  const groups = PORTFOLIO_ITEM_DECISIONS.map((decision) => ({
    decision,
    label: PORTFOLIO_ITEM_DECISION_LABELS[decision],
    rows: entries.filter((e) => e.decision === decision),
  })).filter((g) => g.rows.length > 0);

  groups.forEach((group) => {
    newPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(`${group.label} (${group.rows.length})`, margin, y);
    y += 24;
    drawHeader();

    group.rows.forEach((entry, index) => {
      const cells = columns.map((c, i) =>
        pdf.splitTextToSize(c.value(entry) || "—", (colWidths[i] as number) - 6),
      );
      const rowH = Math.max(...cells.map((lines) => lines.length)) * 11 + 8;
      if (y + rowH > pageH - margin - 20) {
        newPage();
        drawHeader();
      }
      if (index % 2 === 1) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(margin, y - 10, width, rowH, "F");
      }
      cells.forEach((lines, i) => {
        pdf.text(lines, (colX[i] as number) + 3, y);
      });
      y += rowH;
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, y - 8, margin + width, y - 8);
    });
  });

  // ---- Footers --------------------------------------------------------
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(
      `${portfolio.name} · portfolio decisions only — source use cases and scores are unchanged`,
      margin,
      pageH - 20,
    );
    pdf.text(`Page ${page} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
    pdf.setTextColor(0);
  }

  pdf.save(fileName);
}

/** Triggers the browser download. Returns the file name written. */
export function downloadPortfolio(
  portfolio: Portfolio,
  format: PortfolioExportFormat,
  options?: PortfolioExportOptions,
): string {
  if (format === "board-pack") {
    const name = portfolioFileName(portfolio, "board-pack.pdf");
    exportPortfolioBoardPack(portfolio, name, options);
    return name;
  }
  if (format === "pdf") {
    const name = portfolioFileName(portfolio, "pdf");
    exportDeliverablePDF(portfolioToExportDoc(portfolio, options), name);
    return name;
  }
  const isCsv = format === "csv";
  const name = portfolioFileName(portfolio, isCsv ? "csv" : "json");
  const blob = new Blob(
    [isCsv ? portfolioToCsv(portfolio, options) : portfolioToJson(portfolio, options)],
    { type: isCsv ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" },
  );
  saveAs(blob, name);
  return name;
}
