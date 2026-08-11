/**
 * Recorded launch-check runs (pure).
 *
 * Every signed-in P0/P1 harness pass is written to the ledger with what
 * triggered it, so the pilot evidence timeline can show that checks were
 * re-run at the moment a waiver was approved or a seat status changed.
 */

import type { CheckResult, HarnessSummary } from "./harness";

export const RUN_TRIGGERS = [
  "manual",
  "waiver_granted",
  "waiver_revoked",
  "pilot_status_changed",
  "verdict_recorded",
] as const;
export type RunTrigger = (typeof RUN_TRIGGERS)[number];

export const RUN_TRIGGER_LABEL: Record<string, string> = {
  manual: "Run on demand",
  waiver_granted: "Waiver approved",
  waiver_revoked: "Waiver revoked",
  pilot_status_changed: "Pilot status changed",
  verdict_recorded: "Verdict recorded",
};

export type LaunchCheckRun = {
  id: string;
  cohort: string;
  trigger: RunTrigger | string;
  triggerDetail: string | null;
  actorId: string | null;
  actorEmail: string | null;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  p0Failures: number;
  results: CheckResult[];
  createdAt: string;
};

/** "pass" only when nothing failed or errored — same rule as the live run. */
export function runVerdict(run: {
  failed: number;
  errored: number;
  p0Failures: number;
}): "pass" | "attention" | "fail" {
  if (run.p0Failures > 0) return "fail";
  return run.failed + run.errored > 0 ? "attention" : "pass";
}

export function describeRun(run: LaunchCheckRun): string {
  const verdict = runVerdict(run).toUpperCase();
  const trigger = RUN_TRIGGER_LABEL[run.trigger] ?? run.trigger;
  return (
    `${verdict} · ${trigger} · ${run.passed}/${run.total} passed, ` +
    `${run.failed} failed, ${run.errored} errored, ${run.skipped} skipped · P0 failures ${run.p0Failures}` +
    (run.triggerDetail ? ` · ${run.triggerDetail}` : "")
  );
}

/** Row shape written to the ledger from a live harness run. */
export function toRunRecord(input: {
  cohort: string;
  trigger: RunTrigger;
  triggerDetail?: string | null;
  actorId: string;
  actorEmail: string | null;
  results: readonly CheckResult[];
  summary: HarnessSummary;
}) {
  return {
    cohort: input.cohort,
    trigger: input.trigger,
    trigger_detail: input.triggerDetail ?? null,
    actor_id: input.actorId,
    actor_email: input.actorEmail,
    total: input.summary.total,
    passed: input.summary.passed,
    failed: input.summary.failed,
    skipped: input.summary.skipped,
    errored: input.summary.errored,
    p0_failures: input.summary.p0Failures,
    results: input.results,
  };
}
