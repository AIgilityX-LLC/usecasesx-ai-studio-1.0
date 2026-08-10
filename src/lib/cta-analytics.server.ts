/**
 * Server-only aggregation for the CTA conversion dashboard.
 *
 * Reads CTA events for a window, then buckets them by funnel stage, page,
 * device and day. Demo and internal activity are excluded upstream.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyRow,
  bump,
  sorted,
  stageForCta,
  type CtaAnalytics,
  type FunnelRow,
  type FunnelStage,
} from "@/lib/cta-analytics.model";

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
