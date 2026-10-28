/**
 * Server-only audit append. Uses the caller's RLS-scoped client so records
 * remain attributable. Never throws into the caller's business flow.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditEventInput, TelemetryTenant } from "@/lib/telemetry/events";
import { fromLegacyAuditInput, prepareAuditInsert } from "./write";
import type { AppendAuditEventInput, AuditEventReceipt } from "./types";

export type AuditWriteContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>;
  userId: string;
  tenant?: TelemetryTenant;
  requestId?: string | null;
  sessionId?: string | null;
};

/** Append one immutable audit event. Fire-and-forget safe. */
export async function appendAuditEvent(
  ctx: AuditWriteContext,
  input: AppendAuditEventInput,
): Promise<AuditEventReceipt> {
  const merged: AppendAuditEventInput = {
    ...input,
    tenantId: input.tenantId ?? ctx.tenant?.organizationId ?? null,
    workspaceId: input.workspaceId ?? ctx.tenant?.workspaceId ?? null,
    sessionId: input.sessionId ?? ctx.sessionId ?? null,
    actorId: input.actorId ?? ctx.userId,
  };
  const { requestId, row } = prepareAuditInsert(merged, {
    actorId: ctx.userId,
    requestId: ctx.requestId,
    source: input.source ?? "server",
  });

  try {
    const { data, error } = await ctx.supabase
      .from("audit_events")
      .insert(row as never)
      .select("id, created_at")
      .maybeSingle();
    if (error) {
      console.warn("[audit] append rejected", { event: input.eventType, code: error.code });
      return { id: null, requestId, recordedAt: null, error: error.message };
    }
    const typed = data as { id?: string; created_at?: string } | null;
    return {
      id: typed?.id ?? null,
      requestId,
      recordedAt: typed?.created_at ?? null,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "append_failed";
    console.warn("[audit] append failed", message);
    return { id: null, requestId, recordedAt: null, error: message };
  }
}

/** Compatibility bridge for existing `writeAuditEvent` call sites. */
export async function appendAuditEventFromLegacy(
  ctx: AuditWriteContext,
  input: AuditEventInput,
): Promise<string> {
  const receipt = await appendAuditEvent(ctx, fromLegacyAuditInput(input));
  return receipt.requestId;
}
