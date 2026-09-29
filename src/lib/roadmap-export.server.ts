/**
 * Server-only loader for roadmap exports.
 *
 * Reads the portfolio and its membership rows with the caller's RLS-scoped
 * client, hydrates use case titles, and returns the same enriched
 * `RoadmapItem[]` the board renders — so a streamed export matches the screen.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildRoadmapItems, type RoadmapItem } from "@/lib/roadmap";
import type {
  DeliveryStage,
  FundingState,
  PortfolioEntry,
  PortfolioItemDecision,
} from "@/lib/portfolio-model";

type AnyClient = SupabaseClient<never, never, never>;

type ItemRow = {
  use_case_id: string;
  rank: number | null;
  decision: string | null;
  target_period: string | null;
  funding_state: string | null;
  next_action: string | null;
  notes: string | null;
  added_at: string | null;
  updated_at: string | null;
  delivery_stage: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  milestone: string | null;
  delivery_owner: string | null;
  depends_on: string[] | null;
  blocked_reason: string | null;
  gate_key: string | null;
  roadmap_status: string | null;
};

const optional = (value: string | null | undefined) => value?.trim() || undefined;

export interface RoadmapExportData {
  portfolioName: string | null;
  items: RoadmapItem[];
}

export async function loadRoadmapExportData(
  client: AnyClient,
  portfolioId: string,
  period?: string,
): Promise<RoadmapExportData> {
  const portfolio = await client
    .from("portfolios")
    .select("id, name")
    .eq("id", portfolioId)
    .maybeSingle();
  if (portfolio.error) throw new Error(portfolio.error.message);
  if (!portfolio.data) return { portfolioName: null, items: [] };

  const itemsResult = await client
    .from("portfolio_items")
    .select(
      "use_case_id, rank, decision, target_period, funding_state, next_action, notes, added_at, updated_at, delivery_stage, planned_start_date, planned_end_date, milestone, delivery_owner, depends_on, blocked_reason, gate_key, roadmap_status",
    )
    .eq("portfolio_id", portfolioId);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  const rows = (itemsResult.data ?? []) as unknown as ItemRow[];

  const ids = [...new Set(rows.map((row) => row.use_case_id))];
  const titles = new Map<string, { title: string; slug: string }>();
  if (ids.length > 0) {
    const useCases = await client.from("use_cases").select("id, title, slug").in("id", ids);
    for (const uc of (useCases.data ?? []) as unknown as {
      id: string;
      title: string;
      slug: string;
    }[]) {
      titles.set(uc.id, { title: uc.title, slug: uc.slug });
    }
  }

  const entries: PortfolioEntry[] = rows.map((row) => ({
    useCaseId: row.use_case_id,
    useCaseTitle: titles.get(row.use_case_id)?.title,
    useCaseSlug: titles.get(row.use_case_id)?.slug,
    rank: row.rank,
    decision: (row.decision ?? "under_review") as PortfolioItemDecision,
    targetPeriod: optional(row.target_period),
    fundingState: (row.funding_state ?? "unfunded") as FundingState,
    nextAction: optional(row.next_action),
    notes: optional(row.notes),
    addedAt: row.added_at ?? "",
    updatedAt: row.updated_at ?? "",
    deliveryStage: (row.delivery_stage ?? "unscheduled") as DeliveryStage,
    plannedStartDate: optional(row.planned_start_date),
    plannedEndDate: optional(row.planned_end_date),
    milestone: optional(row.milestone),
    deliveryOwner: optional(row.delivery_owner),
    dependsOn: row.depends_on ?? [],
    blockedReason: optional(row.blocked_reason),
    gateKey: optional(row.gate_key),
    roadmapStatus: (row.roadmap_status ?? "planned") as PortfolioEntry["roadmapStatus"],
  }));

  const all = buildRoadmapItems(entries);
  const items = period ? all.filter((item) => (item.period ?? "") === period) : all;
  const name = (portfolio.data as unknown as { name?: string | null }).name ?? null;
  return { portfolioName: name, items };
}
