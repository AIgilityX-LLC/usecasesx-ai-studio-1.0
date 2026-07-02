// Shared constants/helpers for user use-case submissions.
export const SUBMISSION_STATUSES = ["draft", "submitted", "in_review", "approved", "rejected"] as const;
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
    case "approved": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "rejected": return "bg-destructive/15 text-destructive";
    case "in_review": return "bg-primary/15 text-primary";
    case "submitted": return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    default: return "bg-muted text-muted-foreground";
  }
}

export function statusLabel(s: SubmissionStatus): string {
  return s === "in_review" ? "In review" : s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseList(raw: string): string[] {
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}
