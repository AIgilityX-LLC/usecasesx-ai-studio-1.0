import { describe, expect, test } from "bun:test";
import { FIVE_PILLAR_SCORECARD } from "@/lib/scoring/pillars-v2";
import {
  calculateScore,
  evidenceCompletenessOf,
  SCORE_DISCLAIMER,
  sensitivityAnalysis,
  uncertaintyBandFor,
  type Responses,
} from "@/lib/scoring/model";

const pillarCriteria = FIVE_PILLAR_SCORECARD.dimensions.flatMap((d) => d.criteria);

function answerAll(value: number): Responses {
  return Object.fromEntries(pillarCriteria.map((c) => [c.id, value]));
}

describe("five-pillar scorecard (FR-06)", () => {
  test("exposes Desirability, Viability, Feasibility, Governability and Value", () => {
    expect(FIVE_PILLAR_SCORECARD.dimensions.map((d) => d.id)).toEqual([
      "desirability",
      "viability",
      "feasibility",
      "governability",
      "value",
    ]);
    expect(FIVE_PILLAR_SCORECARD.dimensions.filter((d) => d.isRiskDimension)).toHaveLength(1);
  });

  test("band guidance never claims compliance or approval", () => {
    for (const band of FIVE_PILLAR_SCORECARD.bands) {
      expect(band.guidance.toLowerCase()).toContain("prioritisation");
      expect(band.guidance.toLowerCase()).not.toMatch(/\bcompliant\b|\bsafe\b|\bapproved\b/);
    }
  });
});

describe("uncertainty and evidence completeness", () => {
  test("uncertainty widens when incomplete", () => {
    const full = uncertaintyBandFor(70, 1, "high");
    const partial = uncertaintyBandFor(70, 0.5, "low");
    expect(full).not.toBeNull();
    expect(partial).not.toBeNull();
    expect(partial!.high - partial!.low).toBeGreaterThan(full!.high - full!.low);
  });

  test("evidence completeness is independent of answer completeness", () => {
    const responses = answerAll(3);
    const withoutEvidence = calculateScore(FIVE_PILLAR_SCORECARD, responses);
    expect(withoutEvidence.completeness).toBe(1);
    expect(withoutEvidence.evidenceCompleteness).toBe(0);

    const withEvidence = calculateScore(FIVE_PILLAR_SCORECARD, responses, {
      assessments: Object.fromEntries(pillarCriteria.map((c) => [c.id, { evidence: "KPI pack" }])),
    });
    expect(withEvidence.evidenceCompleteness).toBe(1);
    expect(withEvidence.completeness).toBe(1);
  });

  test("evidenceCompletenessOf weights only criteria with text", () => {
    const share = evidenceCompletenessOf(FIVE_PILLAR_SCORECARD, {
      [pillarCriteria[0]!.id]: { evidence: "note" },
    });
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
  });
});

describe("sensitivity analysis", () => {
  test("reports deltas without mutating the base result", () => {
    const responses = answerAll(3);
    const { base, scenarios } = sensitivityAnalysis(FIVE_PILLAR_SCORECARD, responses);
    expect(base.riskAdjusted).not.toBeNull();
    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios.some((s) => s.deltaFromBase !== 0 && s.deltaFromBase !== null)).toBe(true);
    expect(base.scoreDisclaimer).toBe(SCORE_DISCLAIMER);
  });
});

describe("score disclaimer", () => {
  test("every calculated result carries the non-compliance disclaimer", () => {
    const result = calculateScore(FIVE_PILLAR_SCORECARD, answerAll(2));
    expect(result.scoreDisclaimer).toContain("never a compliance");
    expect(result.uncertainty).not.toBeNull();
  });
});
