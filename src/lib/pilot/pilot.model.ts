/**
 * Controlled pilot programme — client-safe vocabulary and pure helpers.
 *
 * The pilot runs a fixed mission (create three use cases → score them → build a
 * portfolio → export a summary) for a small invited cohort. This module holds
 * the mission definition, checkpoint definitions and progress maths only: no
 * transport, no database client, no secrets.
 */

import { PRODUCT_EVENTS, type ProductEventName } from "@/lib/telemetry/events";
import type { JourneyStage } from "@/lib/journey";

export const PILOT_COHORT = "founding-pilot-2026-08";
export const PILOT_SEAT_TARGET_MIN = 15;
export const PILOT_SEAT_TARGET_MAX = 25;

export const PILOT_STATUSES = [
  "invited",
  "registered",
  "activated",
  "completed",
  "revoked",
] as const;
export type PilotStatus = (typeof PILOT_STATUSES)[number];

export function pilotStatusLabel(status: string): string {
  switch (status) {
    case "invited":
      return "Invited";
    case "registered":
      return "Registered";
    case "activated":
      return "Activated";
    case "completed":
      return "Mission complete";
    case "revoked":
      return "Revoked";
    default:
      return status;
  }
}

export type PilotInvitation = {
  id: string;
  cohort: string;
  email: string;
  fullName: string | null;
  organization: string | null;
  status: PilotStatus;
  userId: string | null;
  notes: string | null;
  invitedAt: string;
  registeredAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
};

/* ------------------------------------------------------------- mission */

export type MissionStep = {
  key: string;
  label: string;
  helper: string;
  stage: JourneyStage;
  /** Product event that evidences the step. Counted, never fabricated. */
  event: ProductEventName;
  target: number;
  to: string;
  cta: string;
};

/**
 * The pilot mission. Every step is evidenced by an event the product already
 * records, so progress is measured rather than self-reported.
 */
export const PILOT_MISSION: MissionStep[] = [
  {
    key: "onboard",
    label: "Set up your workspace",
    helper: "Name your organisation and workspace so your pilot work stays private to you.",
    stage: "discover",
    event: PRODUCT_EVENTS.onboardingCompleted,
    target: 1,
    to: "/onboarding",
    cta: "Finish setup",
  },
  {
    key: "create",
    label: "Create three use cases",
    helper: "Start from the repository or capture your own problem, then complete the draft.",
    stage: "design",
    event: PRODUCT_EVENTS.useCaseCompleted,
    target: 3,
    to: "/studio",
    cta: "Open the Studio",
  },
  {
    key: "score",
    label: "Score all three",
    helper: "Run value and feasibility scoring so the three can be compared.",
    stage: "score",
    event: PRODUCT_EVENTS.useCaseScored,
    target: 3,
    to: "/studio",
    cta: "Score a use case",
  },
  {
    key: "portfolio",
    label: "Build a portfolio",
    helper: "Group the scored use cases into a portfolio you would take to a decision meeting.",
    stage: "prioritize",
    event: PRODUCT_EVENTS.portfolioCreated,
    target: 1,
    to: "/studio/portfolio",
    cta: "Build portfolio",
  },
  {
    key: "export",
    label: "Export the summary",
    helper: "Export the portfolio summary — the artefact you would actually circulate.",
    stage: "export",
    event: PRODUCT_EVENTS.reportExported,
    target: 1,
    to: "/studio/portfolio",
    cta: "Export summary",
  },
];

export type MissionStepProgress = MissionStep & {
  count: number;
  done: boolean;
};

export type MissionProgress = {
  steps: MissionStepProgress[];
  completedSteps: number;
  totalSteps: number;
  percent: number;
  complete: boolean;
  /** True once any mission evidence exists — the activation signal. */
  activated: boolean;
  nextStep: MissionStepProgress | null;
};

/** Pure progress maths over counted product events. */
export function computeMissionProgress(counts: Record<string, number>): MissionProgress {
  const steps: MissionStepProgress[] = PILOT_MISSION.map((step) => {
    const count = Math.max(0, counts[step.event] ?? 0);
    return { ...step, count, done: count >= step.target };
  });
  const completedSteps = steps.filter((s) => s.done).length;
  const totalSteps = steps.length;
  return {
    steps,
    completedSteps,
    totalSteps,
    percent: totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100),
    complete: completedSteps === totalSteps,
    activated: steps.some((s) => s.count > 0),
    nextStep: steps.find((s) => !s.done) ?? null,
  };
}

/* --------------------------------------------------------- checkpoints */

export type PilotCheckpoint = {
  key: string;
  title: string;
  prompt: string;
  stage: JourneyStage;
  /** Mission step that must be reached before the checkpoint is offered. */
  afterStep: string | null;
  asksValue: boolean;
  asksWillingness: boolean;
};

export const PILOT_CHECKPOINTS: PilotCheckpoint[] = [
  {
    key: "welcome",
    title: "Getting started",
    prompt: "How clear was the mission and the first setup step?",
    stage: "discover",
    afterStep: null,
    asksValue: false,
    asksWillingness: false,
  },
  {
    key: "scoring",
    title: "After scoring",
    prompt: "How confident are you in the scores you produced?",
    stage: "score",
    afterStep: "score",
    asksValue: false,
    asksWillingness: false,
  },
  {
    key: "final",
    title: "Final value check",
    prompt: "Would the exported summary hold up in a real decision meeting?",
    stage: "export",
    afterStep: "export",
    asksValue: true,
    asksWillingness: true,
  },
];

export const WILLINGNESS_OPTIONS = [
  { value: "would_not_pay", label: "Would not pay for this today" },
  { value: "team_budget", label: "Would pay from a team budget" },
  { value: "department_budget", label: "Would pay from a department budget" },
  { value: "enterprise_budget", label: "Would fund as an enterprise programme" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export type PilotCheckpointResponse = {
  id: string;
  checkpoint: string;
  journeyStage: string | null;
  contextRoute: string | null;
  rating: number | null;
  effortRating: number | null;
  valueRating: number | null;
  willingness: string | null;
  advisoryInterest: boolean;
  blocked: boolean;
  comment: string | null;
  createdAt: string;
  userId?: string | null;
  /** Mission step the answer is about — anchors the deep link back. */
  missionStep?: string | null;
  /** The exact use cases the participant had in play for that step. */
  useCaseIds?: string[];
  /** The portfolio the participant built for the mission, when relevant. */
  portfolioId?: string | null;
};

/* ------------------------------------------------- checkpoint deep links */

export type PilotDeepLink = {
  label: string;
  to: string;
  /** Route params for parameterised routes (e.g. the use case id). */
  params?: Record<string, string>;
  kind: "step" | "use-case" | "portfolio" | "context";
};

export function missionStepByKey(key: string | null | undefined): MissionStep | null {
  if (!key) return null;
  return PILOT_MISSION.find((s) => s.key === key) ?? null;
}

/**
 * Deep links from one checkpoint answer back to the exact work it describes:
 * the mission step, each referenced use case, and the portfolio used.
 */
export function checkpointDeepLinks(response: PilotCheckpointResponse): PilotDeepLink[] {
  const links: PilotDeepLink[] = [];
  const step = missionStepByKey(response.missionStep);
  if (step) links.push({ label: `Step: ${step.label}`, to: step.to, kind: "step" });
  for (const [index, id] of (response.useCaseIds ?? []).entries()) {
    links.push({
      label: `Use case ${index + 1}`,
      to: "/studio/use-case/$id",
      params: { id },
      kind: "use-case",
    });
  }
  if (response.portfolioId) {
    links.push({ label: "Portfolio", to: "/studio/portfolio", kind: "portfolio" });
  }
  if (!step && response.contextRoute) {
    links.push({ label: response.contextRoute, to: response.contextRoute, kind: "context" });
  }
  return links;
}

/* ------------------------------------------------------------ audit trail */

export const PILOT_AUDIT_ACTIONS = [
  "invitation.created",
  "invitation.linked",
  "invitation.status_changed",
  "invitation.revoked",
  "invitations.paused",
  "invitations.resumed",
] as const;
export type PilotAuditAction = (typeof PILOT_AUDIT_ACTIONS)[number];

export function pilotAuditActionLabel(action: string): string {
  switch (action) {
    case "invitation.created":
      return "Invitation created";
    case "invitation.linked":
      return "Account linked to invitation";
    case "invitation.status_changed":
      return "Status changed";
    case "invitation.revoked":
      return "Seat revoked";
    case "invitations.paused":
      return "New invitations paused";
    case "invitations.resumed":
      return "Invitations resumed";
    default:
      return action;
  }
}

export type PilotAuditEvent = {
  id: string;
  cohort: string;
  invitationId: string | null;
  subjectEmail: string | null;
  subjectUserId: string | null;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  actorId: string | null;
  actorKind: string;
  createdAt: string;
};

/* -------------------------------------------------------------- reminders */

export type PilotReminderKind = "mission_step" | "checkpoint";

export type PilotReminder = {
  id: string;
  kind: PilotReminderKind;
  missionStep: string | null;
  checkpoint: string | null;
  title: string;
  body: string;
  targetRoute: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
};

export type PilotReminderDraft = {
  kind: PilotReminderKind;
  missionStep: string | null;
  checkpoint: string | null;
  title: string;
  body: string;
  targetRoute: string | null;
};

/**
 * What a participant should be reminded about right now: the next pending
 * mission step, and any checkpoint they can answer but have not.
 *
 * Pure — measured progress in, drafts out. Nothing is created for a mission
 * that is already complete and fully answered.
 */
export function buildReminderDrafts(
  progress: MissionProgress,
  answeredCheckpoints: string[],
): PilotReminderDraft[] {
  const drafts: PilotReminderDraft[] = [];
  const next = progress.nextStep;
  if (next) {
    const remaining = Math.max(0, next.target - next.count);
    drafts.push({
      kind: "mission_step",
      missionStep: next.key,
      checkpoint: null,
      title: `Next mission step: ${next.label}`,
      body:
        next.target > 1
          ? `${remaining} of ${next.target} still to go. ${next.helper}`
          : next.helper,
      targetRoute: next.to,
    });
  }
  for (const checkpoint of availableCheckpoints(progress, answeredCheckpoints)) {
    drafts.push({
      kind: "checkpoint",
      missionStep: checkpoint.afterStep,
      checkpoint: checkpoint.key,
      title: `Checkpoint waiting: ${checkpoint.title}`,
      body: checkpoint.prompt,
      targetRoute: "/pilot",
    });
  }
  return drafts;
}

export function willingnessLabel(value: string | null): string {
  if (!value) return "—";
  return WILLINGNESS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Which checkpoints the participant may answer right now (in order). */
export function availableCheckpoints(
  progress: MissionProgress,
  answered: string[],
): PilotCheckpoint[] {
  const doneKeys = new Set(progress.steps.filter((s) => s.done).map((s) => s.key));
  const answeredSet = new Set(answered);
  return PILOT_CHECKPOINTS.filter((cp) => {
    if (answeredSet.has(cp.key)) return false;
    if (!cp.afterStep) return true;
    return doneKeys.has(cp.afterStep);
  });
}

/* ------------------------------------------------------- cohort summary */

export type PilotCohortRow = PilotInvitation & {
  progress: MissionProgress;
  checkpointCount: number;
  advisoryInterest: boolean;
  blockersReported: number;
};

export type PilotCohortSummary = {
  invited: number;
  registered: number;
  activated: number;
  completed: number;
  revoked: number;
  seatTarget: number;
  blockersReported: number;
  advisoryInterest: number;
  checkpointResponses: number;
};

export function summarizeCohort(rows: PilotCohortRow[], seatTarget: number): PilotCohortSummary {
  const active = rows.filter((r) => r.status !== "revoked");
  return {
    invited: active.length,
    registered: active.filter((r) => r.userId != null).length,
    activated: active.filter((r) => r.progress.activated).length,
    completed: active.filter((r) => r.progress.complete).length,
    revoked: rows.filter((r) => r.status === "revoked").length,
    seatTarget,
    blockersReported: rows.reduce((sum, r) => sum + r.blockersReported, 0),
    advisoryInterest: rows.filter((r) => r.advisoryInterest).length,
    checkpointResponses: rows.reduce((sum, r) => sum + r.checkpointCount, 0),
  };
}
