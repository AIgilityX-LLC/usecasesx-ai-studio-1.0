/**
 * Server-side telemetry recorder.
 *
 * Used by server functions and the AI boundary. Writes through the caller's
 * RLS-scoped Supabase client so records stay attributable and append-only.
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
  supabase: SupabaseClient<any, any, any>;
  userId: string;
  tenant?: TelemetryTenant;
  requestId?: string | null;
};

export async function writeAuditEvent(
  ctx: ServerTelemetryContext,
  input: AuditEventInput,
): Promise<string> {
  const requestId = input.requestId ?? ctx.requestId ?? newRequestId();
  const { error } = await ctx.supabase.from("audit_events").insert({
    actor_id: ctx.userId,
    entity_type: input.entity.type,
    entity_id: input.entity.id ?? null,
    event_type: input.event,
    previous_value: input.previous ? redactRecord(input.previous) : null,
    new_value: input.next ? redactRecord(input.next) : null,
    organization_id: ctx.tenant?.organizationId ?? null,
    workspace_id: ctx.tenant?.workspaceId ?? null,
    request_id: requestId,
    severity: input.severity ?? "info",
    source: input.source ?? "server",
  });
  if (error) console.warn("[telemetry] audit rejected", { event: input.event, code: error.code });
  return requestId;
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
