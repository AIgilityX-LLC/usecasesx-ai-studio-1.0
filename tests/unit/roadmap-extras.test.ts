import { describe, expect, it } from "vitest";

import type { PortfolioEntry } from "@/lib/portfolio-model";
import { analyzeRoadmap, buildRoadmapItems, findDependencyCycle, listPeriods } from "@/lib/roadmap";
import { roadmapToCsv, roadmapToJson } from "@/lib/roadmap-export";

const TODAY = new Date("2026-08-01T12:00:00Z");

function entry(overrides: Partial<PortfolioEntry> & { useCaseId: string }): PortfolioEntry {
  return {
    useCaseTitle: `UC ${overrides.useCaseId}`,
    rank: null,
    decision: "shortlisted",
    fundingState: "unfunded",
    deliveryStage: "unscheduled",
    dependsOn: [],
    addedAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("dependency cycles", () => {
  const entries = [
    entry({ useCaseId: "a", dependsOn: ["b"] }),
    entry({ useCaseId: "b", dependsOn: ["c"] }),
    entry({ useCaseId: "c" }),
  ];

  it("returns null for an acyclic graph", () => {
    expect(findDependencyCycle(entries, "c", [])).toBeNull();
  });

  it("detects a direct self dependency", () => {
    expect(findDependencyCycle(entries, "a", ["a"])?.path).toEqual(["a", "a"]);
  });

  it("detects an indirect cycle introduced by the proposed edge", () => {
    const cycle = findDependencyCycle(entries, "c", ["a"]);
    expect(cycle).not.toBeNull();
    expect(cycle!.titles[0]).toBe("UC c");
    expect(cycle!.path.at(-1)).toBe("c");
  });
});

describe("roadmap analytics", () => {
  const items = buildRoadmapItems(
    [
      entry({
        useCaseId: "a",
        deliveryStage: "now",
        targetPeriod: "Q3 2026",
        plannedEndDate: "2026-07-01",
        nextAction: "Kick off",
        deliveryOwner: "Ops",
      }),
      entry({ useCaseId: "b", deliveryStage: "next", targetPeriod: "Q3 2026" }),
      entry({ useCaseId: "c", deliveryStage: "later" }),
    ],
    TODAY,
  );

  it("summarizes stage, overdue and next-action completeness", () => {
    const a = analyzeRoadmap(items);
    expect(a.total).toBe(3);
    expect(a.byStage.now).toBe(1);
    expect(a.overdue).toBe(1);
    expect(a.withNextAction).toBe(1);
    expect(a.nextActionCompleteness).toBe(33);
  });

  it("breaks the trend down by quarter", () => {
    const a = analyzeRoadmap(items);
    expect(a.periods.map((p) => p.period)).toEqual(["Q3 2026", "__none__"]);
    expect(a.periods[0].total).toBe(2);
    expect(a.periods[0].overdue).toBe(1);
    expect(a.periods[0].nextActionCompleteness).toBe(50);
  });

  it("lists selectable periods", () => {
    expect(listPeriods(items)).toEqual(["Q3 2026", "__none__"]);
  });
});

describe("roadmap export", () => {
  const items = buildRoadmapItems(
    [
      entry({
        useCaseId: "a",
        useCaseTitle: 'Fraud, "AI" triage',
        deliveryStage: "now",
        targetPeriod: "Q3 2026",
        milestone: "Pilot",
      }),
    ],
    TODAY,
  );

  it("escapes CSV cells and includes a header", () => {
    const csv = roadmapToCsv(items);
    const [header, row] = csv.split("\r\n");
    expect(header.startsWith("Use case,Stage,Target period")).toBe(true);
    expect(row).toContain('"Fraud, ""AI"" triage"');
  });

  it("writes JSON with export metadata", () => {
    const json = JSON.parse(roadmapToJson(items, { portfolioName: "P1", period: "Q3 2026" }));
    expect(json.portfolio).toBe("P1");
    expect(json.periodFilter).toBe("Q3 2026");
    expect(json.itemCount).toBe(1);
    expect(json.items[0].stage).toBe("now");
  });
});
