/**
 * Pure mapping between DB `audit_events` rows and the domain AuditEvent shape.
 */

import type { AuditSeverity } from "@/lib/telemetry/events";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_RESULTS,
  type AppendAuditEventInput,
  type AuditActorType,
  type AuditEvent,
  type AuditRequestContext,
  type AuditResult,
} from "./types";

export type AuditEventRow = {
  id: string;
  organization_id?: string | null;
  workspace_id?: string | null;
  actor_id?: string | null;
  actor_type?: string | null;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
  request_id?: string | null;
  session_id?: string | null;
  context?: Record<string, unknown> | null;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  result?: string | null;
  metadata?: Record<string, unknown> | null;
  severity?: string | null;
  source?: string | null;
};

function asActorType(value: unknown): AuditActorType {
  if (typeof value === "string" && (AUDIT_ACTOR_TYPES as readonly string[]).includes(value)) {
    return value as AuditActorType;
  }
  return "user";
}

function asResult(value: unknown): AuditResult {
  if (typeof value === "string" && (AUDIT_RESULTS as readonly string[]).includes(value)) {
    return value as AuditResult;
  }
  return "success";
}

function asContext(value: unknown): AuditRequestContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  return {
    ip: typeof raw.ip === "string" ? raw.ip : null,
    userAgent: typeof raw.userAgent === "string" ? raw.userAgent : null,
    path: typeof raw.path === "string" ? raw.path : null,
    method: typeof raw.method === "string" ? raw.method : null,
    region: typeof raw.region === "string" ? raw.region : null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Map a persisted row into the canonical AuditEvent DTO. */
export function rowToAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    tenant_id: row.organization_id ?? null,
    workspace_id: row.workspace_id ?? null,
    actor_id: row.actor_id ?? null,
    actor_type: asActorType(row.actor_type),
    event_type: row.event_type,
    resource_type: row.entity_type,
    resource_id: row.entity_id ?? null,
    timestamp: row.created_at,
    request_id: row.request_id ?? null,
    session_id: row.session_id ?? null,
    context: asContext(row.context),
    before_state: asRecord(row.previous_value),
    after_state: asRecord(row.new_value),
    result: asResult(row.result),
    metadata: asRecord(row.metadata) ?? {},
    severity: (row.severity as AuditSeverity | null) ?? "info",
    source: row.source ?? null,
  };
}

/**
 * Build the insert payload for `audit_events`. Uses stable DB column names.
 * Callers must redact before/after/metadata/context before calling.
 */
export function buildAuditInsertRow(
  input: AppendAuditEventInput & { actorId: string; requestId: string },
): Record<string, unknown> {
  return {
    actor_id: input.actorId,
    actor_type: input.actorType ?? "user",
    entity_type: input.resourceType,
    entity_id: input.resourceId ?? null,
    event_type: input.eventType,
    previous_value: input.beforeState ?? null,
    new_value: input.afterState ?? null,
    organization_id: input.tenantId ?? null,
    workspace_id: input.workspaceId ?? null,
    request_id: input.requestId,
    session_id: input.sessionId ?? null,
    context: input.context ?? null,
    result: input.result ?? "success",
    metadata: input.metadata ?? {},
    severity: input.severity ?? "info",
    source: input.source ?? "server",
  };
}
