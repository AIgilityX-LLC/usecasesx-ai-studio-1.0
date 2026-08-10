/**
 * Client-safe CTA funnel model: stage mapping, row shapes and CSV rendering.
 * Imported by both the server aggregator and the admin dashboard.
 */
export type FunnelStage = "awareness" | "consideration" | "intent" | "conversion";

/** CTA → funnel stage. Anything unmapped counts as awareness. */
const STAGE_BY_CTA: Record<string, FunnelStage> = {
  view_use_case: "awareness",
  search_used: "awareness",
  filter_used: "awareness",
  results_load_more: "awareness",
  collection_selected: "consideration",
  share_use_case: "consideration",
  print_use_case: "consideration",
  save_to_shortlist: "intent",
  customize_in_studio: "intent",
  conversion_intent: "intent",
  cta_clicked: "intent",
  custom_use_case_requested: "conversion",
  contact_form_submitted: "conversion",
};

export const FUNNEL_ORDER: FunnelStage[] = ["awareness", "consideration", "intent", "conversion"];

export interface FunnelRow {
  key: string;
  awareness: number;
  consideration: number;
  intent: number;
  conversion: number;
  total: number;
}

export interface CtaAnalytics {
  from: string;
  to: string;
  totals: FunnelRow;
  byPage: FunnelRow[];
  byDevice: FunnelRow[];
  byDay: FunnelRow[];
  byCta: { cta: string; stage: FunnelStage; count: number }[];
}

export function emptyRow(key: string): FunnelRow {
  return { key, awareness: 0, consideration: 0, intent: 0, conversion: 0, total: 0 };
}

export function bump(map: Map<string, FunnelRow>, key: string, stage: FunnelStage) {
  const row = map.get(key) ?? emptyRow(key);
  row[stage] += 1;
  row.total += 1;
  map.set(key, row);
}

export function sorted(map: Map<string, FunnelRow>, byKey = false): FunnelRow[] {
  const rows = Array.from(map.values());
  return byKey
    ? rows.sort((a, b) => a.key.localeCompare(b.key))
    : rows.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

export function stageForCta(cta: string): FunnelStage {
  return STAGE_BY_CTA[cta] ?? "awareness";
}

/** Flat CSV of every breakdown, one row per dimension value. */
export function ctaAnalyticsToCsv(analytics: CtaAnalytics): string {
  const header = [
    "dimension",
    "value",
    "awareness",
    "consideration",
    "intent",
    "conversion",
    "total",
  ];
  const lines = [header.join(",")];
  const push = (dimension: string, rows: FunnelRow[]) => {
    for (const row of rows) {
      lines.push(
        [
          dimension,
          `"${row.key.replace(/"/g, '""')}"`,
          row.awareness,
          row.consideration,
          row.intent,
          row.conversion,
          row.total,
        ].join(","),
      );
    }
  };
  push("all", [analytics.totals]);
  push("page", analytics.byPage);
  push("device", analytics.byDevice);
  push("day", analytics.byDay);
  return lines.join("\n");
}
