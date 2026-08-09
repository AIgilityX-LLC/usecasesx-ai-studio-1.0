import { describe, expect, it } from "bun:test";
import {
  buildOutcomeSummary,
  classify,
  isCountable,
  scoreItems,
  similarityHints,
  type WorkshopItem,
  type VoteRecord,
} from "@/lib/workshops";

function item(patch: Partial<WorkshopItem> & { id: string; title: string }): WorkshopItem {
  return {
    workshopId: "w1",
    kind: "use_case",
    detail: "",
    businessFunction: "Finance",
    submittedBy: "u1",
    submittedByName: "Ana",
    status: "accepted",
    mergedIntoId: null,
    sourceItemId: null,
    opportunityId: null,
    useCaseId: null,
    convertedAt: null,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...patch,
  } as WorkshopItem;
}

const vote = (
  itemId: string,
  voterId: string,
  criterion: VoteRecord["criterion"],
  score: number,
): VoteRecord => ({ itemId, voterId, criterion, score });

describe("workshop scoring", () => {
  it("averages per criterion and weights the composite", () => {
    const scores = scoreItems([
      vote("a", "u1", "value", 5),
      vote("a", "u2", "value", 3),
      vote("a", "u1", "feasibility", 4),
      vote("a", "u1", "urgency", 2),
    ]);
    const a = scores.get("a")!;
    expect(a.averages.value).toBe(4);
    expect(a.voters).toBe(2);
    // 4*0.5 + 4*0.3 + 2*0.2 = 3.6
    expect(a.composite).toBeCloseTo(3.6, 5);
  });

  it("ignores unscored criteria instead of treating them as zero", () => {
    const only = scoreItems([vote("b", "u1", "value", 5)]).get("b")!;
    expect(only.composite).toBe(5);
    expect(only.averages.feasibility).toBeUndefined();
  });

  it("clamps out-of-range scores to the 1–5 rule", () => {
    expect(scoreItems([vote("c", "u1", "value", 9)]).get("c")!.averages.value).toBe(5);
    expect(scoreItems([vote("d", "u1", "value", -2)]).get("d")!.averages.value).toBe(1);
  });

  it("classifies only when both axes were scored", () => {
    expect(classify(scoreItems([vote("e", "u1", "value", 5)]).get("e"))).toBeNull();
    const both = scoreItems([vote("f", "u1", "value", 5), vote("f", "u1", "feasibility", 4)]);
    expect(classify(both.get("f"))).toBe("quick_win");
    const bet = scoreItems([vote("g", "u1", "value", 5), vote("g", "u1", "feasibility", 2)]);
    expect(classify(bet.get("g"))).toBe("strategic_bet");
  });
});

describe("duplicate hints", () => {
  it("suggests overlapping titles and skips merged rows", () => {
    const hits = similarityHints("Automate supplier invoice matching", [
      item({ id: "1", title: "Supplier invoice matching automation" }),
      item({ id: "2", title: "Predict customer churn" }),
      item({ id: "3", title: "Supplier invoice matching", status: "merged" }),
    ]);
    expect(hits.map((h) => h.item.id)).toEqual(["1"]);
  });

  it("never counts merged or parked items", () => {
    expect(isCountable("merged")).toBe(false);
    expect(isCountable("rejected")).toBe(false);
    expect(isCountable("shortlisted")).toBe(true);
  });
});

describe("outcome summary", () => {
  const items = [
    item({
      id: "p1",
      kind: "pain_point",
      title: "Manual invoice checks",
      businessFunction: "Finance",
    }),
    item({ id: "p2", kind: "pain_point", title: "Slow HR onboarding", businessFunction: "HR" }),
    item({ id: "u1", title: "Invoice matching copilot", status: "shortlisted" }),
    item({ id: "u2", title: "Cash forecast model" }),
    item({ id: "u3", title: "Duplicate of invoice copilot", status: "merged", mergedIntoId: "u1" }),
  ];
  const votes = [
    vote("u1", "a", "value", 5),
    vote("u1", "a", "feasibility", 5),
    vote("u2", "a", "value", 5),
    vote("u2", "a", "feasibility", 2),
  ];

  const summary = buildOutcomeSummary({
    workshop: { title: "Discovery day", clientName: "Acme", objective: "Find quick wins" },
    participants: [{ id: "x" }, { id: "y" }],
    items,
    votes,
    now: new Date("2026-08-09T00:00:00Z"),
  });

  it("counts only live items", () => {
    expect(summary.counts.useCases).toBe(2);
    expect(summary.counts.painPoints).toBe(2);
    expect(summary.counts.shortlisted).toBe(1);
  });

  it("splits quick wins from strategic bets", () => {
    expect(summary.quickWins.map((r) => r.itemId)).toEqual(["u1"]);
    expect(summary.strategicBets.map((r) => r.itemId)).toEqual(["u2"]);
  });

  it("reports functions with demand but no candidate", () => {
    expect(summary.gaps).toEqual(["HR"]);
  });

  it("sequences a roadmap from the shortlist", () => {
    expect(summary.roadmap[0]?.items).toEqual(["Invoice matching copilot"]);
  });
});
