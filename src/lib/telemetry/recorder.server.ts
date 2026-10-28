/**
 * Server-side telemetry recorder.
 *
 * Audit writes go through the centralized `src/lib/audit` append path.
 * Product / activation events stay on `product_events` — never mixed with
 * compliance audit rows. Debugging logs use ops/control-plane structuredLog.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  newRequestId,
  redactRecord,
  safeErrorShape,
  type AuditEventInput,
  type ProductEventInput,
  type TelemetryTenant,
} from "./events";

export type ServerTelemetryContext = {
  // Matches the middleware-provided client shape used across the server layer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>;
  userId: string;
  tenant?: TelemetryTenant;
  requestId?: string | null;
  sessionId?: string | null;
};

export async function writeAuditEvent(
  ctx: ServerTelemetryContext,
  input: AuditEventInput,
): Promise<string> {
  const { appendAuditEventFromLegacy } = await import("@/lib/audit/write.server");
  return appendAuditEventFromLegacy(
    {
      supabase: ctx.supabase,
      userId: ctx.userId,
      tenant: ctx.tenant,
      requestId: ctx.requestId,
      sessionId: ctx.sessionId,
    },
    input,
  );
}

export async function writeProductEvent(
  ctx: ServerTelemetryContext,
  input: ProductEventInput,
): Promise<string> {
  const requestId = input.requestId ?? ctx.requestId ?? newRequestId();
  const { error } = await ctx.supabase.from("product_events").insert({
    user_id: ctx.userId,
    organization_id: ctx.tenant?.organizationId ?? null,
    workspace_id: ctx.tenant?.workspaceId ?? null,
    event_name: input.event,
    entity_type: input.entity?.type ?? null,
    entity_id: input.entity?.id ?? null,
    request_id: requestId,
    properties: redactRecord(input.properties),
  });
  if (error)
    console.warn("[telemetry] product event rejected", { event: input.event, code: error.code });
  return requestId;
}

/** Privacy-safe server failure log carrying the correlation id. */
export function logServerError(
  scope: string,
  error: unknown,
  context: Record<string, unknown> = {},
  requestId?: string,
): string {
  const id = requestId ?? newRequestId();
  const shape = safeErrorShape(error);
  console.error(`[usecasex:${scope}] ${shape.name}: ${shape.message}`, {
    requestId: id,
    ...redactRecord(context),
  });
  return id;
}
