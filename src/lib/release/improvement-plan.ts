/**
 * Improvement plan (pure).
 *
 * Answers one question: what is the shortest ordered set of gates to clear to
 * reach a target weighted readiness (85% by default)? Each step simulates the
 * gate passing and reports the projected weighted score, so the plan is a
 * measurement rather than an aspiration.
 */

import {
  READINESS_AUDIENCES,
  audienceReadiness,
  type ReadinessAudience,
  type ReadinessGate,
} from "./readiness";
import { buildLaunchChecklist, type ChecklistAction } from "./checklist";

/** Default weighted-readiness target for the Pro launch decision. */
export const READINESS_TARGET_PERCENT = 85;

export type ImprovementStep = {
  gateId: string;
  label: string;
  /** What clearing this gate concretely requires. */
  requirement: string;
  actions: ChecklistAction[];
  /** Weighted readiness before this step. */
  fromPercent: number;
  /** Weighted readiness once this gate passes. */
  toPercent: number;
  gainPercent: number;
  /** True when the target is met at or before this step. */
  reachesTarget: boolean;
};

export type ImprovementPlan = {
  target: number;
  currentPercent: number;
  projectedPercent: number;
  gapPercent: number;
  steps: ImprovementStep[];
  /** Per-audience score once every step in the plan is done. */
  projectedByAudience: { audience: ReadinessAudience; label: string; percent: number }[];
  targetReachable: boolean;
};

const REQUIREMENTS: Record<string, string> = {
  "checks.p0":
    "Record a launch-check run with zero P0 failures from an authenticated session.",
  "checks.p1": "Clear the remaining P1 assertions, or waive each one with a written reason.",
  "pilot.seats":
    "Enrol 15–25 participants (CSV upload is fastest) and send their invitations.",
  "pilot.evidence":
    "Get participants through onboarding and at least one checkpoint each so evidence lands automatically.",
  "pipeline.verification":
    "Run the release verification pipeline and record the artifact against this candidate.",
};

/** Weighted readiness across the four audiences, equally weighted. */
export function weightedReadiness(gates: readonly ReadinessGate[]): number {
  const entries = audienceReadiness(gates);
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, entry) => sum + entry.percent, 0);
  return Math.round(total / entries.length);
}

function withGatesPassing(
  gates: readonly ReadinessGate[],
  passing: readonly string[],
): ReadinessGate[] {
  return gates.map((gate) =>
    passing.includes(gate.id) ? { ...gate, status: "pass" as const } : gate,
  );
}

/**
 * Greedy plan: repeatedly clear the open gate that adds the most weighted
 * readiness until the target is met or no open gates remain.
 */
export function buildImprovementPlan(
  gates: readonly ReadinessGate[],
  target: number = READINESS_TARGET_PERCENT,
): ImprovementPlan {
  const currentPercent = weightedReadiness(gates);
  const open = gates.filter((gate) => gate.status !== "pass").map((gate) => gate.id);
  const guide = new Map(buildLaunchChecklist(gates).map((item) => [item.id, item]));

  const chosen: string[] = [];
  const steps: ImprovementStep[] = [];
  let running = currentPercent;

  while (running < target && chosen.length < open.length) {
    let best: { id: string; percent: number } | null = null;
    for (const id of open) {
      if (chosen.includes(id)) continue;
      const percent = weightedReadiness(withGatesPassing(gates, [...chosen, id]));
      if (!best || percent > best.percent) best = { id, percent };
    }
    if (!best || best.percent <= running) {
      // No further measurable gain — stop rather than pad the plan.
      if (!best) break;
    }
    chosen.push(best.id);
    const gate = gates.find((g) => g.id === best!.id);
    steps.push({
      gateId: best.id,
      label: gate?.label ?? best.id,
      requirement: REQUIREMENTS[best.id] ?? gate?.detail ?? "Clear this gate.",
      actions: guide.get(best.id)?.actions ?? [],
      fromPercent: running,
      toPercent: best.percent,
      gainPercent: Math.max(0, best.percent - running),
      reachesTarget: best.percent >= target,
    });
    running = best.percent;
  }

  const finalGates = withGatesPassing(gates, chosen);
  const projectedPercent = weightedReadiness(finalGates);
  const projectedByAudience = audienceReadiness(finalGates).map((entry) => ({
    audience: entry.audience,
    label: entry.label,
    percent: entry.percent,
  }));

  return {
    target,
    currentPercent,
    projectedPercent,
    gapPercent: Math.max(0, target - currentPercent),
    steps,
    projectedByAudience: READINESS_AUDIENCES.map(
      (audience) =>
        projectedByAudience.find((entry) => entry.audience === audience) ?? {
          audience,
          label: audience,
          percent: 0,
        },
    ),
    targetReachable: projectedPercent >= target,
  };
}
