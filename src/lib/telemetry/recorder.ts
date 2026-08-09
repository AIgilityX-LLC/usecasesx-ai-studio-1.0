/**
 * Browser-side telemetry recorder.
 *
 * Writes to the append-only `audit_events` and `product_events` tables through
 * the RLS-scoped browser client, so a caller can only ever write records
 * attributed to themselves. Every call is fire-and-forget: instrumentation must
 * never break a user journey.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  newRequestId,
  redactRecord,
  safeErrorShape,
  type AuditEventInput,
  type ProductEventInput,
  type TelemetryTenant,
} from "./events";

let tenant: TelemetryTenant = { organizationId: null, workspaceId: null };

/** Set once the workspace context resolves; used to scope every later event. */
export function setTelemetryTenant(next: TelemetryTenant): void {
  tenant = { organizationId: next.organizationId ?? null, workspaceId: next.workspaceId ?? null };
}

export function getTelemetryTenant(): TelemetryTenant {
  return tenant;
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Result of an audit append. `auditEventId` is the primary key of the row that
 * was written, so a surface can show the user a receipt that points at the
 * exact governance record — and a test can fetch that row back and compare.
 */
export type AuditEventReceipt = {
  requestId: string;
  auditEventId: string | null;
  recordedAt: string | null;
  error: string | null;
};

/** Append a governance audit record and return the written row's identity. */
export async function recordAuditEventDetailed(
  input: AuditEventInput,
): Promise<AuditEventReceipt> {
  const requestId = input.requestId ?? newRequestId();
  const miss = (error: string | null): AuditEventReceipt => ({
    requestId,
    auditEventId: null,
    recordedAt: null,
    error,
  });
  try {
    const actorId = await currentUserId();
    if (!actorId) return miss("not_signed_in"); // anonymous actions are not auditable subjects
    const { data, error } = await supabase
      .from("audit_events")
      .insert({
        actor_id: actorId,
        entity_type: input.entity.type,
        entity_id: input.entity.id ?? null,
        event_type: input.event,
        previous_value: input.previous ? (redactRecord(input.previous) as never) : null,
        new_value: input.next ? (redactRecord(input.next) as never) : null,
        organization_id: tenant.organizationId,
        workspace_id: tenant.workspaceId,
        request_id: requestId,
        severity: input.severity ?? "info",
        source: input.source ?? "web",
      } as never)
      .select("id, created_at")
      .maybeSingle();
    if (error) {
      console.warn("[telemetry] audit rejected", input.event, error.message);
      return miss(error.message);
    }
    const row = data as { id?: string; created_at?: string } | null;
    return {
      requestId,
      auditEventId: row?.id ?? null,
      recordedAt: row?.created_at ?? null,
      error: null,
    };
  } catch (error) {
    const shape = safeErrorShape(error);
    console.warn("[telemetry] audit failed", shape.message);
    return miss(shape.message);
  }
}

/** Append a governance audit record. Returns the correlation id used. */
export async function recordAuditEvent(input: AuditEventInput): Promise<string> {
  return (await recordAuditEventDetailed(input)).requestId;
}


/** Append a product / activation event. */
export async function recordProductEvent(input: ProductEventInput): Promise<string> {
  const requestId = input.requestId ?? newRequestId();
  try {
    const userId = await currentUserId();
    if (!userId) return requestId;
    const { error } = await supabase.from("product_events").insert({
      user_id: userId,
      organization_id: tenant.organizationId,
      workspace_id: tenant.workspaceId,
      event_name: input.event,
      entity_type: input.entity?.type ?? null,
      entity_id: input.entity?.id ?? null,
      request_id: requestId,
      properties: redactRecord(input.properties) as never,
    } as never);
    if (error) console.warn("[telemetry] product event rejected", input.event, error.message);
  } catch (error) {
    console.warn("[telemetry] product event failed", safeErrorShape(error).message);
  }
  return requestId;
}

/**
 * Privacy-safe failure log for launch troubleshooting. Emits to the console
 * with a correlation id and redacted context — no secrets, prompts or PII.
 */
export function logAppError(
  scope: string,
  error: unknown,
  context: Record<string, unknown> = {},
  requestId?: string,
): string {
  const id = requestId ?? newRequestId();
  const shape = safeErrorShape(error);
  console.error(`[usecasex:${scope}] ${shape.name}: ${shape.message}`, {
    requestId: id,
    workspaceId: tenant.workspaceId,
    ...redactRecord(context),
  });
  return id;
}
