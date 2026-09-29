/**
 * Portfolio domain vocabulary.
 *
 * Shared between the repository, hooks and UI so the database CHECK
 * constraints and the client stay in lockstep. Enterprise-only concepts
 * (nesting, portfolio type taxonomy, organization links) exist in the schema
 * but are intentionally not surfaced in the Pro UI yet.
 */

export type PortfolioVisibility = "private" | "workspace" | "organization";

export const PORTFOLIO_VISIBILITIES: PortfolioVisibility[] = [
  "private",
  "workspace",
  "organization",
];

export const PORTFOLIO_VISIBILITY_LABELS: Record<PortfolioVisibility, string> = {
  private: "Private to me",
  workspace: "Visible to my workspace",
  organization: "Visible to my organization",
};

export type ReviewCadence = "none" | "weekly" | "monthly" | "quarterly" | "biannual" | "annual";

export const REVIEW_CADENCES: ReviewCadence[] = [
  "none",
  "weekly",
  "monthly",
  "quarterly",
  "biannual",
  "annual",
];

export const REVIEW_CADENCE_LABELS: Record<ReviewCadence, string> = {
  none: "No fixed cadence",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "Twice a year",
  annual: "Annual",
};

/** Portfolio-specific decision. Never written back onto the use case itself. */
export type PortfolioItemDecision =
  | "under_review"
  | "shortlisted"
  | "approved"
  | "deferred"
  | "rejected"
  | "delivered";

export const PORTFOLIO_ITEM_DECISIONS: PortfolioItemDecision[] = [
  "under_review",
  "shortlisted",
  "approved",
  "deferred",
  "rejected",
  "delivered",
];

export const PORTFOLIO_ITEM_DECISION_LABELS: Record<PortfolioItemDecision, string> = {
  under_review: "Under review",
  shortlisted: "Shortlisted",
  approved: "Approved",
  deferred: "Deferred",
  rejected: "Rejected",
  delivered: "Delivered",
};

export type FundingState = "unfunded" | "requested" | "funded" | "on_hold";

export const FUNDING_STATES: FundingState[] = ["unfunded", "requested", "funded", "on_hold"];

export const FUNDING_STATE_LABELS: Record<FundingState, string> = {
  unfunded: "Unfunded",
  requested: "Funding requested",
  funded: "Funded",
  on_hold: "On hold",
};

/** Read-only metadata hydrated from the source use case. Never written back. */
export interface PortfolioEntryMeta {
  status?: string;
  valuePotential?: string;
  complexity?: string;
  riskLevel?: string;
  timeToValue?: string;
  functionName?: string;
  ownerName?: string;
  /**
   * Id of the workspace Studio draft derived from this use case, when one
   * exists (`ai_use_cases.source_use_case_id`). Lets the portfolio hand off
   * into Design without guessing the id.
   */
  studioUseCaseId?: string;
}

/** One use case's membership of one portfolio. The same use case may hold many. */
export interface PortfolioEntry extends PortfolioEntryMeta, PortfolioEntryRoadmap {
  useCaseId: string;
  useCaseSlug?: string;
  useCaseTitle?: string;
  rank: number | null;
  decision: PortfolioItemDecision;
  targetPeriod?: string;
  fundingState: FundingState;
  nextAction?: string;
  notes?: string;
  reviewNotes?: string;
  lastReviewedAt?: string;
  addedAt: string;
  updatedAt: string;
}

export type PortfolioEntryPatch = {
  rank?: number | null;
  decision?: PortfolioItemDecision;
  targetPeriod?: string | null;
  fundingState?: FundingState;
  nextAction?: string | null;
  notes?: string | null;
  reviewNotes?: string | null;
  /** Set true to stamp the review date server-side on save. */
  markReviewed?: boolean;
} & PortfolioRoadmapPatch;

/* ----------------------------------------------------------- delivery roadmap */

/**
 * Delivery sequencing lane. UseCasesX records *investment intent* — which
 * quarter/wave a use case belongs to, who owns it and what happens next.
 * Detailed tasks, sprints and resource plans stay in the PPM tool.
 */
export type DeliveryStage = "now" | "next" | "later" | "unscheduled";

export const DELIVERY_STAGES: DeliveryStage[] = ["now", "next", "later", "unscheduled"];

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
  unscheduled: "Unscheduled",
};

export const DELIVERY_STAGE_DESCRIPTIONS: Record<DeliveryStage, string> = {
  now: "In delivery or starting this period",
  next: "Committed for the following period",
  later: "Intent agreed, not yet scheduled",
  unscheduled: "No delivery intent recorded yet",
};

/** Roadmap delivery status (FR-10) — distinct from portfolio decision. */
export type RoadmapItemStatus =
  | "planned"
  | "in_progress"
  | "blocked"
  | "at_risk"
  | "complete"
  | "deferred";

export const ROADMAP_ITEM_STATUSES: RoadmapItemStatus[] = [
  "planned",
  "in_progress",
  "blocked",
  "at_risk",
  "complete",
  "deferred",
];

export const ROADMAP_ITEM_STATUS_LABELS: Record<RoadmapItemStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  blocked: "Blocked",
  at_risk: "At risk",
  complete: "Complete",
  deferred: "Deferred",
};

/** Roadmap fields carried on the portfolio membership record. */
export interface PortfolioEntryRoadmap {
  deliveryStage: DeliveryStage;
  plannedStartDate?: string;
  plannedEndDate?: string;
  milestone?: string;
  deliveryOwner?: string;
  /** Other use case ids in the same portfolio this entry depends on. */
  dependsOn: string[];
  blockedReason?: string;
  /** Linked decision gate key (informational). */
  gateKey?: string;
  roadmapStatus?: RoadmapItemStatus;
}

export type PortfolioRoadmapPatch = {
  deliveryStage?: DeliveryStage;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  milestone?: string | null;
  deliveryOwner?: string | null;
  dependsOn?: string[];
  blockedReason?: string | null;
  gateKey?: string | null;
  roadmapStatus?: RoadmapItemStatus | null;
};
