/**
 * RoadmapX™ — pure delivery-sequencing model.
 *
 * UseCasesX records *investment intent*: which use case is Now / Next / Later,
 * the target quarter or wave, the owning person, the next action and any
 * blocking dependency. It deliberately stops short of a scheduling engine —
 * tasks, sprints, effort and resource levelling belong in the PPM tool.
 *
 * No database client, no React. Safe to unit test and to import anywhere.
 */

import {
  DELIVERY_STAGES,
  DELIVERY_STAGE_LABELS,
  type DeliveryStage,
  type PortfolioEntry,
} from "@/lib/portfolio-model";

export const ROADMAP_BOUNDARY_NOTE =
  "UseCasesX holds investment intent, priority, delivery stage and expected benefits. Detailed tasks, sprints and resource plans stay in your project or PPM tool.";

/** Decisions that are excluded from the roadmap — they carry no delivery intent. */
const NON_DELIVERABLE_DECISIONS = new Set(["rejected"]);

export type RoadmapFlag =
  | "overdue"
  | "missing_next_action"
  | "missing_owner"
  | "missing_dates"
  | "blocked"
  | "dependency_later";

export const ROADMAP_FLAG_LABELS: Record<RoadmapFlag, string> = {
  overdue: "Planned end date has passed",
  missing_next_action: "No next action recorded",
  missing_owner: "No delivery owner",
  missing_dates: "No planned dates",
  blocked: "Blocked",
  dependency_later: "Depends on a use case scheduled later",
};

export interface RoadmapItem {
  entry: PortfolioEntry;
  useCaseId: string;
  title: string;
  stage: DeliveryStage;
  /** Target quarter/wave — reuses the portfolio decision field. */
  period?: string;
  flags: RoadmapFlag[];
  /** Resolved dependency titles, in the order stored. */
  dependencies: { useCaseId: string; title: string; stage: DeliveryStage }[];
}

export interface RoadmapLane {
  stage: DeliveryStage;
  label: string;
  items: RoadmapItem[];
}

export interface RoadmapPeriodGroup {
  period: string;
  label: string;
  items: RoadmapItem[];
}

const STAGE_ORDER: Record<DeliveryStage, number> = {
  now: 0,
  next: 1,
  later: 2,
  unscheduled: 3,
};

export const UNSCHEDULED_PERIOD = "__none__";

function titleOf(entry: PortfolioEntry) {
  return entry.useCaseTitle ?? entry.useCaseSlug ?? "Untitled use case";
}

/** True when the entry should appear on the roadmap at all. */
export function isRoadmapEligible(entry: PortfolioEntry) {
  return !NON_DELIVERABLE_DECISIONS.has(entry.decision);
}

/** Derives the attention flags for one entry. `today` is injectable for tests. */
export function deriveFlags(
  entry: PortfolioEntry,
  byId: Map<string, PortfolioEntry>,
  today = new Date(),
): RoadmapFlag[] {
  const flags: RoadmapFlag[] = [];
  const scheduled = entry.deliveryStage !== "unscheduled";

  if (entry.plannedEndDate) {
    const end = new Date(`${entry.plannedEndDate}T23:59:59`);
    if (!Number.isNaN(end.getTime()) && end < today && entry.decision !== "delivered") {
      flags.push("overdue");
    }
  }
  if (!entry.nextAction?.trim()) flags.push("missing_next_action");
  if (scheduled && !entry.deliveryOwner?.trim()) flags.push("missing_owner");
  if (scheduled && !entry.plannedStartDate && !entry.plannedEndDate) flags.push("missing_dates");
  if (entry.blockedReason?.trim()) flags.push("blocked");

  for (const depId of entry.dependsOn ?? []) {
    const dep = byId.get(depId);
    if (!dep) continue;
    if (STAGE_ORDER[dep.deliveryStage] > STAGE_ORDER[entry.deliveryStage]) {
      flags.push("dependency_later");
      break;
    }
  }
  return flags;
}

/** Builds the enriched roadmap items for a portfolio's entries. */
export function buildRoadmapItems(entries: PortfolioEntry[], today = new Date()): RoadmapItem[] {
  const eligible = entries.filter(isRoadmapEligible);
  const byId = new Map(eligible.map((e) => [e.useCaseId, e] as const));
  return eligible
    .map((entry) => ({
      entry,
      useCaseId: entry.useCaseId,
      title: titleOf(entry),
      stage: entry.deliveryStage,
      period: entry.targetPeriod?.trim() || undefined,
      flags: deriveFlags(entry, byId, today),
      dependencies: (entry.dependsOn ?? [])
        .map((id) => byId.get(id))
        .filter((d): d is PortfolioEntry => Boolean(d))
        .map((d) => ({ useCaseId: d.useCaseId, title: titleOf(d), stage: d.deliveryStage })),
    }))
    .sort((a, b) => {
      if (a.stage !== b.stage) return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
      const ar = a.entry.rank ?? Number.MAX_SAFE_INTEGER;
      const br = b.entry.rank ?? Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      return a.title.localeCompare(b.title);
    });
}

/** Now / Next / Later lanes, always in a stable order. */
export function groupByStage(items: RoadmapItem[]): RoadmapLane[] {
  return DELIVERY_STAGES.map((stage) => ({
    stage,
    label: DELIVERY_STAGE_LABELS[stage],
    items: items.filter((i) => i.stage === stage),
  }));
}

/** Quarter / wave view. Items without a target period fall into one bucket. */
export function groupByPeriod(items: RoadmapItem[]): RoadmapPeriodGroup[] {
  const map = new Map<string, RoadmapItem[]>();
  for (const item of items) {
    const key = item.period ?? UNSCHEDULED_PERIOD;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === UNSCHEDULED_PERIOD) return 1;
      if (b === UNSCHEDULED_PERIOD) return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    })
    .map(([period, list]) => ({
      period,
      label: period === UNSCHEDULED_PERIOD ? "No target period" : period,
      items: list,
    }));
}

export interface RoadmapSummary {
  total: number;
  byStage: Record<DeliveryStage, number>;
  overdue: number;
  missingNextAction: number;
  blocked: number;
  dependencyRisk: number;
}

export function summarizeRoadmap(items: RoadmapItem[]): RoadmapSummary {
  const byStage = { now: 0, next: 0, later: 0, unscheduled: 0 } as Record<DeliveryStage, number>;
  let overdue = 0;
  let missingNextAction = 0;
  let blocked = 0;
  let dependencyRisk = 0;
  for (const item of items) {
    byStage[item.stage] += 1;
    if (item.flags.includes("overdue")) overdue += 1;
    if (item.flags.includes("missing_next_action")) missingNextAction += 1;
    if (item.flags.includes("blocked")) blocked += 1;
    if (item.flags.includes("dependency_later")) dependencyRisk += 1;
  }
  return {
    total: items.length,
    byStage,
    overdue,
    missingNextAction,
    blocked,
    dependencyRisk,
  };
}

/** Explicit, accessible move target: the stage on either side of the current one. */
export function adjacentStage(stage: DeliveryStage, direction: -1 | 1): DeliveryStage | null {
  const index = DELIVERY_STAGES.indexOf(stage);
  const next = DELIVERY_STAGES[index + direction];
  return next ?? null;
}

/** Flat CSV-friendly rows for roadmap export. */
export function toRoadmapRows(items: RoadmapItem[]) {
  return items.map((item) => ({
    use_case: item.title,
    stage: DELIVERY_STAGE_LABELS[item.stage],
    target_period: item.period ?? "",
    milestone: item.entry.milestone ?? "",
    owner: item.entry.deliveryOwner ?? "",
    planned_start: item.entry.plannedStartDate ?? "",
    planned_end: item.entry.plannedEndDate ?? "",
    next_action: item.entry.nextAction ?? "",
    decision: item.entry.decision,
    funding_state: item.entry.fundingState,
    blocked_reason: item.entry.blockedReason ?? "",
    depends_on: item.dependencies.map((d) => d.title).join("; "),
    flags: item.flags.map((f) => ROADMAP_FLAG_LABELS[f]).join("; "),
  }));
}
