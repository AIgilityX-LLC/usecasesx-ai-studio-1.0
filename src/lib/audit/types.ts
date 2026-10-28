/**
 * Canonical AuditEvent model for UseCasesX compliance / business audit.
 *
 * Persisted in `public.audit_events`. Application debugging logs live in
 * `src/lib/ops/control-plane/logging.ts` (stdout JSON) and must never be
 * written into this table.
 *
 * Column aliases (stable DB names → domain names):
 *   organization_id → tenant_id
 *   entity_type     → resource_type
 *   entity_id       → resource_id
 *   previous_value  → before_state
 *   new_value       → after_state
 *   created_at      → timestamp
 */

import type { AuditEventName, AuditSeverity } from "@/lib/telemetry/events";

export const AUDIT_ACTOR_TYPES = ["user", "system", "service", "support"] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export const AUDIT_RESULTS = ["success", "failure", "denied", "partial"] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

/** Request / network context captured when available (never stores secrets). */
export type AuditRequestContext = {
  ip?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  /** Opaque geo / region token when declared by the edge — not inferred PII. */
  region?: string | null;
};

/**
 * Immutable governance record. Once persisted, application roles cannot update
 * or delete rows (RLS + REVOKE + trigger).
 */
export type AuditEvent = {
  id: string;
  tenant_id: string | null;
  workspace_id: string | null;
  actor_id: string | null;
  actor_type: AuditActorType;
  event_type: AuditEventName | string;
  resource_type: string;
  resource_id: string | null;
  timestamp: string;
  request_id: string | null;
  session_id: string | null;
  /** IP and related request context when available. */
  context: AuditRequestContext | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  result: AuditResult;
  metadata: Record<string, unknown>;
  severity: AuditSeverity;
  source: string | null;
};

/** Input for appending one audit event (writers never set id/timestamp). */
export type AppendAuditEventInput = {
  eventType: AuditEventName | string;
  resourceType: string;
  resourceId?: string | null;
  tenantId?: string | null;
  workspaceId?: string | null;
  actorId?: string | null;
  actorType?: AuditActorType;
  requestId?: string | null;
  sessionId?: string | null;
  context?: AuditRequestContext | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  result?: AuditResult;
  metadata?: Record<string, unknown> | null;
  severity?: AuditSeverity;
  source?: string;
};

/** Authorized query filters for auditors and tenant administrators. */
export type AuditEventFilter = {
  tenantId?: string | null;
  workspaceId?: string | null;
  actorId?: string | null;
  actorType?: AuditActorType | null;
  eventType?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  result?: AuditResult | null;
  requestId?: string | null;
  from?: string | null;
  to?: string | null;
  /** Inclusive search over event_type + resource_type (server-applied). */
  q?: string | null;
  limit?: number;
  offset?: number;
};

export type AuditExportFormat = "json" | "csv";

export type AuditEventReceipt = {
  id: string | null;
  requestId: string;
  recordedAt: string | null;
  error: string | null;
};
