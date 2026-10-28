/**
 * Pure builders for append payloads. Redaction happens here so every writer
 * path (server fn, legacy telemetry bridge) shares one privacy gate.
 */

import { newRequestId, redactRecord, type AuditEventInput } from "@/lib/telemetry/events";
import { buildAuditInsertRow } from "./map";
import type { AppendAuditEventInput, AuditRequestContext } from "./types";

function redactContext(ctx: AuditRequestContext | null | undefined): AuditRequestContext | null {
  if (!ctx) return null;
  const cleaned = redactRecord({
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
    path: ctx.path ?? null,
    method: ctx.method ?? null,
    region: ctx.region ?? null,
  }) as AuditRequestContext;
  return cleaned;
}

/** Normalize + redact an append input into a DB insert row + request id. */
export function prepareAuditInsert(
  input: AppendAuditEventInput,
  defaults: { actorId: string; requestId?: string | null; source?: string },
): { requestId: string; row: Record<string, unknown> } {
  const requestId = input.requestId ?? defaults.requestId ?? newRequestId();
  const row = buildAuditInsertRow({
    ...input,
    actorId: input.actorId ?? defaults.actorId,
    actorType: input.actorType ?? "user",
    requestId,
    beforeState: input.beforeState ? redactRecord(input.beforeState) : null,
    afterState: input.afterState ? redactRecord(input.afterState) : null,
    metadata: input.metadata ? redactRecord(input.metadata) : {},
    context: redactContext(input.context),
    source: input.source ?? defaults.source ?? "server",
    result: input.result ?? "success",
  });
  return { requestId, row };
}

/** Bridge legacy telemetry `AuditEventInput` into the canonical append shape. */
export function fromLegacyAuditInput(input: AuditEventInput): AppendAuditEventInput {
  return {
    eventType: input.event,
    resourceType: input.entity.type,
    resourceId: input.entity.id ?? null,
    tenantId: input.organizationId ?? null,
    workspaceId: input.workspaceId ?? null,
    beforeState: input.previous ?? null,
    afterState: input.next ?? null,
    requestId: input.requestId ?? null,
    severity: input.severity,
    source: input.source,
    result: input.result ?? "success",
    actorType: input.actorType ?? "user",
    sessionId: input.sessionId ?? null,
    metadata: input.metadata ?? {},
    context: input.context ?? null,
  };
}
