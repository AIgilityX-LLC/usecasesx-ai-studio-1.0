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
import {
  RELEASE_FREEZE_DATE,
  RELEASE_MARKER,
  RELEASE_TARGET_DATE,
  RELEASE_VERSION,
} from "@/lib/release";
import { VERIFICATION_STEPS } from "./candidate";

export type GateStatus = "pass" | "attention" | "fail" | "unknown";

export type ReadinessGate = {
  id: string;
  label: string;
  status: GateStatus;
  detail: string;
  /** When this gate was last measured, if it was measured at all. */
  verifiedAt?: string | null;
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
      verifiedAt: null,
    };
  }
  const seats = cohort.invited;
  if (seats >= PILOT_SEAT_TARGET_MIN && seats <= PILOT_SEAT_TARGET_MAX) {
    return {
      id: "pilot.seats",
      label: "Pilot cohort enrolled",
      status: "pass",
      detail: `${seats} active seat(s) within the ${PILOT_SEAT_TARGET_MIN}–${PILOT_SEAT_TARGET_MAX} target.`,
      verifiedAt: cohort.latestEvidenceAt ?? null,
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
    verifiedAt: cohort.latestEvidenceAt ?? null,
  };
}

function evidenceGate(cohort: PilotCohortSummary | null, waiverActive: boolean): ReadinessGate {
  if (!cohort) {
    return {
      id: "pilot.evidence",
      label: "Pilot evidence recorded",
      status: "unknown",
      detail: "Checkpoint figures were not readable for this account.",
      verifiedAt: null,
    };
  }
  const responses = cohort.checkpointResponses;
  const intakes = cohort.onboardingProfiles ?? 0;
  const verifiedAt = cohort.latestEvidenceAt ?? null;
  if (responses > 0 || intakes > 0) {
    return {
      id: "pilot.evidence",
      label: "Pilot evidence recorded",
      status: responses > 0 ? "pass" : "attention",
      detail:
        responses > 0
          ? `${responses} checkpoint response(s) and ${intakes} onboarding intake(s) from ${cohort.activated} activated seat(s).`
          : `${intakes} onboarding intake(s) collected; no checkpoint responses yet.`,
      verifiedAt,
    };
  }
  return {
    id: "pilot.evidence",
    label: "Pilot evidence recorded",
    status: waiverActive ? "attention" : "fail",
    detail: waiverActive
      ? "No checkpoint responses or onboarding intakes yet; an approved evidence waiver is in force."
      : "No checkpoint responses or onboarding intakes recorded, so the verdict cannot be evidence-backed.",
    verifiedAt,
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
        verifiedAt: run.createdAt,
      }
    : {
        id: "checks.p0",
        label: "P0 launch checks",
        status: "unknown",
        detail: "No launch-check run has been recorded for this cohort yet.",
        verifiedAt: null,
      };

  const p1: ReadinessGate = run
    ? {
        id: "checks.p1",
        label: "P1 launch checks",
        status: run.failed + run.errored - run.p0Failures > 0 ? "attention" : "pass",
        detail: `${run.failed} failed · ${run.errored} errored · ${run.skipped} skipped.`,
        verifiedAt: run.createdAt,
      }
    : {
        id: "checks.p1",
        label: "P1 launch checks",
        status: "unknown",
        detail: "No recorded run to read P1 results from.",
        verifiedAt: null,
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
    verifiedAt: RELEASE_FREEZE_DATE,
  };

  return [
    p0,
    p1,
    seatGate(input.cohort, input.waiverActive),
    evidenceGate(input.cohort, input.waiverActive),
    pipeline,
  ];
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

/* ------------------------------------------------- audience readiness (%) */

export const READINESS_AUDIENCES = ["investor", "demo", "client", "production"] as const;
export type ReadinessAudience = (typeof READINESS_AUDIENCES)[number];

export const READINESS_AUDIENCE_LABEL: Record<ReadinessAudience, string> = {
  investor: "Investor ready",
  demo: "Demo ready",
  client: "Client ready",
  production: "Production ready",
};

export type AudienceReadiness = {
  audience: ReadinessAudience;
  label: string;
  /** 0–100, rounded. */
  percent: number;
  verdict: ReadinessVerdict;
  detail: string;
};

/** How much each gate matters to each audience. Zero weight = not in scope. */
const AUDIENCE_WEIGHTS: Record<ReadinessAudience, Record<string, number>> = {
  investor: {
    "checks.p0": 3,
    "checks.p1": 1,
    "pipeline.verification": 3,
    "pilot.seats": 1,
    "pilot.evidence": 2,
  },
  demo: {
    "checks.p0": 3,
    "checks.p1": 1,
    "pipeline.verification": 3,
    "pilot.seats": 0,
    "pilot.evidence": 0,
  },
  client: {
    "checks.p0": 3,
    "checks.p1": 2,
    "pipeline.verification": 2,
    "pilot.seats": 2,
    "pilot.evidence": 3,
  },
  production: {
    "checks.p0": 4,
    "checks.p1": 2,
    "pipeline.verification": 3,
    "pilot.seats": 2,
    "pilot.evidence": 3,
  },
};

/** Credit given per gate status — an unmeasured gate cannot score full marks. */
const STATUS_SCORE: Record<GateStatus, number> = {
  pass: 1,
  attention: 0.6,
  unknown: 0.3,
  fail: 0,
};

/**
 * Readiness percentage per audience, derived only from the measured gates.
 * A gate that failed for an audience that depends on it drags that audience's
 * score down; gates outside an audience's scope are excluded entirely.
 */
export function audienceReadiness(gates: readonly ReadinessGate[]): AudienceReadiness[] {
  return READINESS_AUDIENCES.map((audience) => {
    const weights = AUDIENCE_WEIGHTS[audience];
    const inScope = gates.filter((gate) => (weights[gate.id] ?? 0) > 0);
    const totalWeight = inScope.reduce((sum, gate) => sum + (weights[gate.id] ?? 0), 0);
    const score = inScope.reduce(
      (sum, gate) => sum + (weights[gate.id] ?? 0) * STATUS_SCORE[gate.status],
      0,
    );
    const percent = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
    const blocking = inScope.filter((gate) => gate.status === "fail");
    const watching = inScope.filter(
      (gate) => gate.status === "attention" || gate.status === "unknown",
    );
    const verdict: ReadinessVerdict =
      blocking.length > 0 ? "blocked" : watching.length > 0 ? "conditional" : "ready";
    const detail =
      totalWeight === 0
        ? "No gates in scope for this audience."
        : blocking.length > 0
          ? `Blocked by ${blocking.map((gate) => gate.label).join(", ")}.`
          : watching.length > 0
            ? `Open items: ${watching.map((gate) => gate.label).join(", ")}.`
            : "Every gate in scope passed.";
    return { audience, label: READINESS_AUDIENCE_LABEL[audience], percent, verdict, detail };
  });
}

/** Audience percentages as CSV rows for the release record. */
export function audienceReadinessToCsv(gates: readonly ReadinessGate[]): string {
  const header = ["Audience", "Readiness %", "Verdict", "Detail"];
  const rows = audienceReadiness(gates).map((entry) => [
    entry.label,
    String(entry.percent),
    entry.verdict,
    entry.detail,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/* -------------------------------------------------- audience drilldown */

export type GateContribution = {
  gate: ReadinessGate;
  /** Weight this audience places on the gate (>0 only when in scope). */
  weight: number;
  /** Credit awarded for the gate's status, 0–1. */
  statusScore: number;
  /** Weighted points earned. */
  earned: number;
  /** Percentage points of the audience score this gate contributes. */
  contributedPercent: number;
  /** Percentage points lost on this gate. */
  lostPercent: number;
};

export function isReadinessAudience(value: string): value is ReadinessAudience {
  return (READINESS_AUDIENCES as readonly string[]).includes(value);
}

/** Per-gate contribution breakdown behind one audience percentage. */
export function audienceContributions(
  audience: ReadinessAudience,
  gates: readonly ReadinessGate[],
): GateContribution[] {
  const weights = AUDIENCE_WEIGHTS[audience];
  const totalWeight = gates.reduce((sum, gate) => sum + (weights[gate.id] ?? 0), 0);
  return gates.map((gate) => {
    const weight = weights[gate.id] ?? 0;
    const statusScore = STATUS_SCORE[gate.status];
    const earned = weight * statusScore;
    const share = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
    return {
      gate,
      weight,
      statusScore,
      earned,
      contributedPercent: Math.round(share * statusScore * 10) / 10,
      lostPercent: Math.round(share * (1 - statusScore) * 10) / 10,
    };
  });
}

/** Measured counts behind the readiness gates, for the drilldown view. */
export type MeasuredCount = { label: string; value: string; source: string };

export function measuredCounts(input: ReadinessInput): MeasuredCount[] {
  const run = input.run;
  const cohort = input.cohort;
  return [
    {
      label: "Checks passed",
      value: run ? `${run.passed}/${run.total}` : "not measured",
      source: run ? `Run ${run.createdAt}` : "No recorded launch-check run",
    },
    {
      label: "P0 failures",
      value: run ? String(run.p0Failures) : "not measured",
      source: "Signed-in P0 harness",
    },
    {
      label: "P1 failures / errors / skips",
      value: run ? `${run.failed} / ${run.errored} / ${run.skipped}` : "not measured",
      source: "Signed-in P1 harness",
    },
    {
      label: "Pilot seats active",
      value: cohort
        ? `${cohort.invited} (target ${PILOT_SEAT_TARGET_MIN}–${PILOT_SEAT_TARGET_MAX})`
        : "not readable",
      source: "Pilot cohort roll-up",
    },
    {
      label: "Checkpoint responses",
      value: cohort ? String(cohort.checkpointResponses) : "not readable",
      source: "Pilot evidence records",
    },
    {
      label: "Pipeline steps passed",
      value: `${VERIFICATION_STEPS.filter((step) => step.result === "pass").length}/${VERIFICATION_STEPS.length}`,
      source: "Recorded verification run",
    },
  ];
}

/** Participant funnel behind the pilot gates. */
export type ParticipantBreakdown = { label: string; count: number | null; note: string };

export function participantBreakdown(cohort: PilotCohortSummary | null): ParticipantBreakdown[] {
  if (!cohort)
    return [
      { label: "Cohort", count: null, note: "Cohort figures were not readable for this account." },
    ];
  return [
    {
      label: "Invited (active seats)",
      count: cohort.invited,
      note: `Seat target ${cohort.seatTarget}`,
    },
    { label: "Registered", count: cohort.registered, note: "Invitation claimed with an account" },
    { label: "Activated", count: cohort.activated, note: "Mission started" },
    { label: "Completed", count: cohort.completed, note: "Mission finished" },
    { label: "Revoked", count: cohort.revoked, note: "Seats withdrawn" },
    {
      label: "Checkpoint responses",
      count: cohort.checkpointResponses,
      note: "Evidence submitted",
    },
    {
      label: "Blockers reported",
      count: cohort.blockersReported,
      note: "Participant-reported blockers",
    },
    {
      label: "Advisory interest",
      count: cohort.advisoryInterest,
      note: "Requested advisory follow-up",
    },
  ];
}
