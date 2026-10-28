/**
 * Thin server-fn wrappers for authorized audit filter and export.
 * Authorization is re-checked here — never trust the client role claim.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AUDIT_ACTOR_TYPES, AUDIT_RESULTS } from "./types";
import { serializeAuditExport } from "./export";

const filterSchema = z.object({
  tenantId: z.string().uuid().nullish(),
  workspaceId: z.string().uuid().nullish(),
  actorId: z.string().uuid().nullish(),
  actorType: z.enum(AUDIT_ACTOR_TYPES).nullish(),
  eventType: z.string().min(1).max(120).nullish(),
  resourceType: z.string().min(1).max(80).nullish(),
  resourceId: z.string().uuid().nullish(),
  result: z.enum(AUDIT_RESULTS).nullish(),
  requestId: z.string().min(1).max(128).nullish(),
  from: z.string().datetime().nullish(),
  to: z.string().datetime().nullish(),
  q: z.string().max(80).nullish(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

const exportSchema = filterSchema.extend({
  format: z.enum(["json", "csv"]).default("csv"),
});

/** Filtered audit history for tenant administrators and platform auditors. */
export const queryAuditEventsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => filterSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { requireAuditReader } = await import("./access.server");
    const { queryAuditEvents } = await import("./query.server");
    try {
      const scope = await requireAuditReader(context.supabase, context.userId);
      const { events, error } = await queryAuditEvents(context.supabase, scope, data);
      return {
        events,
        error,
        scope: { isPlatformAuditor: scope.isPlatformAuditor, tenantId: scope.tenantId },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Forbidden";
      if (message.startsWith("Forbidden")) {
        return { events: [], error: message, scope: null };
      }
      console.error("[audit] queryAuditEventsFn failed", message);
      return { events: [], error: "Audit history is unavailable.", scope: null };
    }
  });

/** Export filtered audit history (JSON or CSV) for authorized readers only. */
export const exportAuditEventsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => exportSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { requireAuditReader } = await import("./access.server");
    const { queryAuditEvents } = await import("./query.server");
    try {
      const scope = await requireAuditReader(context.supabase, context.userId);
      const { format, ...filter } = data;
      const { events, error } = await queryAuditEvents(
        context.supabase,
        scope,
        { ...filter, limit: filter.limit ?? 5_000 },
        { forExport: true },
      );
      if (error) return { error, body: null, contentType: null, filename: null, count: 0 };

      // Record that an export occurred (best-effort; never block the download).
      const { appendAuditEvent } = await import("./write.server");
      await appendAuditEvent(
        { supabase: context.supabase, userId: context.userId },
        {
          eventType: "export.generated",
          resourceType: "audit_events",
          tenantId: scope.tenantId ?? filter.tenantId ?? null,
          afterState: { format, count: events.length },
          result: "success",
          source: "audit.export",
          severity: "notice",
          metadata: { channel: "compliance_audit_export" },
        },
      );

      const serialized = serializeAuditExport(events, format);
      return {
        error: null,
        body: serialized.body,
        contentType: serialized.contentType,
        filename: serialized.filename,
        count: events.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Forbidden";
      return {
        error: message.startsWith("Forbidden") ? message : "Audit export is unavailable.",
        body: null,
        contentType: null,
        filename: null,
        count: 0,
      };
    }
  });
