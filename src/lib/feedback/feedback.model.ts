/**
 * Client-safe feedback vocabulary and shapes.
 *
 * Feedback is deliberately structured (category + severity + context) so the
 * internal queue can be triaged without reading free text first. No secrets,
 * no transport and no database client live here.
 */

export const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Something is broken" },
  { value: "usability", label: "Hard to use / confusing" },
  { value: "data_quality", label: "Content or data quality" },
  { value: "missing_capability", label: "Missing capability" },
  { value: "performance", label: "Slow or unresponsive" },
  { value: "enterprise_interest", label: "Enterprise interest" },
  { value: "other", label: "Something else" },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

export const FEEDBACK_SEVERITIES = [
  { value: "low", label: "Low — cosmetic" },
  { value: "normal", label: "Normal — worth fixing" },
  { value: "high", label: "High — blocks a task" },
  { value: "blocking", label: "Blocking — cannot continue" },
] as const;

export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number]["value"];

export const FEEDBACK_STATUSES = ["new", "triaged", "in_progress", "resolved", "declined"] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** What each queue status means, in the words we show the person who reported it. */
export const FEEDBACK_STATUS_MEANING: Record<FeedbackStatus, { label: string; detail: string }> = {
  new: { label: "Received", detail: "In the queue, not yet reviewed by the team." },
  triaged: { label: "Triaged", detail: "Reviewed and categorised; queued for work." },
  in_progress: { label: "In progress", detail: "Being worked on right now." },
  resolved: { label: "Resolved", detail: "Shipped or answered. Reopen by sending a new report." },
  declined: { label: "Not planned", detail: "We decided not to act on this for now." },
};

/** Badge tone per status, so the same status reads the same way on every surface. */
export const FEEDBACK_STATUS_TONE: Record<
  FeedbackStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  new: "secondary",
  triaged: "outline",
  in_progress: "default",
  resolved: "default",
  declined: "outline",
};

/** Human label for a status string that may come from the database. */
export function feedbackStatusLabel(status: string): string {
  return FEEDBACK_STATUS_MEANING[status as FeedbackStatus]?.label ?? status;
}

export interface FeedbackSubmission {
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  message: string;
  contextRoute?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  evidenceUrl?: string | null;
  allowContact: boolean;
  contactEmail?: string | null;
}

export interface FeedbackRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: FeedbackStatus;
  category: FeedbackCategory | string;
  severity: FeedbackSeverity | string;
  contextRoute: string | null;
  entityType: string | null;
  entityId: string | null;
  message: string;
  evidenceUrl: string | null;
  allowContact: boolean;
  userId: string | null;
  workspaceId: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  isRealActivity: boolean;
}

export const FEEDBACK_MESSAGE_MIN = 5;
export const FEEDBACK_MESSAGE_MAX = 4000;

/** Support expectations shown next to every feedback surface. */
export const SUPPORT_EXPECTATIONS = [
  {
    title: "Blocking issues",
    detail: "Acknowledged within 1 business day during Founding Access.",
  },
  {
    title: "Bugs and data quality",
    detail: "Triaged weekly and reflected in the launch-learning review.",
  },
  {
    title: "Capability requests",
    detail: "Logged against the roadmap; we reply only if you opt in to contact.",
  },
] as const;

export const SUPPORT_EMAIL = "support@usecasesx.ai";
