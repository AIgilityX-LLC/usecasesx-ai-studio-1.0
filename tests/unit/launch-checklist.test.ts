import { describe, expect, it } from "vitest";
import {
  buildLaunchChecklist,
  checklistProgress,
  gateLeverage,
  verifiedLabel,
} from "@/lib/release/checklist";
import { buildReadinessGates, type ReadinessGate } from "@/lib/release/readiness";
import { summarizeCohort, latestEvidenceTimestamp } from "@/lib/pilot/pilot.model";

const gates = (over: Partial<ReadinessGate>[] = []): ReadinessGate[] =>
  buildReadinessGates({
    run: null,
    cohort: null,
    waiverActive: false,
    generatedAt: "2026-08-27T00:00:00.000Z",
    actor: "test",
  }).map((gate, index) => ({ ...gate, ...(over[index] ?? {}) }));

describe("launch checklist", () => {
  it("orders blocking items before unmeasured and cleared ones", () => {
    const items = buildLaunchChecklist(
      gates([{ status: "pass" }, { status: "pass" }, { status: "fail" }]),
    );
    expect(items[0]?.status).toBe("fail");
    expect(items.at(-1)?.status).toBe("pass");
  });

  it("gives every item a fix action and a leverage figure", () => {
    for (const item of buildLaunchChecklist(gates())) {
      expect(item.actions.length).toBeGreaterThan(0);
      // A cleared gate legitimately has nothing left to win, so leverage is 0.
      if (item.status !== "pass") expect(item.leverage).toBeGreaterThan(0);
    }
  });

  it("scores P0 checks as the highest-leverage gate", () => {
    const all = gates();
    const p0 = all.find((g) => g.id === "checks.p0")!;
    const p1 = all.find((g) => g.id === "checks.p1")!;
    expect(gateLeverage(p0, all)).toBeGreaterThan(gateLeverage(p1, all));
  });

  it("reports progress without inventing cleared gates", () => {
    const progress = checklistProgress(buildLaunchChecklist(gates()));
    expect(progress.total).toBe(6);
    expect(progress.cleared + progress.open).toBe(progress.total);
  });

  it("never claims a verification that has no timestamp", () => {
    expect(verifiedLabel(null)).toBe("Never verified");
    expect(verifiedLabel("not-a-date")).toBe("Never verified");
    expect(verifiedLabel("2026-08-27T00:00:00.000Z", new Date("2026-08-27T02:00:00.000Z"))).toBe(
      "Verified 2 hours ago",
    );
  });
});

describe("pilot evidence collection", () => {
  it("clears the evidence gate from onboarding intakes alone", () => {
    const summary = summarizeCohort([], 25, {
      onboardingProfiles: 3,
      latestEvidenceAt: "2026-08-27T05:00:00.000Z",
    });
    const gate = buildReadinessGates({
      run: null,
      cohort: summary,
      waiverActive: false,
      generatedAt: "2026-08-27T06:00:00.000Z",
      actor: "test",
    }).find((g) => g.id === "pilot.evidence")!;
    expect(gate.status).toBe("attention");
    expect(gate.verifiedAt).toBe("2026-08-27T05:00:00.000Z");
    expect(gate.detail).toContain("3 onboarding intake(s)");
  });

  it("takes the latest of checkpoint and onboarding timestamps", () => {
    expect(
      latestEvidenceTimestamp(["2026-08-26T10:00:00.000Z"], ["2026-08-27T10:00:00.000Z", null]),
    ).toBe("2026-08-27T10:00:00.000Z");
    expect(latestEvidenceTimestamp([], [])).toBeNull();
  });
});
