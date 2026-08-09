/**
 * Lightweight Pro collaboration — shared (client-safe) domain model.
 *
 * Scope is deliberately small: invitations, review notes, assignments and a
 * simple review status. This is NOT an Enterprise workflow engine and none of
 * the statuses represent regulatory approval.
 */

import { z } from "zod";
import type { Edition } from "@/lib/authz/editions";

/* ------------------------------------------------------------- entities */

export const COLLAB_ENTITY_TYPES = ["opportunity", "use_case", "portfolio"] as const;
export type CollabEntityType = (typeof COLLAB_ENTITY_TYPES)[number];

export const ENTITY_LABELS: Record<CollabEntityType, string> = {
  opportunity: "Opportunity",
  use_case: "Use case",
  portfolio: "Portfolio",
};

/* --------------------------------------------------------- review status */

export const REVIEW_STATUSES = [
  "draft",
  "ready_for_review",
  "reviewed",
  "approved_for_portfolio",
  "deferred",
  "archived",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_META: Record<
  ReviewStatus,
  { label: string; description: string; tone: "neutral" | "info" | "positive" | "warning" }
> = {
  draft: {
    label: "Draft",
    description: "Still being shaped by the author.",
    tone: "neutral",
  },
  ready_for_review: {
    label: "Ready for review",
    description: "The author has asked a colleague to look at it.",
    tone: "info",
  },
  reviewed: {
    label: "Reviewed",
    description: "A colleague has read it and left notes.",
    tone: "info",
  },
  approved_for_portfolio: {
    label: "Approved for portfolio",
    description: "Agreed internally as ready to sit in the portfolio.",
    tone: "positive",
  },
  deferred: {
    label: "Deferred",
    description: "Parked for now with the reason kept in the notes.",
    tone: "warning",
  },
  archived: {
    label: "Archived",
    description: "No longer active; kept for the record.",
    tone: "neutral",
  },
};

/* ---------------------------------------------------------- assignments */

export const ASSIGNMENT_ROLES = ["owner", "contributor"] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

export const ASSIGNMENT_ROLE_LABELS: Record<AssignmentRole, string> = {
  owner: "Owner",
  contributor: "Contributor",
};

/* ---------------------------------------------------------- invitations */

export const INVITE_ROLES = ["admin", "contributor", "facilitator", "viewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export const INVITE_ROLE_LABELS: Record<InviteRole, string> = {
  admin: "Admin — manages members and settings",
  contributor: "Contributor — creates and edits work",
  facilitator: "Facilitator — runs workshops",
  viewer: "Viewer — read only",
};

/**
 * Fair-use team size per edition. Pro Founding Access is complimentary and
 * capped; Enterprise seat counts are agreed per engagement.
 */
export const TEAM_SEAT_LIMITS: Record<Edition, number | null> = {
  lite: 1,
  pro: 8,
  enterprise: null,
};

export function seatLimitFor(edition: Edition): number | null {
  return TEAM_SEAT_LIMITS[edition] ?? null;
}

export type SeatUsage = {
  edition: Edition;
  limit: number | null;
  used: number;
  pending: number;
  remaining: number | null;
  atLimit: boolean;
};

export function seatUsage(edition: Edition, members: number, pending: number): SeatUsage {
  const limit = seatLimitFor(edition);
  const used = members + pending;
  return {
    edition,
    limit,
    used: members,
    pending,
    remaining: limit == null ? null : Math.max(0, limit - used),
    atLimit: limit != null && used >= limit,
  };
}

/* -------------------------------------------------------------- schemas */

export const entityRefSchema = z.object({
  entityType: z.enum(COLLAB_ENTITY_TYPES),
  entityId: z.string().uuid(),
});

export const commentInputSchema = entityRefSchema.extend({
  body: z.string().trim().min(1, "Write a note first.").max(4000),
});

export const commentResolveSchema = z.object({
  id: z.string().uuid(),
  resolved: z.boolean(),
});

export const assignmentInputSchema = entityRefSchema.extend({
  userId: z.string().uuid(),
  assignmentRole: z.enum(ASSIGNMENT_ROLES),
});

export const reviewStatusInputSchema = entityRefSchema.extend({
  status: z.enum(REVIEW_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export const inviteInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
  role: z.enum(INVITE_ROLES).default("contributor"),
  message: z.string().trim().max(500).optional(),
  expiresInDays: z.number().int().min(1).max(30).default(14),
});

export type CollabComment = {
  id: string;
  entityType: CollabEntityType;
  entityId: string;
  body: string;
  authorId: string;
  authorName: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollabAssignment = {
  id: string;
  userId: string;
  displayName: string;
  assignmentRole: AssignmentRole;
  assignedBy: string;
  createdAt: string;
};

export type CollabReviewState = {
  status: ReviewStatus;
  note: string | null;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
};

export type ActivityEntry = {
  id: string;
  event: string;
  actorId: string | null;
  actorName: string;
  at: string;
  summary: string;
};

/** Timeline filter buckets. Keep these stable — the UI and tests key off them. */
export const ACTIVITY_CATEGORIES = [
  "all",
  "notes",
  "review",
  "people",
  "exports",
  "other",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  all: "All activity",
  notes: "Review notes",
  review: "Review states",
  people: "People",
  exports: "Reports & exports",
  other: "Other changes",
};

/** Buckets one audit event type into a timeline filter category. */
export function activityCategory(event: string): Exclude<ActivityCategory, "all"> {
  if (event.startsWith("collab.comment.")) return "notes";
  if (event.startsWith("collab.review_status.")) return "review";
  if (event.startsWith("collab.assignment.") || event.startsWith("membership.")) return "people";
  if (event === "export.generated" || event === "report.generated") return "exports";
  return "other";
}

/** Number of timeline entries revealed per page. */
export const ACTIVITY_PAGE_SIZE = 10;

export type WorkspaceMemberRow = {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
  joinedAt: string | null;
  isSelf: boolean;
};

export type WorkspaceInviteRow = {
  id: string;
  email: string | null;
  role: InviteRole;
  token: string;
  expiresAt: string;
  useCount: number;
  maxUses: number;
  revokedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

/** Human summary for an audit row shown in the activity timeline. */
export function summariseAuditEvent(event: string, next: Record<string, unknown> | null): string {
  const detail = (key: string) => {
    const value = next?.[key];
    return typeof value === "string" ? value : null;
  };
  switch (event) {
    case "membership.invited":
      return `Invited ${detail("email") ?? "a teammate"} as ${detail("role") ?? "member"}`;
    case "membership.added":
      return `Joined the workspace as ${detail("role") ?? "member"}`;
    case "membership.removed":
      return "Removed a member from the workspace";
    case "role.changed":
      return `Changed a member role to ${detail("role") ?? "another role"}`;
    case "collab.comment.added":
      return "Added a review note";
    case "collab.comment.resolved":
      return "Resolved a review note";
    case "collab.comment.reopened":
      return "Reopened a review note";
    case "collab.assignment.added":
      return `Assigned ${detail("assignment_role") ?? "a collaborator"}`;
    case "collab.assignment.removed":
      return "Removed an assignment";
    case "collab.review_status.changed": {
      const status = detail("status") as ReviewStatus | null;
      return `Moved to ${status ? REVIEW_STATUS_META[status].label : "a new review state"}`;
    }
    case "export.generated": {
      const format = detail("format");
      const outcome = detail("outcome");
      const label = format ? format.toUpperCase().replace("_", " ") : "an";
      if (outcome === "denied") return `Export blocked — ${label} export was denied`;
      return `Exported ${label}${detail("reportType") ? ` — ${detail("reportType")}` : ""}`;
    }
    case "report.generated":
      return `Generated ${detail("reportType") ?? "a report"}`;
    case "entity.created":
      return "Created this item";
    case "entity.updated":
      return "Updated this item";
    case "entity.archived":
      return "Archived this item";
    default:
      return event.replace(/[._]/g, " ");
  }
}
