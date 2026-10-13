/**
 * RoadmapX™ export.
 *
 * Exports exactly what is on screen: the currently filtered Now / Next / Later
 * items, with the columns the workspace has chosen. Pure builders plus thin
 * browser helpers. Every export includes a confidentiality envelope (FR-10).
 */

import saveAs from "file-saver";

import { toRoadmapRows, type RoadmapItem } from "@/lib/roadmap";
import {
  buildExportEnvelope,
  envelopeHeaderLines,
  type ConfidentialityMarking,
  type ExportEnvelope,
} from "@/lib/roadmap/export-envelope";
import type { ImplementationBrief } from "@/lib/roadmap/implementation-brief";
import { BRIEF_FIELD_KEYS, BRIEF_FIELD_LABEL } from "@/lib/roadmap/implementation-brief";

export type RoadmapExportFormat = "csv" | "json" | "xlsx" | "pdf";

export type RoadmapRow = ReturnType<typeof toRoadmapRows>[number];
export type RoadmapColumnKey = keyof RoadmapRow;

export function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const ROADMAP_EXPORT_COLUMNS: { key: RoadmapColumnKey; label: string }[] = [
  { key: "use_case", label: "Use case" },
  { key: "stage", label: "Wave / stage" },
  { key: "target_period", label: "Target period" },
  { key: "milestone", label: "Milestone" },
  { key: "owner", label: "Owner" },
  { key: "planned_start", label: "Planned start" },
  { key: "planned_end", label: "Planned end" },
  { key: "next_action", label: "Next action" },
  { key: "decision", label: "Decision" },
  { key: "funding_state", label: "Funding state" },
  { key: "roadmap_status", label: "Roadmap status" },
  { key: "gate", label: "Decision gate" },
  { key: "blocked_reason", label: "Blocker" },
  { key: "depends_on", label: "Depends on" },
  { key: "flags", label: "Flags" },
];

export const DEFAULT_ROADMAP_COLUMNS: RoadmapColumnKey[] = ROADMAP_EXPORT_COLUMNS.map((c) => c.key);

/** Keeps only known keys, in the canonical column order. Empty input = all columns. */
export function normalizeColumns(keys?: readonly string[] | null): RoadmapColumnKey[] {
  if (!keys || keys.length === 0) return [...DEFAULT_ROADMAP_COLUMNS];
  const wanted = new Set(keys);
  const picked = DEFAULT_ROADMAP_COLUMNS.filter((key) => wanted.has(key));
  return picked.length > 0 ? picked : [...DEFAULT_ROADMAP_COLUMNS];
}

export interface RoadmapExportMeta {
  portfolioName?: string;
  tenantName?: string;
  workspaceId?: string;
  period?: string;
  exportedAt?: string;
  confidentiality?: ConfidentialityMarking;
  recordVersions?: string[];
  scoringVersions?: string[];
}

function envelopeFromMeta(items: RoadmapItem[], meta: RoadmapExportMeta): ExportEnvelope {
  return buildExportEnvelope({
    tenantName: meta.tenantName,
    workspaceId: meta.workspaceId,
    portfolioName: meta.portfolioName,
    filters: { period: meta.period ?? null },
    recordVersions: meta.recordVersions,
    scoringVersions: meta.scoringVersions,
    confidentiality: meta.confidentiality,
    itemCount: items.length,
    now: meta.exportedAt ? new Date(meta.exportedAt) : undefined,
  });
}

/** One row per roadmap item currently in view, with envelope preamble. */
export function roadmapToCsv(
  items: RoadmapItem[],
  columns?: readonly string[],
  meta: RoadmapExportMeta = {},
): string {
  const selected = normalizeColumns(columns);
  const labels = new Map(ROADMAP_EXPORT_COLUMNS.map((c) => [c.key, c.label] as const));
  const rows = toRoadmapRows(items);
  const env = envelopeFromMeta(items, meta);
  const lines = [
    ...envelopeHeaderLines(env),
    selected.map((key) => toCsvCell(labels.get(key) ?? key)).join(","),
    ...rows.map((row) => selected.map((key) => toCsvCell(row[key])).join(",")),
  ];
  return lines.join("\r\n");
}

const JSON_FIELD_BY_COLUMN: Record<RoadmapColumnKey, string> = {
  use_case: "title",
  stage: "stage",
  target_period: "targetPeriod",
  milestone: "milestone",
  owner: "owner",
  planned_start: "plannedStartDate",
  planned_end: "plannedEndDate",
  next_action: "nextAction",
  decision: "decision",
  funding_state: "fundingState",
  roadmap_status: "roadmapStatus",
  gate: "gateKey",
  blocked_reason: "blockedReason",
  depends_on: "dependsOn",
  flags: "flags",
};

export function roadmapToJson(
  items: RoadmapItem[],
  meta: RoadmapExportMeta = {},
  columns?: readonly string[],
): string {
  const selected = normalizeColumns(columns);
  const fields = new Set(selected.map((key) => JSON_FIELD_BY_COLUMN[key]));
  const pick = (record: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(record).filter(([key]) => fields.has(key)));
  const env = envelopeFromMeta(items, meta);

  return JSON.stringify(
    {
      ...env,
      exportedAt: env.generatedAt,
      portfolio: env.portfolioName,
      periodFilter: meta.period ?? null,
      columns: selected,
      items: items.map((item) => ({
        useCaseId: item.useCaseId,
        ...pick({
          title: item.title,
          stage: item.stage,
          targetPeriod: item.period ?? null,
          milestone: item.entry.milestone ?? null,
          owner: item.entry.deliveryOwner ?? null,
          plannedStartDate: item.entry.plannedStartDate ?? null,
          plannedEndDate: item.entry.plannedEndDate ?? null,
          nextAction: item.entry.nextAction ?? null,
          decision: item.entry.decision,
          fundingState: item.entry.fundingState,
          roadmapStatus: item.entry.roadmapStatus ?? "planned",
          gateKey: item.entry.gateKey ?? null,
          blockedReason: item.entry.blockedReason ?? null,
          dependsOn: item.dependencies.map((d) => ({ useCaseId: d.useCaseId, title: d.title })),
          flags: item.flags,
        }),
      })),
    },
    null,
    2,
  );
}

/** SpreadsheetML XML that Excel opens (no new dependency). Saved as .xlsx by convention. */
export function roadmapToXlsx(
  items: RoadmapItem[],
  columns?: readonly string[],
  meta: RoadmapExportMeta = {},
): string {
  const selected = normalizeColumns(columns);
  const labels = new Map(ROADMAP_EXPORT_COLUMNS.map((c) => [c.key, c.label] as const));
  const rows = toRoadmapRows(items);
  const env = envelopeFromMeta(items, meta);
  const esc = (v: string) =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const metaRows = envelopeHeaderLines(env)
    .map(
      (line) =>
        `<Row><Cell><Data ss:Type="String">${esc(line.replace(/^#\s*/, ""))}</Data></Cell></Row>`,
    )
    .join("");
  const header = `<Row>${selected
    .map((key) => `<Cell><Data ss:Type="String">${esc(labels.get(key) ?? key)}</Data></Cell>`)
    .join("")}</Row>`;
  const body = rows
    .map(
      (row) =>
        `<Row>${selected
          .map((key) => `<Cell><Data ss:Type="String">${esc(String(row[key] ?? ""))}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Roadmap">
  <Table>${metaRows}${header}${body}</Table>
 </Worksheet>
</Workbook>`;
}

export async function roadmapToPdfBlob(
  items: RoadmapItem[],
  columns?: readonly string[],
  meta: RoadmapExportMeta = {},
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const selected = normalizeColumns(columns);
  const labels = new Map(ROADMAP_EXPORT_COLUMNS.map((c) => [c.key, c.label] as const));
  const rows = toRoadmapRows(items);
  const env = envelopeFromMeta(items, meta);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const margin = 36;
  const pageW = pdf.internal.pageSize.getWidth();
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Roadmap export", margin, y);
  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const line of envelopeHeaderLines(env)) {
    pdf.text(line.replace(/^#\s*/, ""), margin, y);
    y += 12;
    if (y > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }
  }
  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text(
    selected
      .map((k) => labels.get(k) ?? k)
      .join(" | ")
      .slice(0, 140),
    margin,
    y,
  );
  y += 14;
  pdf.setFont("helvetica", "normal");
  for (const row of rows) {
    const line = selected
      .map((k) => String(row[k] ?? ""))
      .join(" | ")
      .slice(0, 160);
    const wrapped = pdf.splitTextToSize(line, pageW - margin * 2);
    if (y + wrapped.length * 11 > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(wrapped, margin, y);
    y += wrapped.length * 11 + 4;
  }
  return pdf.output("blob");
}

export function briefToAccessibleText(brief: ImplementationBrief, env: ExportEnvelope): string {
  const lines = [
    ...envelopeHeaderLines(env),
    "",
    `${brief.title} (v${brief.version}, ${brief.status})`,
    "",
  ];
  for (const key of BRIEF_FIELD_KEYS) {
    lines.push(`## ${BRIEF_FIELD_LABEL[key]}`);
    lines.push(brief[key]?.trim() || "(not recorded)");
    lines.push("");
  }
  if (brief.handoffLinks.length) {
    lines.push("## Handoff links");
    for (const link of brief.handoffLinks) lines.push(`- ${link.label}: ${link.url}`);
  }
  return lines.join("\n");
}

export function roadmapExportFileName(format: RoadmapExportFormat, period?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const scope = period ? `-${period.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : "";
  const ext = format === "xlsx" ? "xml" : format;
  return `roadmap${scope}-${date}.${ext === "xml" ? "xlsx" : ext}`;
}

/** Browser-only helper — builds the payload and triggers a download. */
export async function downloadRoadmap(
  items: RoadmapItem[],
  format: RoadmapExportFormat,
  meta: RoadmapExportMeta = {},
  columns?: readonly string[],
) {
  const name = roadmapExportFileName(format, meta.period);
  if (format === "pdf") {
    const blob = await roadmapToPdfBlob(items, columns, meta);
    saveAs(blob, name.replace(/\.xml$/, ".pdf"));
    return;
  }
  if (format === "xlsx") {
    const content = roadmapToXlsx(items, columns, meta);
    saveAs(
      new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8" }),
      name.endsWith(".xlsx") ? name : `${name}.xlsx`,
    );
    return;
  }
  const content =
    format === "csv" ? roadmapToCsv(items, columns, meta) : roadmapToJson(items, meta, columns);
  const type = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
  saveAs(new Blob([content], { type }), name);
}
