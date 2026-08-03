/**
 * Client-safe telemetry vocabulary.
 *
 * Two distinct streams:
 *  • **Audit events** (`audit_events`) — governance record of *who changed what*.
 *    Append-only; ordinary users can never edit or delete them.
 *  • **Product events** (`product_events`) — launch-learning / activation funnel.
 *    Counted by date and workspace; never used as a security record.
 *
 * This module contains names, types and pure helpers only — no transport, no
 * secrets, no database client. Safe to import from anywhere.
 */

/* ------------------------------------------------------------ audit model */

export const AUDIT_EVENTS = {
  // entity lifecycle
  entityCreated: "entity.created",
  entityUpdated: "entity.updated",
  entityArchived: "entity.archived",
  entityDeleted: "entity.deleted",
  // membership & access
  memberInvited: "membership.invited",
  memberAdded: "membership.added",
  memberRemoved: "membership.removed",
  roleChanged: "role.changed",
  entitlementChanged: "entitlement.changed",
  // outputs
  exportGenerated: "export.generated",
  reportGenerated: "report.generated",
  // ai
  aiAssistUsed: "ai.assist.used",
  aiAssistDenied: "ai.assist.denied",
  // admin
  adminAction: "admin.action",
} as const;

export type AuditEventName = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];

export const AUDIT_SEVERITIES = ["info", "notice", "warning", "critical"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export type AuditEntity = { type: string; id?: string | null };

export type AuditEventInput = {
  event: AuditEventName | string;
  entity: AuditEntity;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  severity?: AuditSeverity;
  source?: string;
  requestId?: string | null;
};

/* --------------------------------------------------------- product events */

export const PRODUCT_EVENTS = {
  registered: "user.registered",
  onboardingStarted: "onboarding.started",
  onboardingCompleted: "onboarding.completed",
  onboardingSkipped: "onboarding.skipped",
  tourCompleted: "tour.completed",
  workspaceCreated: "workspace.created",

  opportunityCaptured: "opportunity.captured",
  opportunityUpdated: "opportunity.updated",
  opportunityStatusChanged: "opportunity.status_changed",
  opportunityAiAssisted: "opportunity.ai_assisted",
  opportunityConverted: "opportunity.converted",
  useCaseCompleted: "use_case.completed",
  useCaseScored: "use_case.scored",
  portfolioCreated: "portfolio.created",
  portfolioItemAdded: "portfolio.item_added",
  portfolioItemChanged: "portfolio.item_changed",
  portfolioItemRemoved: "portfolio.item_removed",
  portfolioReviewed: "portfolio.reviewed",
  reportExported: "report.exported",
  workshopStarted: "workshop.started",
  advisoryRequested: "advisory.requested",

  // journey funnel (dashboard next-action surface)
  journeyStageViewed: "journey.stage_viewed",
  journeyActionTaken: "journey.action_taken",
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

/** Ordered activation funnel used by the internal launch-learning view. */
export const ACTIVATION_FUNNEL: ProductEventName[] = [
  PRODUCT_EVENTS.registered,
  PRODUCT_EVENTS.workspaceCreated,
  PRODUCT_EVENTS.opportunityCaptured,
  PRODUCT_EVENTS.useCaseCompleted,
  PRODUCT_EVENTS.useCaseScored,
  PRODUCT_EVENTS.portfolioCreated,
  PRODUCT_EVENTS.reportExported,
];

export type ProductEventInput = {
  event: ProductEventName | string;
  entity?: AuditEntity | null;
  properties?: Record<string, unknown>;
  requestId?: string | null;
};

/* ---------------------------------------------------------- tenancy scope */

export type TelemetryTenant = {
  organizationId: string | null;
  workspaceId: string | null;
};

/* ------------------------------------------------------------- correlation */

/** Correlation id for a single user action across client + server records. */
export function newRequestId(): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* --------------------------------------------------------------- privacy */

/**
 * Keys that must never reach an event payload or an error log.
 * Matching is case-insensitive and substring-based so `openai_api_key`,
 * `Authorization` and `user_prompt` are all caught.
 */
const SENSITIVE_KEY_PATTERNS = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "prompt",
  "email",
  "phone",
  "address",
  "service_role",
];

const MAX_STRING = 500;
const MAX_DEPTH = 4;

export function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => k.includes(pattern));
}

/**
 * Recursively strips sensitive keys, truncates long strings and drops values
 * that cannot be serialised. Used on every event payload and error log so a
 * caller cannot accidentally persist a secret or a full AI prompt.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null) return null;
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…[truncated]` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= MAX_DEPTH) return "[depth-limited]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? "[redacted]" : redact(raw, depth + 1);
    }
    return out;
  }
  return undefined;
}

export function redactRecord(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!input) return {};
  return (redact(input) as Record<string, unknown>) ?? {};
}

/** Privacy-safe shape for a caught error: message + kind, never the payload. */
export function safeErrorShape(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: String(redact(error.message)) };
  }
  return { name: "UnknownError", message: String(redact(String(error))) };
}
