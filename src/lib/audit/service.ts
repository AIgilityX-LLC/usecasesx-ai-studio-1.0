/**
 * AuditService — product facade for the immutable application audit stream.
 *
 * Domains should prefer this vocabulary over ad-hoc inserts into audit_events.
 * Debugging / ops logs remain in ops/control-plane — never mixed here.
 */

import { AUDIT_EVENTS, type AuditEventName } from "@/lib/telemetry/events";
import { serializeAuditExport } from "./export";
import {
  AUDIT_QUERY_DEFAULT_LIMIT,
  AUDIT_QUERY_MAX_LIMIT,
  AUDIT_EXPORT_MAX_LIMIT,
  clampAuditLimit,
  normalizeAuditFilter,
} from "./query";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_RESULTS,
  type AppendAuditEventInput,
  type AuditActorType,
  type AuditEvent,
  type AuditEventFilter,
  type AuditExportFormat,
  type AuditResult,
} from "./types";
import { fromLegacyAuditInput } from "./write";
import { rowToAuditEvent } from "./map";

export type AuditServiceApi = {
  events: typeof AUDIT_EVENTS;
  actorTypes: typeof AUDIT_ACTOR_TYPES;
  results: typeof AUDIT_RESULTS;
  queryDefaults: {
    defaultLimit: number;
    maxLimit: number;
    exportMaxLimit: number;
  };
  normalizeFilter: typeof normalizeAuditFilter;
  clampLimit: typeof clampAuditLimit;
  serializeExport: typeof serializeAuditExport;
  fromLegacyInput: typeof fromLegacyAuditInput;
  rowToEvent: typeof rowToAuditEvent;
  /** Security-sensitive categories that MUST emit an audit event. */
  requiredCategories: readonly string[];
  isKnownEvent: (name: string) => name is AuditEventName;
};

/** Categories of operations that are always audit-worthy. */
export const AUDIT_REQUIRED_CATEGORIES = [
  "authz",
  "membership",
  "role",
  "entitlement",
  "export",
  "admin",
  "ai.assist",
  "lifecycle",
  "gate",
  "evidence",
  "handoff",
] as const;

export const AuditService: AuditServiceApi = {
  events: AUDIT_EVENTS,
  actorTypes: AUDIT_ACTOR_TYPES,
  results: AUDIT_RESULTS,
  queryDefaults: {
    defaultLimit: AUDIT_QUERY_DEFAULT_LIMIT,
    maxLimit: AUDIT_QUERY_MAX_LIMIT,
    exportMaxLimit: AUDIT_EXPORT_MAX_LIMIT,
  },
  normalizeFilter: normalizeAuditFilter,
  clampLimit: clampAuditLimit,
  serializeExport: serializeAuditExport,
  fromLegacyInput: fromLegacyAuditInput,
  rowToEvent: rowToAuditEvent,
  requiredCategories: AUDIT_REQUIRED_CATEGORIES,
  isKnownEvent: (name: string): name is AuditEventName =>
    (Object.values(AUDIT_EVENTS) as string[]).includes(name),
};

export type {
  AppendAuditEventInput,
  AuditActorType,
  AuditEvent,
  AuditEventFilter,
  AuditExportFormat,
  AuditResult,
};
