/**
 * RoadmapX™ export.
 *
 * Exports exactly what is on screen: the currently filtered Now / Next / Later
 * items, with the columns the workspace has chosen. Pure builders plus thin
 * browser helpers (local download, and a streamed server-side download for
 * large sets).
 */

import saveAs from "file-saver";

import { toRoadmapRows, type RoadmapItem } from "@/lib/roadmap";

export type RoadmapExportFormat = "csv" | "json";

export type RoadmapRow = ReturnType<typeof toRoadmapRows>[number];
export type RoadmapColumnKey = keyof RoadmapRow;

export function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const ROADMAP_EXPORT_COLUMNS: { key: RoadmapColumnKey; label: string }[] = [
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

export const DEFAULT_ROADMAP_COLUMNS: RoadmapColumnKey[] = ROADMAP_EXPORT_COLUMNS.map((c) => c.key);

/** Keeps only known keys, in the canonical column order. Empty input = all columns. */
export function normalizeColumns(keys?: readonly string[] | null): RoadmapColumnKey[] {
  if (!keys || keys.length === 0) return [...DEFAULT_ROADMAP_COLUMNS];
  const wanted = new Set(keys);
  const picked = DEFAULT_ROADMAP_COLUMNS.filter((key) => wanted.has(key));
  return picked.length > 0 ? picked : [...DEFAULT_ROADMAP_COLUMNS];
}

/** One row per roadmap item currently in view. */
export function roadmapToCsv(items: RoadmapItem[], columns?: readonly string[]): string {
  const selected = normalizeColumns(columns);
  const labels = new Map(ROADMAP_EXPORT_COLUMNS.map((c) => [c.key, c.label] as const));
  const rows = toRoadmapRows(items);
  const lines = [
    selected.map((key) => toCsvCell(labels.get(key) ?? key)).join(","),
    ...rows.map((row) => selected.map((key) => toCsvCell(row[key])).join(",")),
  ];
  return lines.join("\r\n");
}

export interface RoadmapExportMeta {
  portfolioName?: string;
  /** The quarter/wave filter applied, if any. */
  period?: string;
  exportedAt?: string;
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

  return JSON.stringify(
    {
      exportedAt: meta.exportedAt ?? new Date().toISOString(),
      portfolio: meta.portfolioName ?? null,
      periodFilter: meta.period ?? null,
      itemCount: items.length,
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
  columns?: readonly string[],
) {
  const content =
    format === "csv" ? roadmapToCsv(items, columns) : roadmapToJson(items, meta, columns);
  const type = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
  saveAs(new Blob([content], { type }), roadmapExportFileName(format, meta.period));
}
