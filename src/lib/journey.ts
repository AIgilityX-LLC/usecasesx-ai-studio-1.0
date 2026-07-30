/**
 * Core journey model (pure).
 *
 * Discover → Capture Opportunity → Design → Score → Prioritize → Portfolio →
 * Roadmap → Export → Advisory.
 *
 * This module holds the stage vocabulary and the deterministic "next action"
 * rule used by the dashboard. No data access, no secrets — safe everywhere.
 */

export const JOURNEY_STAGES = [
  "discover",
  "capture",
  "design",
  "score",
  "prioritize",
  "export",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

/** Real counts read from the caller's workspace. Never fabricated. */
export type JourneySummary = {
  shortlisted: number;
  opportunitiesOpen: number;
  opportunitiesConverted: number;
  drafts: number;
  completed: number;
  scored: number;
  portfolios: number;
  reports: number;
};

export const EMPTY_JOURNEY_SUMMARY: JourneySummary = {
  shortlisted: 0,
  opportunitiesOpen: 0,
  opportunitiesConverted: 0,
  drafts: 0,
  completed: 0,
  scored: 0,
  portfolios: 0,
  reports: 0,
};

/** Routes that exist today. Keep in sync with `src/routes/`. */
export type JourneyRoute =
  | "/repository"
  | "/opportunities"
  | "/opportunities/new"
  | "/studio"
  | "/my-use-cases"
  | "/boards"
  | "/reports";

export type NextAction = {
  stage: JourneyStage;
  label: string;
  reason: string;
  to: JourneyRoute;
};

/**
 * First unmet stage wins, so the user is always pointed at the single next
 * step rather than a wall of competing calls to action.
 */
export function nextAction(s: JourneySummary): NextAction {
  if (s.shortlisted === 0 && s.opportunitiesOpen === 0 && s.drafts === 0) {
    return {
      stage: "discover",
      label: "Find a use case worth pursuing",
      reason: "Your workspace is empty. Start from the repository or capture a problem you know.",
      to: "/repository",
    };
  }
  if (s.opportunitiesOpen === 0 && s.drafts === 0 && s.completed === 0) {
    return {
      stage: "capture",
      label: "Capture the business problem",
      reason: "You have shortlisted ideas. Record the problem they should solve.",
      to: "/opportunities/new",
    };
  }
  if (s.drafts === 0 && s.completed === 0) {
    return {
      stage: "design",
      label: "Design your first use case",
      reason: "Convert an opportunity into a structured, business-ready use case.",
      to: "/opportunities",
    };
  }
  if (s.completed === 0) {
    return {
      stage: "design",
      label: "Finish a draft use case",
      reason: `${s.drafts} draft${s.drafts === 1 ? "" : "s"} still need completing in the Studio.`,
      to: "/studio",
    };
  }
  if (s.scored === 0) {
    return {
      stage: "score",
      label: "Score a completed use case",
      reason: "Scoring turns designs into a defensible priority order.",
      to: "/my-use-cases",
    };
  }
  if (s.portfolios === 0) {
    return {
      stage: "prioritize",
      label: "Group scored cases into a portfolio",
      reason: "Boards turn individual scores into an investment view.",
      to: "/boards",
    };
  }
  return {
    stage: "export",
    label: "Export a board-ready report",
    reason: "Your portfolio is ready to take to a decision forum.",
    to: "/reports",
  };
}

/** Ordered funnel used by the dashboard progress strip. */
export function stageProgress(s: JourneySummary): Array<{
  stage: JourneyStage;
  label: string;
  reached: boolean;
}> {
  return [
    { stage: "discover", label: "Discover", reached: s.shortlisted > 0 },
    {
      stage: "capture",
      label: "Capture",
      reached: s.opportunitiesOpen + s.opportunitiesConverted > 0,
    },
    { stage: "design", label: "Design", reached: s.drafts + s.completed > 0 },
    { stage: "score", label: "Score", reached: s.scored > 0 },
    { stage: "prioritize", label: "Prioritize", reached: s.portfolios > 0 },
    { stage: "export", label: "Export", reached: s.reports > 0 },
  ];
}

export function isNewWorkspace(s: JourneySummary): boolean {
  return (
    s.shortlisted === 0 &&
    s.opportunitiesOpen === 0 &&
    s.opportunitiesConverted === 0 &&
    s.drafts === 0 &&
    s.completed === 0
  );
}
