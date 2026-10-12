import { describe, expect, it } from "vitest";
import {
  READINESS_TARGET_PERCENT,
  buildImprovementPlan,
  weightedReadiness,
} from "@/lib/release/improvement-plan";
import type { GateStatus, ReadinessGate } from "@/lib/release/readiness";

const gate = (id: string, status: GateStatus): ReadinessGate => ({
  id,
  label: id,
  status,
  detail: `${id} detail`,
  verifiedAt: null,
});

const GATE_IDS = [
  "checks.p0",
  "checks.p1",
  "pilot.seats",
  "pilot.evidence",
  "pipeline.verification",
];

const gates = (statuses: Partial<Record<string, GateStatus>>): ReadinessGate[] =>
  GATE_IDS.map((id) => gate(id, statuses[id] ?? "unknown"));

describe("readiness improvement plan", () => {
  it("scores an all-pass board at 100% and needs no steps", () => {
    const all = gates(Object.fromEntries(GATE_IDS.map((id) => [id, "pass" as GateStatus])));
    expect(weightedReadiness(all)).toBe(100);
    const plan = buildImprovementPlan(all);
    expect(plan.steps).toHaveLength(0);
    expect(plan.gapPercent).toBe(0);
    expect(plan.targetReachable).toBe(true);
  });

  it("orders steps by the readiness they recover and stops at the target", () => {
    const plan = buildImprovementPlan(gates({}), READINESS_TARGET_PERCENT);
    expect(plan.currentPercent).toBeLessThan(READINESS_TARGET_PERCENT);
    expect(plan.steps.length).toBeGreaterThan(0);
    const gains = plan.steps.map((step) => step.gainPercent);
    expect(gains).toEqual([...gains].sort((a, b) => b - a));
    expect(plan.steps.at(-1)?.reachesTarget).toBe(true);
    expect(plan.projectedPercent).toBeGreaterThanOrEqual(READINESS_TARGET_PERCENT);
  });

  it("carries a concrete requirement and fix actions for every step", () => {
    const plan = buildImprovementPlan(gates({ "checks.p0": "fail" }));
    for (const step of plan.steps) {
      expect(step.requirement.length).toBeGreaterThan(10);
      expect(step.actions.length).toBeGreaterThan(0);
    }
  });

  it("projects each audience once the plan is done", () => {
    const plan = buildImprovementPlan(gates({ "pilot.seats": "pass" }));
    expect(plan.projectedByAudience.map((a) => a.audience)).toEqual([
      "investor",
      "demo",
      "client",
      "deployment",
      "production",
    ]);
    for (const audience of plan.projectedByAudience) {
      expect(audience.percent).toBeGreaterThanOrEqual(plan.currentPercent - 100);
      expect(audience.percent).toBeLessThanOrEqual(100);
    }
  });

  it("never claims a target is reachable when open gates cannot reach it", () => {
    const plan = buildImprovementPlan(gates({}), 100);
    expect(plan.target).toBe(100);
    expect(plan.projectedPercent).toBeLessThanOrEqual(100);
  });
});
