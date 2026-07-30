import { describe, expect, it } from "bun:test";

import { compareResults } from "@/lib/scoring/compare";
import { calculateScore } from "@/lib/scoring/model";
import { DEFAULT_SCORECARD } from "@/lib/scoring/default-scorecard";

const def = DEFAULT_SCORECARD;
const allCriteria = def.dimensions.flatMap((d) => d.criteria);

function answerAll(value: number) {
  return Object.fromEntries(allCriteria.map((c) => [c.id, value]));
}

describe("compareResults", () => {
  it("reports no movement when the answers are identical", () => {
    const a = calculateScore(def, answerAll(3));
    const diff = compareResults(a, a);
    expect(diff.composite.delta).toBe(0);
    expect(diff.composite.direction).toBe("flat");
    expect(diff.changedCriteria).toHaveLength(0);
    expect(diff.drivers[0]).toContain("No dimension scores changed");
  });

  it("detects an improvement and names the moving dimensions", () => {
    const from = calculateScore(def, answerAll(2));
    const to = calculateScore(def, answerAll(4));
    const diff = compareResults(from, to);
    expect(diff.composite.delta).not.toBeNull();
    expect(diff.composite.direction).toBe("up");
    expect(diff.changedCriteria.length).toBe(allCriteria.length);
    expect(diff.drivers.some((d) => d.includes("improved"))).toBe(true);
  });

  it("treats newly answered criteria as new evidence, not as a change from zero", () => {
    const first = allCriteria[0];
    const from = calculateScore(def, {});
    const to = calculateScore(def, { [first.id]: 3 });
    const diff = compareResults(from, to);
    const entry = diff.criteria.find((c) => c.criterionId === first.id);
    expect(entry?.newlyAnswered).toBe(true);
    expect(entry?.fromRaw).toBeNull();
    expect(diff.completeness.direction).toBe("up");
    expect(diff.drivers.some((d) => d.includes("now has evidence"))).toBe(true);
  });

  it("flags criteria that are no longer answered", () => {
    const first = allCriteria[0];
    const from = calculateScore(def, { [first.id]: 3 });
    const to = calculateScore(def, {});
    const diff = compareResults(from, to);
    const entry = diff.criteria.find((c) => c.criterionId === first.id);
    expect(entry?.nowUnanswered).toBe(true);
    expect(diff.drivers.some((d) => d.includes("no longer answered"))).toBe(true);
  });

  it("warns when the two results came from different definition versions", () => {
    const from = calculateScore(def, answerAll(3));
    const to = { ...calculateScore(def, answerAll(3)), scorecardVersion: def.version + 1 };
    const diff = compareResults(from, to);
    expect(diff.sameDefinition).toBe(false);
    expect(diff.drivers[0]).toContain("different scorecard versions");
  });

  it("does not invent a delta when a dimension exists on only one side", () => {
    const from = calculateScore(def, answerAll(3));
    const to = {
      ...calculateScore(def, answerAll(3)),
      dimensions: calculateScore(def, answerAll(3)).dimensions.slice(1),
    };
    const diff = compareResults(from, to);
    const dropped = diff.dimensions.find((d) => d.onlyIn === "from");
    expect(dropped).toBeDefined();
    expect(dropped?.delta).toBeNull();
    expect(dropped?.direction).toBe("flat");
  });
});
