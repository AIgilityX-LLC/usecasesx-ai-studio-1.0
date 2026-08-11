/**
 * Launch readiness model (pure).
 *
 * Combines what the signed-in P0/P1 harness observed, the state of the pilot
 * evidence gate and the frozen candidate identity into one artifact that can
 * be read on screen and downloaded for the release record. Nothing here
 * guesses: a gate with no measurement reports "unknown", never "pass".
 */

import type { CheckResult } from "@/lib/qa/harness";
import type { LaunchCheckRun } from "@/lib/qa/launch-runs";
import { runVerdict, RUN_TRIGGER_LABEL } from "@/lib/qa/launch-runs";
import { PILOT_SEAT_TARGET_MIN, PILOT_SEAT_TARGET_MAX } from "@/lib/pilot/pilot.model";
import type { PilotCohortSummary } from "@/lib/pilot/pilot.model";
import { RELEASE_MARKER, RELEASE_TARGET_DATE, RELEASE_VERSION } from "@/lib/release";
import { VERIFICATION_STEPS } from "./candidate";

export type GateStatus = "pass" | "attention" | "fail" | "unknown";

export type ReadinessGate = {
  id: string;
  label: string;
  status: GateStatus;
  detail: string;
};

export type ReadinessVerdict = "ready" | "conditional" | "blocked";

export type ReadinessInput = {
  /** Most recent recorded launch-check run, if any. */
  run: LaunchCheckRun | null;
  /** Cohort roll-up from the pilot programme, if readable. */
  cohort: PilotCohortSummary | null;
  /** True when an evidence waiver is in force. */
  waiverActive: boolean;
  waiverNote?: string;
  generatedAt: string;
  actor: string;
};

/** Checks that failed or errored in the run — the failing assertions. */
export function failingAssertions(run: LaunchCheckRun | null): CheckResult[] {
  if (!run) return [];
  return run.results.filter((result) => result.status === "fail" || result.status === "error");
}

function seatGate(cohort: PilotCohortSummary | null, waiverActive: boolean): ReadinessGate {
  if (!cohort) {
    return {
      id: "pilot.seats",
      label: "Pilot cohort enrolled",
      status: "unknown",
      detail: "Cohort figures were not readable for this account.",
    };
  }
  const seats = cohort.invited;
  if (seats >= PILOT_SEAT_TARGET_MIN && seats <= PILOT_SEAT_TARGET_MAX) {
    return {
      id: "pilot.seats",
      label: "Pilot cohort enrolled",
      status: "pass",
      detail: `${seats} active seat(s) within the ${PILOT_SEAT_TARGET_MIN}–${PILOT_SEAT_TARGET_MAX} target.`,
    };
  }
  const detail =
    seats === 0
      ? `No seats provisioned; the target is ${PILOT_SEAT_TARGET_MIN}–${PILOT_SEAT_TARGET_MAX}.`
      : `${seats} active seat(s), outside the ${PILOT_SEAT_TARGET_MIN}–${PILOT_SEAT_TARGET_MAX} target.`;
  return {
    id: "pilot.seats",
    label: "Pilot cohort enrolled",
    status: waiverActive ? "attention" : "fail",
    detail: waiverActive ? `${detail} An approved evidence waiver is in force.` : detail,
  };
}

function evidenceGate(cohort: PilotCohortSummary | null, waiverActive: boolean): ReadinessGate {
  if (!cohort) {
    return {
      id: "pilot.evidence",
      label: "Pilot evidence recorded",
      status: "unknown",
      detail: "Checkpoint figures were not readable for this account.",
    };
  }
  const responses = cohort.checkpointResponses;
  if (responses > 0) {
    return {
      id: "pilot.evidence",
      label: "Pilot evidence recorded",
      status: "pass",
      detail: `${responses} checkpoint response(s) from ${cohort.activated} activated seat(s).`,
    };
  }
  return {
    id: "pilot.evidence",
    label: "Pilot evidence recorded",
    status: waiverActive ? "attention" : "fail",
    detail: waiverActive
      ? "No checkpoint responses yet; an approved evidence waiver is in force."
      : "No checkpoint responses recorded, so the verdict cannot be evidence-backed.",
  };
}

export function buildReadinessGates(input: ReadinessInput): ReadinessGate[] {
  const run = input.run;
  const p0: ReadinessGate = run
    ? {
        id: "checks.p0",
        label: "P0 launch checks",
        status: run.p0Failures > 0 ? "fail" : "pass",
        detail:
          run.p0Failures > 0
            ? `${run.p0Failures} P0 failure(s) in the run of ${new Date(run.createdAt).toISOString()}.`
            : `No P0 failures — ${run.passed}/${run.total} checks passed.`,
      }
    : {
        id: "checks.p0",
        label: "P0 launch checks",
        status: "unknown",
        detail: "No launch-check run has been recorded for this cohort yet.",
      };

  const p1: ReadinessGate = run
    ? {
        id: "checks.p1",
        label: "P1 launch checks",
        status: run.failed + run.errored - run.p0Failures > 0 ? "attention" : "pass",
        detail: `${run.failed} failed · ${run.errored} errored · ${run.skipped} skipped.`,
      }
    : {
        id: "checks.p1",
        label: "P1 launch checks",
        status: "unknown",
        detail: "No recorded run to read P1 results from.",
      };

  const browser = VERIFICATION_STEPS.find((step) => step.id === "browser");
  const pipeline: ReadinessGate = {
    id: "pipeline.verification",
    label: "Pipeline verification",
    status: VERIFICATION_STEPS.every((step) => step.result === "pass") ? "pass" : "attention",
    detail:
      browser && browser.result !== "pass"
        ? "Static, unit and build gates passed; the browser P0 suite runs in CI."
        : "All recorded verification steps passed.",
  };

  return [p0, p1, seatGate(input.cohort, input.waiverActive), evidenceGate(input.cohort, input.waiverActive), pipeline];
}

export function readinessVerdict(gates: readonly ReadinessGate[]): ReadinessVerdict {
  if (gates.some((gate) => gate.status === "fail")) return "blocked";
  if (gates.some((gate) => gate.status === "attention" || gate.status === "unknown"))
    return "conditional";
  return "ready";
}

export const READINESS_VERDICT_LABEL: Record<ReadinessVerdict, string> = {
  ready: "Ready to freeze",
  conditional: "Conditional — open attention items",
  blocked: "Blocked — resolve failures before freeze",
};

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Gate-level CSV for the release record. */
export function readinessToCsv(input: ReadinessInput): string {
  const gates = buildReadinessGates(input);
  const header = ["Section", "Item", "Status", "Detail"];
  const rows: (string | number)[][] = [
    ...gates.map((gate) => ["Gate", gate.label, gate.status, gate.detail]),
    ...failingAssertions(input.run).map((result) => [
      "Failing assertion",
      `${result.id} (${result.severity.toUpperCase()})`,
      result.status,
      result.observed,
    ]),
    ...VERIFICATION_STEPS.map((step) => ["Verification", step.command, step.result, step.detail]),
  ];
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Markdown readiness report — the human-readable evidence artifact. */
export function buildReadinessMarkdown(input: ReadinessInput): string {
  const gates = buildReadinessGates(input);
  const verdict = readinessVerdict(gates);
  const failing = failingAssertions(input.run);
  const run = input.run;
  const lines: string[] = [
    `# Launch readiness report — v${RELEASE_VERSION}`,
    ``,
    `Release marker \`${RELEASE_MARKER}\` · target ${RELEASE_TARGET_DATE}`,
    `Generated ${input.generatedAt} by ${input.actor}`,
    ``,
    `**Verdict: ${READINESS_VERDICT_LABEL[verdict]}**`,
    ``,
    `## Gates`,
    ``,
    `| Gate | Status | Detail |`,
    `| --- | --- | --- |`,
    ...gates.map((gate) => `| ${gate.label} | ${gate.status} | ${gate.detail} |`),
    ``,
    `## Signed-in P0/P1 checks`,
    ``,
  ];

  if (run) {
    lines.push(
      `Run ${run.createdAt} · trigger ${RUN_TRIGGER_LABEL[run.trigger] ?? run.trigger} · actor ${
        run.actorEmail ?? run.actorId ?? "unknown"
      }`,
      ``,
      `Verdict ${runVerdict(run).toUpperCase()} — ${run.passed}/${run.total} passed · ${run.failed} failed · ${run.errored} errored · ${run.skipped} skipped · P0 failures ${run.p0Failures}`,
      ``,
    );
  } else {
    lines.push(`No recorded launch-check run for this cohort.`, ``);
  }

  lines.push(`## Failing assertions`, ``);
  if (failing.length === 0) {
    lines.push(
      run ? `None — every check passed or was deliberately skipped.` : `Not measured.`,
      ``,
    );
  } else {
    lines.push(
      `| Check | Severity | Status | Observed |`,
      `| --- | --- | --- | --- |`,
      ...failing.map(
        (result) =>
          `| ${result.id} | ${result.severity.toUpperCase()} | ${result.status} | ${result.observed.replace(/\|/g, "\\|")} |`,
      ),
      ``,
    );
  }

  lines.push(
    `## Evidence gap`,
    ``,
    input.cohort
      ? `- Seats: ${input.cohort.invited} active (target ${PILOT_SEAT_TARGET_MIN}–${PILOT_SEAT_TARGET_MAX}), ${input.cohort.registered} registered, ${input.cohort.activated} activated, ${input.cohort.completed} completed.\n- Checkpoint responses: ${input.cohort.checkpointResponses} · blockers reported: ${input.cohort.blockersReported}.`
      : `- Cohort figures were not readable for this account.`,
    `- Waiver: ${input.waiverActive ? "active" : "none"}${input.waiverNote ? ` — ${input.waiverNote}` : ""}`,
    ``,
    `## Pipeline verification`,
    ``,
    `| Step | Command | Result |`,
    `| --- | --- | --- |`,
    ...VERIFICATION_STEPS.map((step) => `| ${step.label} | \`${step.command}\` | ${step.result} |`),
    ``,
  );
  return lines.join("\n");
}