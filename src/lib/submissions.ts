// Shared constants/helpers for user use-case submissions.
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export type Submission = {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  business_problem: string | null;
  ai_solution: string | null;
  industry: string | null;
  sector: string | null;
  tags: string[];
  sources: string[];
  status: SubmissionStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export function statusBadgeClass(s: SubmissionStatus): string {
  switch (s) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "rejected":
      return "bg-destructive/15 text-destructive";
    case "in_review":
      return "bg-primary/15 text-primary";
    case "submitted":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function statusLabel(s: SubmissionStatus): string {
  return s === "in_review" ? "In review" : s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Roles allowed to review and publish community submissions. */
export const REVIEW_ROLES = [
  "admin",
  "moderator",
  "super_admin",
  "usecasex_admin",
  "content_manager",
  "reviewer",
] as const satisfies readonly Database["public"]["Enums"]["app_role"][];

/**
 * Segregation of duties: the authenticated actor must not decide on their own
 * record (submission, milestone, gate, etc.). Call before any status update.
 */
export const SELF_REVIEW_DENIED =
  "Segregation of duties: you cannot review or decide on your own submission.";

export function assertNotSelfReview(
  subjectUserId: string | null | undefined,
  reviewerId: string,
  message: string = SELF_REVIEW_DENIED,
): void {
  if (subjectUserId && subjectUserId === reviewerId) {
    throw new Error(message);
  }
}

/** Validation contract shared by the submit form and the server function. */
export const SubmissionInput = z.object({
  title: z.string().trim().min(8, "Give the use case a descriptive title.").max(200),
  summary: z
    .string()
    .trim()
    .min(30, "Write at least a sentence or two summarising the use case.")
    .max(1000),
  businessProblem: z
    .string()
    .trim()
    .min(30, "Describe the business or public-service problem.")
    .max(4000),
  aiSolution: z.string().trim().min(30, "Describe the AI solution approach.").max(4000),
  industry: z.string().trim().max(120).optional(),
  sector: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(12),
  sources: z.array(z.string().trim().min(1).max(500)).max(12),
  status: z.enum(["draft", "submitted"]),
});
export type SubmissionInputValue = z.infer<typeof SubmissionInput>;

export const SubmissionIdInput = z.object({ id: z.string().uuid() });

export const ReviewInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["submitted", "in_review", "approved", "rejected"]),
  reviewNotes: z.string().trim().max(2000).nullable(),
  /** Approving with `publish` also creates the public repository record. */
  publish: z.boolean().optional().default(true),
});

/** URL-safe slug for a published repository record. */
export function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "use-case"
  );
}
