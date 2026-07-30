/**
 * Scoring engine — determinism, weighting, completeness and explainability.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_SCORECARD } from "@/lib/scoring/default-scorecard";
import {
  bandFor,
  calculateScore,
  normaliseAnswer,
  pruneResponses,
  scorecardDefinitionSchema,
  type Responses,
} from "@/lib/scoring/model";

const allCriteria = DEFAULT_SCORECARD.dimensions.flatMap((d) => d.criteria);

function answerAll(value: number): Responses {
  return Object.fromEntries(allCriteria.map((c) => [c.id, value]));
}

describe("default scorecard definition", () => {
  it("validates against the definition schema", () => {
    expect(scorecardDefinitionSchema.safeParse(DEFAULT_SCORECARD).success).toBe(true);
  });

  it("covers the seven launch dimensions with exactly one risk dimension", () => {
    expect(DEFAULT_SCORECARD.dimensions.map((d) => d.id)).toEqual([
      "business_value",
      "strategic_alignment",
      "feasibility",
      "data_readiness",
      "time_to_value",
      "organisational_readiness",
      "risk_governance",
    ]);
    expect(DEFAULT_SCORECARD.dimensions.filter((d) => d.isRiskDimension)).toHaveLength(1);
  });

  it("uses unique criterion ids", () => {
    const ids = allCriteria.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("normalisation", () => {
  it("inverts risk-style criteria", () => {
    expect(normaliseAnswer(4, 4, false)).toBe(1);
    expect(normaliseAnswer(4, 4, true)).toBe(0);
    expect(normaliseAnswer(1, 4, true)).toBe(0.75);
  });

  it("clamps out-of-range answers", () => {
    expect(normaliseAnswer(9, 4)).toBe(1);
    expect(normaliseAnswer(-3, 4)).toBe(0);
  });
});

describe("calculateScore", () => {
  it("is deterministic for the same input", () => {
    const responses = answerAll(3);
    const a = calculateScore(DEFAULT_SCORECARD, responses);
    const b = calculateScore(DEFAULT_SCORECARD, responses);
    expect(a).toEqual(b);
  });

  it("scores a perfect profile at 100 with no risk penalty", () => {
    // Best answer differs per criterion: 0 for inverted (no exposure), max otherwise.
    const best: Responses = Object.fromEntries(
      allCriteria.map((c) => [c.id, c.inverse ? 0 : DEFAULT_SCORECARD.scaleMax]),
    );
    const result = calculateScore(DEFAULT_SCORECARD, best);
    expect(result.composite).toBe(100);
    expect(result.riskAdjusted).toBe(100);
    expect(result.completeness).toBe(1);
    expect(result.confidence).toBe("high");
    expect(result.incomplete).toBe(false);
    expect(result.recommendation?.id).toBe("pursue");
  });

  it("applies the risk adjustment when residual risk is high", () => {
    const responses: Responses = Object.fromEntries(
      allCriteria.map((c) => [
        c.id,
        // Strong everywhere except the risk dimension, which is worst-case.
        c.inverse ? DEFAULT_SCORECARD.scaleMax : DEFAULT_SCORECARD.scaleMax,
      ]),
    );
    const result = calculateScore(DEFAULT_SCORECARD, responses);
    const risk = result.dimensions.find((d) => d.isRiskDimension);
    expect(risk?.score).toBeLessThan(50);
    expect(result.riskAdjusted as number).toBeLessThan(result.composite as number);
  });

  it("excludes unanswered criteria instead of scoring them as zero", () => {
    const partial: Responses = { value_size: DEFAULT_SCORECARD.scaleMax };
    const result = calculateScore(DEFAULT_SCORECARD, partial);
    const value = result.dimensions.find((d) => d.dimensionId === "business_value");
    expect(value?.score).toBe(100);
    expect(value?.answeredCount).toBe(1);
    // Untouched dimensions carry no score at all.
    expect(result.dimensions.find((d) => d.dimensionId === "feasibility")?.score).toBeNull();
  });

  it("flags incomplete input and lowers confidence", () => {
    const result = calculateScore(DEFAULT_SCORECARD, { value_size: 4, feas_cost: 2 });
    expect(result.incomplete).toBe(true);
    expect(result.confidence).toBe("low");
    expect(result.missing.length).toBe(allCriteria.length - 2);
    expect(result.completeness).toBeLessThan(DEFAULT_SCORECARD.minimumCompleteness);
  });

  it("returns no composite when nothing is answered", () => {
    const result = calculateScore(DEFAULT_SCORECARD, {});
    expect(result.composite).toBeNull();
    expect(result.riskAdjusted).toBeNull();
    expect(result.completeness).toBe(0);
  });

  it("explains every criterion and the calculation steps", () => {
    const result = calculateScore(DEFAULT_SCORECARD, answerAll(2));
    const flattened = result.dimensions.flatMap((d) => d.criteria);
    expect(flattened).toHaveLength(allCriteria.length);
    expect(flattened.every((c) => c.explanation.length > 0)).toBe(true);
    expect(result.calculation.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps dimension weight shares summing to 1", () => {
    const result = calculateScore(DEFAULT_SCORECARD, answerAll(2));
    const total = result.dimensions.reduce((s, d) => s + d.weightShare, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("stamps the definition slug and version onto the result", () => {
    const result = calculateScore(DEFAULT_SCORECARD, answerAll(2));
    expect(result.scorecardSlug).toBe(DEFAULT_SCORECARD.slug);
    expect(result.scorecardVersion).toBe(DEFAULT_SCORECARD.version);
  });
});

describe("bands", () => {
  it("maps scores to the configured bands", () => {
    expect(bandFor(DEFAULT_SCORECARD, 90)?.id).toBe("pursue");
    expect(bandFor(DEFAULT_SCORECARD, 62)?.id).toBe("shortlist");
    expect(bandFor(DEFAULT_SCORECARD, 50)?.id).toBe("refine");
    expect(bandFor(DEFAULT_SCORECARD, 10)?.id).toBe("hold");
    expect(bandFor(DEFAULT_SCORECARD, null)).toBeNull();
  });
});

describe("pruneResponses", () => {
  it("drops answers for criteria the definition does not define", () => {
    const pruned = pruneResponses(DEFAULT_SCORECARD, { value_size: 3, removed_criterion: 4 });
    expect(pruned).toEqual({ value_size: 3 });
  });
});
