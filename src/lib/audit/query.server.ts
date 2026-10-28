/**
 * Server-side audit query against `audit_events` (RLS + explicit reader gate).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { rowToAuditEvent, type AuditEventRow } from "./map";
import {
  AUDIT_EVENT_SELECT,
  AUDIT_EXPORT_MAX_LIMIT,
  AUDIT_QUERY_MAX_LIMIT,
  clampAuditLimit,
  clampAuditOffset,
  normalizeAuditFilter,
} from "./query";
import type { AuditEvent, AuditEventFilter } from "./types";
import type { AuditReaderScope } from "./access.server";

function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filter: AuditEventFilter,
  scope: AuditReaderScope,
) {
  const tenantId = scope.isPlatformAuditor ? (filter.tenantId ?? null) : scope.tenantId;
  if (!scope.isPlatformAuditor && !tenantId) {
    throw new Error("Forbidden: tenant scope required.");
  }
  if (tenantId) query = query.eq("organization_id", tenantId);
  if (filter.workspaceId) query = query.eq("workspace_id", filter.workspaceId);
  if (filter.actorId) query = query.eq("actor_id", filter.actorId);
  if (filter.actorType) query = query.eq("actor_type", filter.actorType);
  if (filter.eventType) query = query.eq("event_type", filter.eventType);
  if (filter.resourceType) query = query.eq("entity_type", filter.resourceType);
  if (filter.resourceId) query = query.eq("entity_id", filter.resourceId);
  if (filter.result) query = query.eq("result", filter.result);
  if (filter.requestId) query = query.eq("request_id", filter.requestId);
  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lte("created_at", filter.to);
  if (filter.q) {
    // PostgREST or-filter: event_type / entity_type contains q
    const term = filter.q.replace(/[%(),]/g, "");
    query = query.or(`event_type.ilike.%${term}%,entity_type.ilike.%${term}%`);
  }
  return query;
}

export async function queryAuditEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  scope: AuditReaderScope,
  rawFilter: AuditEventFilter,
  opts?: { forExport?: boolean },
): Promise<{ events: AuditEvent[]; error: string | null }> {
  const filter = normalizeAuditFilter(rawFilter);
  const max = opts?.forExport ? AUDIT_EXPORT_MAX_LIMIT : AUDIT_QUERY_MAX_LIMIT;
  const limit = clampAuditLimit(filter.limit, max);
  const offset = clampAuditOffset(filter.offset);

  let query = supabase
    .from("audit_events")
    .select(AUDIT_EVENT_SELECT)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  query = applyFilters(query, filter, scope);

  const { data, error } = await query;
  if (error) {
    console.error("[audit] query failed", { code: error.code });
    return { events: [], error: "Audit history is unavailable." };
  }
  const rows = (data ?? []) as unknown as AuditEventRow[];
  return { events: rows.map(rowToAuditEvent), error: null };
}
