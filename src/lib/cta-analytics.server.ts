/**
 * Server-only aggregation for the CTA conversion dashboard.
 *
 * Reads the reportable CTA view so demo and internal activity stay out of the
 * funnel, then buckets events by stage, page, device and day.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

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

function emptyRow(key: string): FunnelRow {
  return { key, awareness: 0, consideration: 0, intent: 0, conversion: 0, total: 0 };
}

function bump(map: Map<string, FunnelRow>, key: string, stage: FunnelStage) {
  const row = map.get(key) ?? emptyRow(key);
  row[stage] += 1;
  row.total += 1;
  map.set(key, row);
}

function sorted(map: Map<string, FunnelRow>, byKey = false): FunnelRow[] {
  const rows = Array.from(map.values());
  return byKey
    ? rows.sort((a, b) => a.key.localeCompare(b.key))
    : rows.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

export function stageForCta(cta: string): FunnelStage {
  return STAGE_BY_CTA[cta] ?? "awareness";
}

export interface CtaAnalyticsInput {
  from: string;
  to: string;
  device?: "desktop" | "tablet" | "mobile" | null;
}

/** Aggregates the reportable CTA events for a date window. */
export async function aggregateCtaEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: CtaAnalyticsInput,
): Promise<CtaAnalytics> {
  let query = supabase
    .from("cta_events")
    .select("cta, source_page, device, created_at")
    .gte("created_at", input.from)
    .lte("created_at", input.to)
    .order("created_at", { ascending: true })
    .limit(20000);
  if (input.device) query = query.eq("device", input.device);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const totals = emptyRow("all");
  const byPage = new Map<string, FunnelRow>();
  const byDevice = new Map<string, FunnelRow>();
  const byDay = new Map<string, FunnelRow>();
  const byCta = new Map<string, { cta: string; stage: FunnelStage; count: number }>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    const cta = String(row.cta ?? "unknown");
    const stage = stageForCta(cta);
    totals[stage] += 1;
    totals.total += 1;
    bump(byPage, String(row.source_page ?? "(unknown)"), stage);
    bump(byDevice, String(row.device ?? "unknown"), stage);
    bump(byDay, String(row.created_at ?? "").slice(0, 10) || "(unknown)", stage);
    const entry = byCta.get(cta) ?? { cta, stage, count: 0 };
    entry.count += 1;
    byCta.set(cta, entry);
  }

  return {
    from: input.from,
    to: input.to,
    totals,
    byPage: sorted(byPage).slice(0, 100),
    byDevice: sorted(byDevice),
    byDay: sorted(byDay, true),
    byCta: Array.from(byCta.values()).sort((a, b) => b.count - a.count),
  };
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
