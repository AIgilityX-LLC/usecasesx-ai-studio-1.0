/**
 * Pure helpers for audit query limits and filter normalisation.
 */

import { AUDIT_ACTOR_TYPES, AUDIT_RESULTS, type AuditEventFilter } from "./types";

export const AUDIT_QUERY_DEFAULT_LIMIT = 100;
export const AUDIT_QUERY_MAX_LIMIT = 500;
export const AUDIT_EXPORT_MAX_LIMIT = 5_000;

export function clampAuditLimit(limit: number | undefined, max = AUDIT_QUERY_MAX_LIMIT): number {
  const n =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.trunc(limit)
      : AUDIT_QUERY_DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), max);
}

export function clampAuditOffset(offset: number | undefined): number {
  const n = typeof offset === "number" && Number.isFinite(offset) ? Math.trunc(offset) : 0;
  return Math.max(n, 0);
}

/** Drop empty strings / invalid enums so PostgREST filters stay precise. */
export function normalizeAuditFilter(input: AuditEventFilter): AuditEventFilter {
  const clean = (v: string | null | undefined): string | null => {
    if (v == null) return null;
    const t = v.trim();
    return t.length ? t : null;
  };

  const actorType = clean(input.actorType ?? null);
  const result = clean(input.result ?? null);

  return {
    tenantId: clean(input.tenantId),
    workspaceId: clean(input.workspaceId),
    actorId: clean(input.actorId),
    actorType:
      actorType && (AUDIT_ACTOR_TYPES as readonly string[]).includes(actorType)
        ? (actorType as AuditEventFilter["actorType"])
        : null,
    eventType: clean(input.eventType),
    resourceType: clean(input.resourceType),
    resourceId: clean(input.resourceId),
    result:
      result && (AUDIT_RESULTS as readonly string[]).includes(result)
        ? (result as AuditEventFilter["result"])
        : null,
    requestId: clean(input.requestId),
    from: clean(input.from),
    to: clean(input.to),
    q: clean(input.q),
    limit: input.limit,
    offset: input.offset,
  };
}

/** Columns selected for auditor / admin reads (no secrets by construction). */
export const AUDIT_EVENT_SELECT =
  "id, organization_id, workspace_id, actor_id, actor_type, event_type, entity_type, entity_id, created_at, request_id, session_id, context, previous_value, new_value, result, metadata, severity, source";
