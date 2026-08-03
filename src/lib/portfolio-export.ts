/**
 * Portfolio export.
 *
 * Pure builders (CSV / JSON / print-ready sections) plus thin browser download
 * helpers. Exports carry only the portfolio's own decision record — the
 * authoritative use case and its scores are never rewritten by an export.
 */

import saveAs from "file-saver";

import { exportDeliverablePDF, type ExportDoc } from "@/lib/deliverables.export";
import {
  FUNDING_STATE_LABELS,
  PORTFOLIO_ITEM_DECISION_LABELS,
  PORTFOLIO_VISIBILITY_LABELS,
  REVIEW_CADENCE_LABELS,
} from "@/lib/portfolio-model";
import type { Portfolio } from "@/lib/usecasex.store";

export type PortfolioExportFormat = "csv" | "json" | "pdf";

export const PORTFOLIO_EXPORT_COLUMNS = [
  "Rank",
  "Use case",
  "Slug",
  "Decision",
  "Target period",
  "Funding",
  "Next action",
  "Notes",
  "Added",
] as const;

/** RFC-4180 escaping so commas, quotes and newlines survive a spreadsheet. */
export function toCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function portfolioRows(portfolio: Portfolio): string[][] {
  return portfolio.entries.map((entry) => [
    entry.rank == null ? "" : String(entry.rank),
    entry.useCaseTitle ?? "",
    entry.useCaseSlug ?? "",
    PORTFOLIO_ITEM_DECISION_LABELS[entry.decision] ?? entry.decision,
    entry.targetPeriod ?? "",
    FUNDING_STATE_LABELS[entry.fundingState] ?? entry.fundingState,
    entry.nextAction ?? "",
    entry.notes ?? "",
    entry.addedAt ? new Date(entry.addedAt).toISOString().slice(0, 10) : "",
  ]);
}

export function portfolioToCsv(portfolio: Portfolio): string {
  const lines = [
    PORTFOLIO_EXPORT_COLUMNS.join(","),
    ...portfolioRows(portfolio).map((row) => row.map(toCsvCell).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function portfolioToJson(portfolio: Portfolio): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
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
      entries: portfolio.entries,
    },
    null,
    2,
  );
}

export function portfolioToExportDoc(portfolio: Portfolio): ExportDoc {
  const summary = [
    `Type: ${portfolio.type}`,
    `Status: ${portfolio.status}`,
    `Visibility: ${PORTFOLIO_VISIBILITY_LABELS[portfolio.visibility] ?? portfolio.visibility}`,
    `Review cadence: ${
      portfolio.reviewCadence
        ? (REVIEW_CADENCE_LABELS[portfolio.reviewCadence] ?? portfolio.reviewCadence)
        : "Not set"
    }`,
    `Use cases: ${portfolio.entries.length}`,
  ].join("\n");

  return {
    title: portfolio.name,
    subtitle: portfolio.objective ?? "AI opportunity portfolio",
    sections: [
      { heading: "Portfolio summary", kind: "text", body: summary },
      {
        heading: "Portfolio decisions",
        kind: "table",
        columns: [...PORTFOLIO_EXPORT_COLUMNS],
        rows: portfolioRows(portfolio),
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

/** Triggers the browser download. Returns the file name written. */
export function downloadPortfolio(portfolio: Portfolio, format: PortfolioExportFormat): string {
  if (format === "pdf") {
    const name = portfolioFileName(portfolio, "pdf");
    exportDeliverablePDF(portfolioToExportDoc(portfolio), name);
    return name;
  }
  const isCsv = format === "csv";
  const name = portfolioFileName(portfolio, isCsv ? "csv" : "json");
  const blob = new Blob([isCsv ? portfolioToCsv(portfolio) : portfolioToJson(portfolio)], {
    type: isCsv ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
  });
  saveAs(blob, name);
  return name;
}
