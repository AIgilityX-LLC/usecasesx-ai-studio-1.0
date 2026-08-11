/**
 * Pilot evidence triage — stabilisation, not expansion.
 *
 * Turns the signals the product already records (pilot checkpoints, structured
 * feedback, AI usage, zero-result searches, security alerts) into a classified
 * defect list and an explicit release verdict.
 *
 * Pure module: no transport, no database client, no secrets. Nothing here
 * invents a number — every finding carries the count it was derived from.
 */

import type { AiUsageRow, SearchInsightRow } from "@/lib/analytics/launch-learning.model";
import type { FeedbackRecord } from "@/lib/feedback/feedback.model";
import type { SecurityAlert } from "@/lib/observability/observability.model";
import type { PilotCheckpointResponse, PilotCohortSummary } from "@/lib/pilot/pilot.model";

/** Triage classes, in the order they must be worked. */
export const TRIAGE_CLASSES = ["p0", "p1", "p2", "education", "out_of_scope"] as const;
export type TriageClass = (typeof TRIAGE_CLASSES)[number];

export const TRIAGE_CLASS_LABEL: Record<TriageClass, string> = {
  p0: "P0 — blocks launch",
  p1: "P1 — launch-critical",
  p2: "P2 — post-launch",
  education: "Education / content",
  out_of_scope: "Out of scope",
};

export const TRIAGE_CLASS_TONE: Record<
  TriageClass,
  "destructive" | "default" | "secondary" | "outline"
> = {
  p0: "destructive",
  p1: "default",
  p2: "secondary",
  education: "outline",
  out_of_scope: "outline",
};

export type TriageSource =
  | "pilot_checkpoint"
  | "feedback"
  | "ai_usage"
  | "search"
  | "security_alert";

export type TriageFinding = {
  /** Stable key so the same signal does not produce two findings. */
  key: string;
  triage: TriageClass;
  source: TriageSource;
  title: string;
  detail: string;
  /** How many observations back this finding. Never fabricated. */
  observations: number;
  /** Where an admin goes to see the underlying evidence. */
  evidenceRoute: string | null;
  action: string;
};

export type PilotEvidence = {
  cohort: PilotCohortSummary;
  checkpoints: readonly PilotCheckpointResponse[];
  feedback: readonly FeedbackRecord[];
  aiUsage: readonly AiUsageRow[];
  noResultSearches: readonly SearchInsightRow[];
  securityAlerts: readonly SecurityAlert[];
};

/** Ratings at or below this read as "the step did not work for me". */
export const LOW_RATING = 2;
/** AI error ratios above these thresholds are treated as defects, not noise. */
export const AI_ERROR_P1_RATIO = 0.2;
export const AI_ERROR_P0_RATIO = 0.5;
export const AI_MIN_CALLS = 5;
/** A repeated dead-end search is a content gap, not a code defect. */
export const SEARCH_GAP_MIN = 3;
/** Minimum answered checkpoints before the evidence base counts as usable. */
export const MIN_CHECKPOINTS_FOR_VERDICT = 10;
/** How long a cohort may sit without producing evidence before we alert. */
export const EVIDENCE_GAP_WINDOW_DAYS = 7;

export type EvidenceGapState = "none" | "no_invitations" | "no_registrations" | "no_answers";

export type EvidenceGapAlert = {
  /** "none" means the cohort is producing evidence — no alert should render. */
  state: EvidenceGapState;
  /** True once the fixed window has elapsed with the gap still open. */
  triggered: boolean;
  windowDays: number;
  /** Whole days the gap has been open, measured from the cohort start. */
  daysOpen: number;
  title: string;
  detail: string;
  action: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Evidence-gap watchdog. Alerts when the cohort has been open for longer than
 * the window without producing the evidence the verdict depends on: no seats
 * issued, nobody registered, or nobody answering a checkpoint.
 *
 * `cohortStartedAt` is the first invitation timestamp; with no invitations at
 * all the clock runs from `cohortOpenedAt` (settings/last change).
 */
export function evaluateEvidenceGap(
  evidence: PilotEvidence,
  options: {
    cohortStartedAt: string | null;
    cohortOpenedAt?: string | null;
    now?: Date;
    windowDays?: number;
  },
): EvidenceGapAlert {
  const windowDays = Math.max(1, options.windowDays ?? EVIDENCE_GAP_WINDOW_DAYS);
  const now = options.now ?? new Date();
  const anchor = options.cohortStartedAt ?? options.cohortOpenedAt ?? null;
  const daysOpen = anchor
    ? Math.max(0, Math.floor((now.getTime() - new Date(anchor).getTime()) / DAY_MS))
    : 0;
  const { invited, registered, checkpointResponses } = evidence.cohort;

  const state: EvidenceGapState =
    invited === 0
      ? "no_invitations"
      : registered === 0
        ? "no_registrations"
        : checkpointResponses === 0
          ? "no_answers"
          : "none";

  const copy: Record<Exclude<EvidenceGapState, "none">, { title: string; detail: string; action: string }> = {
    no_invitations: {
      title: "Pilot evidence gap — no seats issued",
      detail: `The cohort has been open ${daysOpen} day(s) with 0 invitations, so no verdict can be produced.`,
      action: "Enrol 15–25 participants, then re-read this panel.",
    },
    no_registrations: {
      title: "Pilot evidence gap — invitations unclaimed",
      detail: `${invited} seat(s) issued and 0 registrations after ${daysOpen} day(s).`,
      action: "Re-send the invitations or replace unresponsive seats.",
    },
    no_answers: {
      title: "Pilot evidence gap — no checkpoint answers",
      detail: `${registered} participant(s) registered but 0 checkpoint answers after ${daysOpen} day(s).`,
      action: "Send pending-step reminders and shorten the mission ask.",
    },
  };

  if (state === "none") {
    return {
      state,
      triggered: false,
      windowDays,
      daysOpen,
      title: "Pilot evidence is accumulating",
      detail: `${checkpointResponses} checkpoint answer(s) recorded.`,
      action: "No action required.",
    };
  }

  return {
    state,
    triggered: daysOpen >= windowDays,
    windowDays,
    daysOpen,
    ...copy[state],
  };
}

const ratio = (errors: number, calls: number) => (calls === 0 ? 0 : errors / calls);

function feedbackClass(record: FeedbackRecord): TriageClass {
  if (record.category === "enterprise_interest") return "out_of_scope";
  if (record.category === "missing_capability") return "out_of_scope";
  if (record.category === "data_quality") return "education";
  if (record.severity === "blocking") return "p0";
  if (record.severity === "high") {
    return record.category === "bug" || record.category === "performance" ? "p1" : "p2";
  }
  return "p2";
}

/**
 * Classify every signal in the evidence set. Deterministic and order-stable so
 * two runs over the same evidence produce the same report.
 */
export function triagePilotEvidence(evidence: PilotEvidence): TriageFinding[] {
  const findings: TriageFinding[] = [];

  // 1. Explicit blockers reported at a checkpoint — always P0.
  const blocked = evidence.checkpoints.filter((c) => c.blocked);
  if (blocked.length > 0) {
    findings.push({
      key: "checkpoint.blocked",
      triage: "p0",
      source: "pilot_checkpoint",
      title: "Participants reported being blocked mid-mission",
      detail: `${blocked.length} checkpoint answer(s) flagged the journey as blocked at: ${[
        ...new Set(blocked.map((c) => c.missionStep ?? c.checkpoint)),
      ].join(", ")}.`,
      observations: blocked.length,
      evidenceRoute: "/administration/pilot",
      action: "Reproduce the flagged step, fix it, and cover it with a regression test.",
    });
  }

  // 2. Low confidence / high effort on a step — copy and required-field signal.
  const lowRated = evidence.checkpoints.filter(
    (c) =>
      (c.rating != null && c.rating <= LOW_RATING) ||
      (c.effortRating != null && c.effortRating >= 4),
  );
  if (lowRated.length > 0) {
    findings.push({
      key: "checkpoint.low_confidence",
      triage: lowRated.length >= 3 ? "p1" : "p2",
      source: "pilot_checkpoint",
      title: "Steps rated hard or unconvincing",
      detail: `${lowRated.length} answer(s) rated a step ${LOW_RATING}/5 or lower, or effort 4+/5.`,
      observations: lowRated.length,
      evidenceRoute: "/administration/pilot",
      action:
        "Tighten labels, helper text, required fields and empty states on the named step only.",
    });
  }

  // 3. Structured feedback, grouped by its own category/severity.
  const groups = new Map<string, { triage: TriageClass; records: FeedbackRecord[] }>();
  for (const record of evidence.feedback) {
    if (record.status === "resolved" || record.status === "declined") continue;
    const triage = feedbackClass(record);
    const key = `${triage}:${record.category}`;
    const entry = groups.get(key) ?? { triage, records: [] };
    entry.records.push(record);
    groups.set(key, entry);
  }
  for (const [key, entry] of groups) {
    findings.push({
      key: `feedback.${key}`,
      triage: entry.triage,
      source: "feedback",
      title: `Open reports: ${entry.records[0]!.category.replace(/_/g, " ")}`,
      detail: `${entry.records.length} unresolved report(s) classified ${TRIAGE_CLASS_LABEL[entry.triage]}.`,
      observations: entry.records.length,
      evidenceRoute: "/administration/requests",
      action:
        entry.triage === "p0" || entry.triage === "p1"
          ? "Fix before launch and link the regression test in the request."
          : "Record in known issues and schedule after launch.",
    });
  }

  // 4. AI failure rates.
  for (const row of evidence.aiUsage) {
    if (row.calls < AI_MIN_CALLS) continue;
    const rate = ratio(row.errors, row.calls);
    if (rate < AI_ERROR_P1_RATIO) continue;
    findings.push({
      key: `ai.${row.task}`,
      triage: rate >= AI_ERROR_P0_RATIO ? "p0" : "p1",
      source: "ai_usage",
      title: `AI task failing: ${row.task}`,
      detail: `${row.errors} of ${row.calls} calls failed (${Math.round(rate * 100)}%).`,
      observations: row.errors,
      evidenceRoute: "/administration/observability",
      action: "Fix the failing path or degrade it gracefully with an honest error state.",
    });
  }

  // 5. Repeated dead-end searches — content, not code.
  const gaps = evidence.noResultSearches.filter((s) => s.zeroResultSearches >= SEARCH_GAP_MIN);
  if (gaps.length > 0) {
    findings.push({
      key: "search.zero_results",
      triage: "education",
      source: "search",
      title: "Searches that repeatedly return nothing",
      detail: `${gaps.length} quer(y/ies) returned no results ${SEARCH_GAP_MIN}+ times: ${gaps
        .slice(0, 5)
        .map((g) => g.query)
        .join(", ")}.`,
      observations: gaps.reduce((sum, g) => sum + g.zeroResultSearches, 0),
      evidenceRoute: "/administration/launch-learning",
      action: "Add repository content or synonyms; no product change required.",
    });
  }

  // 6. Security alerts that crossed their own threshold.
  for (const alert of evidence.securityAlerts) {
    if (!alert.triggered) continue;
    findings.push({
      key: `security.${alert.id}`,
      triage: alert.severity === "critical" ? "p0" : "p1",
      source: "security_alert",
      title: alert.title,
      detail: `${alert.count} event(s) in the last ${alert.windowHours}h (threshold ${alert.threshold}).`,
      observations: alert.count,
      evidenceRoute: "/administration/observability",
      action: alert.guidance,
    });
  }

  const order: Record<TriageClass, number> = { p0: 0, p1: 1, p2: 2, education: 3, out_of_scope: 4 };
  return findings.sort(
    (a, b) =>
      order[a.triage] - order[b.triage] ||
      b.observations - a.observations ||
      a.key.localeCompare(b.key),
  );
}

export type ReleaseVerdict = "go" | "conditional_go" | "no_go" | "insufficient_evidence";

export type FreezeRecommendation = {
  verdict: ReleaseVerdict;
  headline: string;
  reasons: string[];
  counts: Record<TriageClass, number>;
  /** True when code changes should stop except P0 fixes. */
  freezeRecommended: boolean;
};

/**
 * The go/no-go gate. Evidence volume is part of the gate: a cohort that has not
 * answered enough checkpoints cannot produce a Go, however clean it looks.
 */
export function recommendFreeze(
  evidence: PilotEvidence,
  findings: readonly TriageFinding[],
): FreezeRecommendation {
  const counts = TRIAGE_CLASSES.reduce(
    (acc, cls) => ({ ...acc, [cls]: findings.filter((f) => f.triage === cls).length }),
    {} as Record<TriageClass, number>,
  );
  const reasons: string[] = [];
  const answered = evidence.cohort.checkpointResponses;

  if (counts.p0 > 0) {
    reasons.push(`${counts.p0} open P0 finding(s) must be fixed and tested before launch.`);
  }
  if (counts.p1 > 0) {
    reasons.push(`${counts.p1} launch-critical P1 finding(s) need a fix or a written mitigation.`);
  }
  if (answered < MIN_CHECKPOINTS_FOR_VERDICT) {
    reasons.push(
      `Only ${answered} checkpoint answer(s) recorded; ${MIN_CHECKPOINTS_FOR_VERDICT} are needed for a defensible verdict.`,
    );
  }
  if (evidence.cohort.activated === 0) {
    reasons.push("No participant has produced mission evidence yet, so the journey is unproven.");
  }

  let verdict: ReleaseVerdict;
  if (counts.p0 > 0) verdict = "no_go";
  else if (answered < MIN_CHECKPOINTS_FOR_VERDICT || evidence.cohort.activated === 0)
    verdict = "insufficient_evidence";
  else if (counts.p1 > 0) verdict = "conditional_go";
  else verdict = "go";

  const headline =
    verdict === "no_go"
      ? "No-Go — open P0 pilot defects"
      : verdict === "insufficient_evidence"
        ? "No-Go on evidence — pilot has not produced enough signal yet"
        : verdict === "conditional_go"
          ? "Conditional Go — P1 findings need fixes or written mitigations"
          : "Go — no open P0 or P1 findings in the pilot evidence";

  return {
    verdict,
    headline,
    reasons,
    counts,
    // Freeze as soon as there is real evidence to protect: only P0 fixes after that.
    freezeRecommended: verdict !== "insufficient_evidence" || answered > 0,
  };
}
