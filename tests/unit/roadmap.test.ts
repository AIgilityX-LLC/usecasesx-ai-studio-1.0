import { describe, expect, it } from "vitest";

import type { PortfolioEntry } from "@/lib/portfolio-model";
import {
  UNSCHEDULED_PERIOD,
  adjacentStage,
  buildRoadmapItems,
  groupByPeriod,
  groupByStage,
  summarizeRoadmap,
  toRoadmapRows,
} from "@/lib/roadmap";

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

describe("roadmap model", () => {
  it("excludes rejected use cases", () => {
    const items = buildRoadmapItems(
      [entry({ useCaseId: "a" }), entry({ useCaseId: "b", decision: "rejected" })],
      TODAY,
    );
    expect(items.map((i) => i.useCaseId)).toEqual(["a"]);
  });

  it("flags overdue, missing next action, owner and dates", () => {
    const [item] = buildRoadmapItems(
      [
        entry({
          useCaseId: "a",
          deliveryStage: "now",
          plannedEndDate: "2026-07-01",
        }),
      ],
      TODAY,
    );
    expect(item.flags).toContain("overdue");
    expect(item.flags).toContain("missing_next_action");
    expect(item.flags).toContain("missing_owner");
    expect(item.flags).not.toContain("missing_dates");
  });

  it("does not flag delivered items as overdue", () => {
    const [item] = buildRoadmapItems(
      [
        entry({
          useCaseId: "a",
          deliveryStage: "now",
          decision: "delivered",
          plannedEndDate: "2026-07-01",
          nextAction: "Handover",
          deliveryOwner: "Ops",
        }),
      ],
      TODAY,
    );
    expect(item.flags).toEqual([]);
  });

  it("flags a dependency scheduled later than the dependent", () => {
    const items = buildRoadmapItems(
      [
        entry({ useCaseId: "a", deliveryStage: "now", dependsOn: ["b"] }),
        entry({ useCaseId: "b", deliveryStage: "later" }),
      ],
      TODAY,
    );
    const a = items.find((i) => i.useCaseId === "a")!;
    expect(a.flags).toContain("dependency_later");
    expect(a.dependencies).toHaveLength(1);
  });

  it("orders lanes Now → Next → Later → Unscheduled and ranks within a lane", () => {
    const items = buildRoadmapItems(
      [
        entry({ useCaseId: "c", deliveryStage: "later" }),
        entry({ useCaseId: "a", deliveryStage: "now", rank: 2 }),
        entry({ useCaseId: "b", deliveryStage: "now", rank: 1 }),
      ],
      TODAY,
    );
    expect(items.map((i) => i.useCaseId)).toEqual(["b", "a", "c"]);
    const lanes = groupByStage(items);
    expect(lanes.map((l) => l.stage)).toEqual(["now", "next", "later", "unscheduled"]);
    expect(lanes[0].items).toHaveLength(2);
  });

  it("groups by target period with unscheduled last", () => {
    const items = buildRoadmapItems(
      [
        entry({ useCaseId: "a", targetPeriod: "Q4 2026" }),
        entry({ useCaseId: "b" }),
        entry({ useCaseId: "c", targetPeriod: "Q3 2026" }),
      ],
      TODAY,
    );
    const groups = groupByPeriod(items);
    expect(groups.map((g) => g.period)).toEqual(["Q3 2026", "Q4 2026", UNSCHEDULED_PERIOD]);
  });

  it("summarizes attention counts", () => {
    const items = buildRoadmapItems(
      [
        entry({ useCaseId: "a", deliveryStage: "now", blockedReason: "Data access" }),
        entry({ useCaseId: "b", deliveryStage: "next", nextAction: "Scope workshop" }),
      ],
      TODAY,
    );
    const s = summarizeRoadmap(items);
    expect(s.total).toBe(2);
    expect(s.byStage.now).toBe(1);
    expect(s.blocked).toBe(1);
    expect(s.missingNextAction).toBe(1);
  });

  it("moves between adjacent stages only", () => {
    expect(adjacentStage("now", -1)).toBeNull();
    expect(adjacentStage("now", 1)).toBe("next");
    expect(adjacentStage("unscheduled", 1)).toBeNull();
  });

  it("exports flat rows", () => {
    const items = buildRoadmapItems(
      [entry({ useCaseId: "a", deliveryStage: "now", milestone: "Pilot" })],
      TODAY,
    );
    const rows = toRoadmapRows(items);
    expect(rows[0]).toMatchObject({ stage: "Now", milestone: "Pilot" });
  });
});
