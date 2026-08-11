/**
 * Client-safe vocabulary for data rights (export / deletion) and consent.
 *
 * Labels, statuses and pure helpers only — no transport, no database client,
 * no secrets. Safe to import from any component.
 */

/* ------------------------------------------------------------------ export */

export const EXPORT_STATUSES = ["pending", "processing", "ready", "failed", "expired"] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

export const EXPORT_STATUS_MEANING: Record<ExportStatus, { label: string; detail: string }> = {
  pending: { label: "Queued", detail: "Your request is in the queue." },
  processing: { label: "Collecting", detail: "We are gathering your records." },
  ready: { label: "Ready", detail: "Your copy is ready to download." },
  failed: { label: "Failed", detail: "Something went wrong. Request a new copy." },
  expired: { label: "Expired", detail: "The download window closed. Request a new copy." },
};

/** Data families included in a personal export, in the order we collect them. */
export const EXPORT_SCOPE = [
  { key: "profile", label: "Profile & account details" },
  { key: "consents", label: "Cookie and analytics choices" },
  { key: "opportunities", label: "Opportunities you captured" },
  { key: "use_cases", label: "Use cases you submitted" },
  { key: "portfolios", label: "Portfolios you created" },
  { key: "saved", label: "Saved use cases" },
  { key: "feedback", label: "Feature requests and bug reports" },
] as const;

export type ExportScopeKey = (typeof EXPORT_SCOPE)[number]["key"];

export const DEFAULT_EXPORT_SCOPE: ExportScopeKey[] = EXPORT_SCOPE.map((s) => s.key);

/** Hard ceiling so one request can never assemble an unbounded payload. */
export const EXPORT_MAX_ROWS_PER_TABLE = 2000;
export const EXPORT_DOWNLOAD_DAYS = 7;

export type ExportRequestRecord = {
  id: string;
  status: ExportStatus;
  progress: number;
  scope: string[];
  rowCounts: Record<string, number>;
  payloadBytes: number;
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string;
};

/* ---------------------------------------------------------------- deletion */

export const DELETION_STATUSES = [
  "scheduled",
  "cancelled",
  "processing",
  "completed",
  "failed",
] as const;
export type DeletionStatus = (typeof DELETION_STATUSES)[number];

export const DELETION_STATUS_MEANING: Record<DeletionStatus, { label: string; detail: string }> = {
  scheduled: {
    label: "Scheduled",
    detail: "Your account is scheduled for deletion. You can cancel until the effective date.",
  },
  cancelled: { label: "Cancelled", detail: "You cancelled this request. Nothing was deleted." },
  processing: {
    label: "Processing",
    detail: "Deletion has started and can no longer be cancelled.",
  },
  completed: { label: "Completed", detail: "Your account and its content were deleted." },
  failed: { label: "Failed", detail: "Deletion did not complete. Contact support." },
};

export const DELETION_GRACE_DAYS = 30;

/** Plainly what goes, and what has to stay, when an account is deleted. */
export const DELETION_EFFECTS = {
  deleted: [
    "Your profile, avatar and account login",
    "Opportunities, use case submissions and drafts you own",
    "Portfolios, saved use cases and collections you created",
    "Your feature requests, bug reports and consent choices",
  ],
  retained: [
    "Use cases already approved into the shared repository (author attribution is removed)",
    "Governance audit records of who changed what, kept as a legal record",
    "Aggregate, non-identifying usage counts",
  ],
} as const;

export type DeletionRequestRecord = {
  id: string;
  status: DeletionStatus;
  reason: string | null;
  graceDays: number;
  requestedAt: string;
  effectiveAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
};

export function isCancellable(record: DeletionRequestRecord | null): boolean {
  return record?.status === "scheduled";
}

export function daysUntil(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
}

/* ----------------------------------------------------------------- consent */

export const CONSENT_POLICY_VERSION = "v1";
export const CONSENT_STORAGE_KEY = "ucx.consent.v1";

export const CONSENT_CATEGORIES = [
  {
    key: "essential",
    label: "Strictly necessary",
    description:
      "Sign-in, security, workspace selection and saving your work. Always on — the product cannot run without them.",
    required: true,
  },
  {
    key: "analytics",
    label: "Product analytics",
    description:
      "Counts of which screens and actions are used, so we can fix what is confusing. Never used to profile you.",
    required: false,
  },
  {
    key: "marketing",
    label: "Marketing & outreach",
    description:
      "Lets us link your interest signals to follow-up about editions, workshops and launch updates.",
    required: false,
  },
] as const;

export type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  policyVersion: string;
  decidedAt: string;
};

export const CONSENT_ACCEPT_ALL: Omit<ConsentChoice, "decidedAt"> = {
  analytics: true,
  marketing: true,
  policyVersion: CONSENT_POLICY_VERSION,
};

export const CONSENT_ESSENTIAL_ONLY: Omit<ConsentChoice, "decidedAt"> = {
  analytics: false,
  marketing: false,
  policyVersion: CONSENT_POLICY_VERSION,
};

/** A stored choice only counts while it matches the current policy version. */
export function isCurrentConsent(choice: ConsentChoice | null): boolean {
  return !!choice && choice.policyVersion === CONSENT_POLICY_VERSION;
}

export function readStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    if (typeof parsed?.analytics !== "boolean" || typeof parsed?.marketing !== "boolean") {
      return null;
    }
    return {
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      policyVersion: String(parsed.policyVersion ?? ""),
      decidedAt: String(parsed.decidedAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function writeStoredConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice));
  } catch {
    /* storage may be unavailable (private mode) — consent then re-asks */
  }
}

/* ------------------------------------------------------------------ shared */

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
