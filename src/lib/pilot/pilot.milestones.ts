/**
 * Client-safe milestone catalog for the pilot programme.
 *
 * A milestone is "auto-evidenced" from the participant's own workspace
 * activity, then submitted for admin approval. The catalog lives in code (not
 * the database) because the programme shape is fixed for the cohort and every
 * surface — portal, admin queue, funnel — must agree on the same keys.
 */

export type PilotMilestoneKey =
  | "onboarding"
  | "first_use_case"
  | "scored"
  | "portfolio"
  | "roadmap"
  | "checkpoint";

export type PilotMilestoneStatus = "locked" | "ready" | "submitted" | "approved" | "changes_requested";

export type PilotMilestoneDefinition = {
  key: PilotMilestoneKey;
  label: string;
  description: string;
  /** Where the participant does the work. */
  href: string;
  actionLabel: string;
};

export const PILOT_MILESTONES: PilotMilestoneDefinition[] = [
  {
    key: "onboarding",
    label: "Onboarding intake complete",
    description: "Your organisation, role, sector and country are on record for the cohort.",
    href: "/pilot",
    actionLabel: "Complete intake",
  },
  {
    key: "first_use_case",
    label: "First use case drafted",
    description: "At least one AI use case exists in your workspace, drafted or imported.",
    href: "/studio",
    actionLabel: "Open the Studio",
  },
  {
    key: "scored",
    label: "Use case scored",
    description: "You ran a feasibility or value score against one of your use cases.",
    href: "/feasibility",
    actionLabel: "Score a use case",
  },
  {
    key: "portfolio",
    label: "Portfolio assembled",
    description: "Your prioritised use cases sit in a portfolio you can present.",
    href: "/portfoliox",
    actionLabel: "Build the portfolio",
  },
  {
    key: "roadmap",
    label: "Roadmap sequenced",
    description: "Portfolio items carry a delivery horizon so the roadmap is real.",
    href: "/roadmap",
    actionLabel: "Sequence the roadmap",
  },
  {
    key: "checkpoint",
    label: "Checkpoint response filed",
    description: "You answered at least one programme checkpoint with evidence.",
    href: "/pilot/portal",
    actionLabel: "Answer a checkpoint",
  },
];

export const MILESTONE_STATUS_LABEL: Record<PilotMilestoneStatus, string> = {
  locked: "Not started",
  ready: "Ready to submit",
  submitted: "Awaiting approval",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export type PilotMilestoneView = {
  key: PilotMilestoneKey;
  status: PilotMilestoneStatus;
  /** Measured count behind the milestone, e.g. number of scores run. */
  evidenceCount: number;
  participantNote: string | null;
  decisionNote: string | null;
  decidedByLabel: string | null;
  decidedAt: string | null;
  submittedAt: string | null;
};

export type PilotProgressSummary = {
  useCases: number;
  scores: number;
  portfolios: number;
  portfolioItems: number;
  roadmapItems: number;
  checkpoints: number;
  onboarded: boolean;
};

/** Percentage of milestones an admin has approved. */
export function approvedPercent(milestones: PilotMilestoneView[]): number {
  if (milestones.length === 0) return 0;
  const approved = milestones.filter((m) => m.status === "approved").length;
  return Math.round((approved / milestones.length) * 100);
}

/** Evidence threshold per milestone — the point at which it can be submitted. */
export function isEvidenced(key: PilotMilestoneKey, progress: PilotProgressSummary): boolean {
  switch (key) {
    case "onboarding":
      return progress.onboarded;
    case "first_use_case":
      return progress.useCases > 0;
    case "scored":
      return progress.scores > 0;
    case "portfolio":
      return progress.portfolioItems > 0;
    case "roadmap":
      return progress.roadmapItems > 0;
    case "checkpoint":
      return progress.checkpoints > 0;
    default:
      return false;
  }
}

export function evidenceCount(key: PilotMilestoneKey, progress: PilotProgressSummary): number {
  switch (key) {
    case "onboarding":
      return progress.onboarded ? 1 : 0;
    case "first_use_case":
      return progress.useCases;
    case "scored":
      return progress.scores;
    case "portfolio":
      return progress.portfolioItems;
    case "roadmap":
      return progress.roadmapItems;
    case "checkpoint":
      return progress.checkpoints;
    default:
      return 0;
  }
}
