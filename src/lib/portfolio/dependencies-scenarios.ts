/**
 * V2-12 — Portfolio dependencies, scenarios and explainable insights (FR-09).
 * Pure module — no React, no Supabase.
 */

import { z } from "zod";

/* ----------------------------------------------------------- dependency types */

export const DEPENDENCY_TYPES = [
  "data",
  "model",
  "vendor",
  "platform",
  "integration",
  "policy",
  "skills",
  "prerequisite_use_case",
] as const;

export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export const DEPENDENCY_TYPE_LABEL: Record<DependencyType, string> = {
  data: "Data",
  model: "Model",
  vendor: "Vendor",
  platform: "Platform",
  integration: "Integration",
  policy: "Policy",
  skills: "Skills",
  prerequisite_use_case: "Prerequisite use case",
};

export type PortfolioDependency = {
  id: string;
  portfolioId: string;
  fromUseCaseId: string;
  dependencyType: DependencyType;
  /** Set when type is prerequisite_use_case (or optionally other typed links to a case). */
  toUseCaseId: string | null;
  /** Human label for external deps (vendor name, dataset, platform…). */
  label: string;
  notes: string | null;
};

export const dependencyInputSchema = z
  .object({
    portfolioId: z.string().uuid(),
    fromUseCaseId: z.string().uuid(),
    dependencyType: z.enum(DEPENDENCY_TYPES),
    toUseCaseId: z.string().uuid().nullable().optional(),
    label: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.dependencyType === "prerequisite_use_case" && !v.toUseCaseId) {
      ctx.addIssue({
        code: "custom",
        message: "Prerequisite dependencies must reference a use case.",
        path: ["toUseCaseId"],
      });
    }
  });

/** Adjacency list for accessible graph (list-first; graph is optional enhancement). */
export type DependencyEdge = {
  id: string;
  fromId: string;
  fromLabel: string;
  toId: string;
  toLabel: string;
  type: DependencyType;
  typeLabel: string;
};

export function toDependencyEdges(
  deps: PortfolioDependency[],
  titleById: Record<string, string>,
): DependencyEdge[] {
  return deps.map((d) => {
    const toId = d.toUseCaseId ?? `ext:${d.dependencyType}:${d.label}`;
    const toLabel = d.toUseCaseId ? (titleById[d.toUseCaseId] ?? d.label) : d.label;
    return {
      id: d.id,
      fromId: d.fromUseCaseId,
      fromLabel: titleById[d.fromUseCaseId] ?? d.fromUseCaseId.slice(0, 8),
      toId,
      toLabel,
      type: d.dependencyType,
      typeLabel: DEPENDENCY_TYPE_LABEL[d.dependencyType],
    };
  });
}

/* --------------------------------------------------------------- scenarios */

export type ScenarioWeights = {
  value: number;
  feasibility: number;
  governability: number;
  urgency: number;
};

export type PortfolioScenarioDraft = {
  name: string;
  description: string;
  weights: ScenarioWeights;
  budget: number | null;
  capacity: number | null;
  /** Free-form constraint notes (headcount, vendors, regions…). */
  constraints: string;
};

export const DEFAULT_SCENARIO_WEIGHTS: ScenarioWeights = {
  value: 1,
  feasibility: 1,
  governability: 1,
  urgency: 1,
};

export function emptyScenarioDraft(
  partial: Partial<PortfolioScenarioDraft> = {},
): PortfolioScenarioDraft {
  return {
    name: "",
    description: "",
    weights: { ...DEFAULT_SCENARIO_WEIGHTS },
    budget: null,
    capacity: null,
    constraints: "",
    ...partial,
  };
}

export const scenarioDraftSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  weights: z.object({
    value: z.number().min(0).max(5),
    feasibility: z.number().min(0).max(5),
    governability: z.number().min(0).max(5),
    urgency: z.number().min(0).max(5),
  }),
  budget: z.number().nonnegative().nullable(),
  capacity: z.number().nonnegative().nullable(),
  constraints: z.string().trim().max(4000),
});

export type ScenarioEntryView = {
  useCaseId: string;
  title: string;
  baselineScore: number;
  scenarioScore: number;
  delta: number;
};

/**
 * Apply scenario weights to entries without mutating the approved baseline.
 * Scores are relative ranking aids, not investment decisions.
 */
export function applyScenarioScores(
  entries: Array<{
    useCaseId: string;
    title: string;
    valuePotential?: string;
    complexity?: string;
    riskLevel?: string;
    timeToValue?: string;
  }>,
  weights: ScenarioWeights,
): ScenarioEntryView[] {
  const band = (raw: string | undefined, highIsGood: boolean): number => {
    const v = (raw ?? "").toLowerCase();
    if (v.includes("high") || v.includes("strategic")) return highIsGood ? 3 : 1;
    if (v.includes("medium") || v.includes("moderate")) return 2;
    if (v.includes("low")) return highIsGood ? 1 : 3;
    return 2;
  };

  return entries
    .map((e) => {
      const value = band(e.valuePotential, true);
      const feasibility = band(e.complexity, false); // low complexity → higher feasibility
      const governability = band(e.riskLevel, false);
      const urgency = band(e.timeToValue, false); // fast TTV → higher urgency weight input
      const baseline =
        DEFAULT_SCENARIO_WEIGHTS.value * value +
        DEFAULT_SCENARIO_WEIGHTS.feasibility * feasibility +
        DEFAULT_SCENARIO_WEIGHTS.governability * governability +
        DEFAULT_SCENARIO_WEIGHTS.urgency * urgency;
      const scenario =
        weights.value * value +
        weights.feasibility * feasibility +
        weights.governability * governability +
        weights.urgency * urgency;
      return {
        useCaseId: e.useCaseId,
        title: e.title,
        baselineScore: Math.round(baseline * 10) / 10,
        scenarioScore: Math.round(scenario * 10) / 10,
        delta: Math.round((scenario - baseline) * 10) / 10,
      };
    })
    .sort((a, b) => b.scenarioScore - a.scenarioScore);
}

/* ---------------------------------------------------------------- insights */

export type PortfolioInsightKind =
  "duplicate" | "shared_enabler" | "bottleneck" | "concentration" | "no_regret";

export type PortfolioInsight = {
  kind: PortfolioInsightKind;
  title: string;
  explanation: string;
  relatedIds: string[];
};

const TITLE_NORM = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Explainable portfolio rules. Deterministic; no ML.
 */
export function detectPortfolioInsights(input: {
  entries: Array<{
    useCaseId: string;
    title: string;
    valuePotential?: string;
    complexity?: string;
    riskLevel?: string;
    functionName?: string;
    decision?: string;
  }>;
  dependencies: PortfolioDependency[];
}): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const { entries, dependencies } = input;
  const titleById = Object.fromEntries(entries.map((e) => [e.useCaseId, e.title]));

  // Duplicates — near-identical titles
  const byNorm = new Map<string, string[]>();
  for (const e of entries) {
    const key = TITLE_NORM(e.title);
    if (!key) continue;
    const list = byNorm.get(key) ?? [];
    list.push(e.useCaseId);
    byNorm.set(key, list);
  }
  for (const [key, ids] of byNorm) {
    if (ids.length < 2) continue;
    insights.push({
      kind: "duplicate",
      title: `Possible duplicate investment: “${key}”`,
      explanation: `${ids.length} portfolio entries share the same normalized title. Review whether they should be merged or explicitly differentiated.`,
      relatedIds: ids,
    });
  }

  // Shared enablers — dependency targets depended on by 2+ subjects
  const fanIn = new Map<string, { label: string; from: string[] }>();
  for (const d of dependencies) {
    const key = d.toUseCaseId ?? `ext:${d.dependencyType}:${d.label}`;
    const cur = fanIn.get(key) ?? {
      label: d.toUseCaseId ? (titleById[d.toUseCaseId] ?? d.label) : d.label,
      from: [],
    };
    if (!cur.from.includes(d.fromUseCaseId)) cur.from.push(d.fromUseCaseId);
    fanIn.set(key, cur);
  }
  for (const [key, v] of fanIn) {
    if (v.from.length < 2) continue;
    insights.push({
      kind: "shared_enabler",
      title: `Shared enabler: ${v.label}`,
      explanation: `${v.from.length} use cases depend on “${v.label}”. Investing once here may unlock multiple cases.`,
      relatedIds: [key.startsWith("ext:") ? v.label : key, ...v.from],
    });
  }

  // Bottlenecks — enablers with fan-in ≥ 3
  for (const [key, v] of fanIn) {
    if (v.from.length < 3) continue;
    insights.push({
      kind: "bottleneck",
      title: `Bottleneck risk: ${v.label}`,
      explanation: `At least three use cases wait on “${v.label}”. Delay here blocks a cluster of delivery.`,
      relatedIds: [key.startsWith("ext:") ? v.label : key, ...v.from],
    });
  }

  // Concentration — >50% of entries in one business function
  const byFn = new Map<string, string[]>();
  for (const e of entries) {
    const fn = (e.functionName ?? "").trim() || "Unassigned";
    const list = byFn.get(fn) ?? [];
    list.push(e.useCaseId);
    byFn.set(fn, list);
  }
  for (const [fn, ids] of byFn) {
    if (entries.length < 4) break;
    if (ids.length / entries.length < 0.5) continue;
    insights.push({
      kind: "concentration",
      title: `Concentration in ${fn}`,
      explanation: `${ids.length} of ${entries.length} entries (${Math.round((ids.length / entries.length) * 100)}%) sit in “${fn}”. Diversify or accept the concentration consciously.`,
      relatedIds: ids,
    });
  }

  // No-regret — high value + low complexity + low risk (+ optional shared enabler)
  const sharedTargets = new Set(
    [...fanIn.entries()].filter(([, v]) => v.from.length >= 2).map(([k]) => k),
  );
  for (const e of entries) {
    const valueHigh = (e.valuePotential ?? "").toLowerCase().includes("high");
    const complexityLow = (e.complexity ?? "").toLowerCase().includes("low");
    const riskLow = (e.riskLevel ?? "").toLowerCase().includes("low");
    if (!(valueHigh && complexityLow && riskLow)) continue;
    const isEnabler = sharedTargets.has(e.useCaseId);
    insights.push({
      kind: "no_regret",
      title: `No-regret candidate: ${e.title}`,
      explanation: isEnabler
        ? "High value, low complexity and low risk, and other cases depend on it — a strong no-regret candidate under current rules."
        : "High value, low complexity and low risk under current rules — treat as a no-regret candidate pending gate review.",
      relatedIds: [e.useCaseId],
    });
  }

  return insights;
}

/* -------------------------------------------- opportunity-map concentration */

export function detectMapConcentration(
  records: Array<{
    id: string;
    title: string;
    orgUnitName: string | null;
    strategicThemeName: string | null;
  }>,
): PortfolioInsight[] {
  if (records.length < 4) return [];
  const insights: PortfolioInsight[] = [];
  const byTheme = new Map<string, string[]>();
  for (const r of records) {
    const theme = r.strategicThemeName?.trim() || "Not classified";
    const list = byTheme.get(theme) ?? [];
    list.push(r.id);
    byTheme.set(theme, list);
  }
  for (const [theme, ids] of byTheme) {
    if (ids.length / records.length < 0.5) continue;
    insights.push({
      kind: "concentration",
      title: `Map concentration: ${theme}`,
      explanation: `${ids.length} of ${records.length} records in view share theme “${theme}”. Filters and the data table show the same set.`,
      relatedIds: ids,
    });
  }
  return insights;
}
