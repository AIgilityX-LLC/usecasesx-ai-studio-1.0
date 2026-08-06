/**
 * RoadmapX™ export.
 *
 * Exports exactly what is on screen: the currently filtered Now / Next / Later
 * items, with the same fields the board renders. Pure builders plus a thin
 * browser download helper.
 */

import saveAs from "file-saver";

import { toRoadmapRows, type RoadmapItem } from "@/lib/roadmap";

export type RoadmapExportFormat = "csv" | "json";

export function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_HEADERS: { key: keyof ReturnType<typeof toRoadmapRows>[number]; label: string }[] = [
  { key: "use_case", label: "Use case" },
  { key: "stage", label: "Stage" },
  { key: "target_period", label: "Target period" },
  { key: "milestone", label: "Milestone" },
  { key: "owner", label: "Owner" },
  { key: "planned_start", label: "Planned start" },
  { key: "planned_end", label: "Planned end" },
  { key: "next_action", label: "Next action" },
  { key: "decision", label: "Decision" },
  { key: "funding_state", label: "Funding state" },
  { key: "blocked_reason", label: "Blocker" },
  { key: "depends_on", label: "Depends on" },
  { key: "flags", label: "Flags" },
];

/** One row per roadmap item currently in view. */
export function roadmapToCsv(items: RoadmapItem[]): string {
  const rows = toRoadmapRows(items);
  const lines = [
    CSV_HEADERS.map((h) => toCsvCell(h.label)).join(","),
    ...rows.map((row) => CSV_HEADERS.map((h) => toCsvCell(row[h.key])).join(",")),
  ];
  return lines.join("\r\n");
}

export interface RoadmapExportMeta {
  portfolioName?: string;
  /** The quarter/wave filter applied, if any. */
  period?: string;
  exportedAt?: string;
}

export function roadmapToJson(items: RoadmapItem[], meta: RoadmapExportMeta = {}): string {
  return JSON.stringify(
    {
      exportedAt: meta.exportedAt ?? new Date().toISOString(),
      portfolio: meta.portfolioName ?? null,
      periodFilter: meta.period ?? null,
      itemCount: items.length,
      items: items.map((item) => ({
        useCaseId: item.useCaseId,
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
        blockedReason: item.entry.blockedReason ?? null,
        dependsOn: item.dependencies.map((d) => ({ useCaseId: d.useCaseId, title: d.title })),
        flags: item.flags,
      })),
    },
    null,
    2,
  );
}

export function roadmapExportFileName(format: RoadmapExportFormat, period?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const scope = period ? `-${period.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : "";
  return `roadmap${scope}-${date}.${format}`;
}

/** Browser-only helper — builds the payload and triggers a download. */
export function downloadRoadmap(
  items: RoadmapItem[],
  format: RoadmapExportFormat,
  meta: RoadmapExportMeta = {},
) {
  const content = format === "csv" ? roadmapToCsv(items) : roadmapToJson(items, meta);
  const type = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
  saveAs(new Blob([content], { type }), roadmapExportFileName(format, meta.period));
}
