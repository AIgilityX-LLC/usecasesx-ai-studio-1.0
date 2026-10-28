/**
 * Public surface for the immutable application audit architecture.
 * Server-only modules (`*.server.ts`, `audit.functions.ts`) must be imported
 * directly from their paths — not re-exported here — to keep the client bundle clean.
 */

export { AuditService, AUDIT_REQUIRED_CATEGORIES, type AuditServiceApi } from "./service";
export {
  AUDIT_ACTOR_TYPES,
  AUDIT_RESULTS,
  type AppendAuditEventInput,
  type AuditActorType,
  type AuditEvent,
  type AuditEventFilter,
  type AuditEventReceipt,
  type AuditExportFormat,
  type AuditRequestContext,
  type AuditResult,
} from "./types";
export { rowToAuditEvent, buildAuditInsertRow, type AuditEventRow } from "./map";
export { serializeAuditExport } from "./export";
export {
  AUDIT_EVENT_SELECT,
  AUDIT_QUERY_DEFAULT_LIMIT,
  AUDIT_QUERY_MAX_LIMIT,
  AUDIT_EXPORT_MAX_LIMIT,
  clampAuditLimit,
  clampAuditOffset,
  normalizeAuditFilter,
} from "./query";
export { prepareAuditInsert, fromLegacyAuditInput } from "./write";
