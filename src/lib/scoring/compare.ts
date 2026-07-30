/**
 * Scoring — comparison of two recorded results (client-safe, pure).
 *
 * Results are immutable and may reference different definition versions, so a
 * comparison is a set-union over criteria and dimensions rather than a naive
 * field-by-field diff. Anything present in one result and not the other is
 * reported explicitly instead of being silently treated as a change to zero.
 */

import type { ScoreResult } from "./model";
import { round1 } from "./model";

export type Direction = "up" | "down" | "flat";

export type DimensionDelta = {
  dimensionId: string;
  label: string;
  /** Score in the earlier ("from") result, null when absent or unscored. */
  from: number | null;
  /** Score in the later ("to") result. */
  to: number | null;
  /** to − from. Null when either side is missing. */
  delta: number | null;
  direction: Direction;
  /** True when the dimension exists in only one of the two results. */
  onlyIn: "from" | "to" | null;
  isRiskDimension: boolean;
};

export type CriterionDelta = {
  criterionId: string;
  label: string;
  dimensionLabel: string;
  fromAnswer: string | null;
  toAnswer: string | null;
  fromRaw: number | null;
  toRaw: number | null;
  changed: boolean;
  /** Newly answered in the later result. */
  newlyAnswered: boolean;
  /** Answered before but not in the later result. */
  nowUnanswered: boolean;
};

export type ScoreComparison = {
  sameDefinition: boolean;
  fromVersionLabel: string;
  toVersionLabel: string;
  composite: { from: number | null; to: number | null; delta: number | null; direction: Direction };
  riskAdjusted: {
    from: number | null;
    to: number | null;
    delta: number | null;
    direction: Direction;
  };
  completeness: {
    from: number;
    to: number;
    delta: number;
    direction: Direction;
  };
  dimensions: DimensionDelta[];
  criteria: CriterionDelta[];
  /** Criteria that changed answer, most material movement first. */
  changedCriteria: CriterionDelta[];
  /** Plain-language reasons the headline score moved. */
  drivers: string[];
};

function directionOf(delta: number | null): Direction {
  if (delta === null || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
}

function diffNumbers(from: number | null, to: number | null) {
  const delta = from === null || to === null ? null : round1(to - from);
  return { from, to, delta, direction: directionOf(delta) };
}

function versionLabel(result: ScoreResult): string {
  return `${result.scorecardSlug} v${result.scorecardVersion}`;
}

/**
 * Compare two results. `from` is the earlier baseline, `to` the later one.
 */
export function compareResults(from: ScoreResult, to: ScoreResult): ScoreComparison {
  const sameDefinition =
    from.scorecardSlug === to.scorecardSlug && from.scorecardVersion === to.scorecardVersion;

  const fromDims = new Map(from.dimensions.map((d) => [d.dimensionId, d]));
  const toDims = new Map(to.dimensions.map((d) => [d.dimensionId, d]));
  const dimensionIds = [...new Set([...fromDims.keys(), ...toDims.keys()])];

  const dimensions: DimensionDelta[] = dimensionIds.map((id) => {
    const a = fromDims.get(id) ?? null;
    const b = toDims.get(id) ?? null;
    const numbers = diffNumbers(a?.score ?? null, b?.score ?? null);
    return {
      dimensionId: id,
      label: b?.label ?? a?.label ?? id,
      from: numbers.from,
      to: numbers.to,
      delta: numbers.delta,
      direction: numbers.direction,
      onlyIn: a && b ? null : a ? "from" : "to",
      isRiskDimension: Boolean(b?.isRiskDimension ?? a?.isRiskDimension),
    };
  });

  const fromCrit = new Map(
    from.dimensions.flatMap((d) => d.criteria.map((c) => [c.criterionId, { c, d }] as const)),
  );
  const toCrit = new Map(
    to.dimensions.flatMap((d) => d.criteria.map((c) => [c.criterionId, { c, d }] as const)),
  );
  const criterionIds = [...new Set([...fromCrit.keys(), ...toCrit.keys()])];

  const criteria: CriterionDelta[] = criterionIds.map((id) => {
    const a = fromCrit.get(id) ?? null;
    const b = toCrit.get(id) ?? null;
    const fromRaw = a?.c.answered ? (a.c.raw ?? null) : null;
    const toRaw = b?.c.answered ? (b.c.raw ?? null) : null;
    return {
      criterionId: id,
      label: b?.c.label ?? a?.c.label ?? id,
      dimensionLabel: b?.d.label ?? a?.d.label ?? "",
      fromAnswer: a?.c.answerLabel ?? null,
      toAnswer: b?.c.answerLabel ?? null,
      fromRaw,
      toRaw,
      changed: fromRaw !== toRaw,
      newlyAnswered: fromRaw === null && toRaw !== null,
      nowUnanswered: fromRaw !== null && toRaw === null,
    };
  });

  const changedCriteria = criteria
    .filter((c) => c.changed)
    .sort((a, b) => {
      const av = Math.abs((a.toRaw ?? 0) - (a.fromRaw ?? 0));
      const bv = Math.abs((b.toRaw ?? 0) - (b.fromRaw ?? 0));
      return bv - av;
    });

  const completenessDelta = round1((to.completeness - from.completeness) * 100) / 100;

  const drivers: string[] = [];
  if (!sameDefinition) {
    drivers.push(
      `These results use different scorecard versions (${versionLabel(from)} → ${versionLabel(to)}), so the movement is not like-for-like.`,
    );
  }
  const moved = dimensions
    .filter((d) => d.delta !== null && d.delta !== 0)
    .sort((a, b) => Math.abs(b.delta as number) - Math.abs(a.delta as number))
    .slice(0, 3);
  for (const d of moved) {
    const delta = d.delta as number;
    drivers.push(
      `${d.label} ${delta > 0 ? "improved" : "declined"} by ${Math.abs(delta)} points (${d.from} → ${d.to}).`,
    );
  }
  const newly = criteria.filter((c) => c.newlyAnswered).length;
  if (newly > 0) {
    drivers.push(
      `${newly} previously unanswered criterion${newly === 1 ? "" : "s"} now has evidence, raising completeness to ${Math.round(to.completeness * 100)}%.`,
    );
  }
  const dropped = criteria.filter((c) => c.nowUnanswered).length;
  if (dropped > 0) {
    drivers.push(
      `${dropped} criterion${dropped === 1 ? " is" : "s are"} no longer answered, lowering confidence.`,
    );
  }
  if (drivers.length === 0) {
    drivers.push("No dimension scores changed between these two results.");
  }

  return {
    sameDefinition,
    fromVersionLabel: versionLabel(from),
    toVersionLabel: versionLabel(to),
    composite: diffNumbers(from.composite, to.composite),
    riskAdjusted: diffNumbers(from.riskAdjusted, to.riskAdjusted),
    completeness: {
      from: from.completeness,
      to: to.completeness,
      delta: completenessDelta,
      direction: directionOf(completenessDelta),
    },
    dimensions,
    criteria,
    changedCriteria,
    drivers,
  };
}
