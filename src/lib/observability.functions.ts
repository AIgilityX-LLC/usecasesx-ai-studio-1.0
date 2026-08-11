/**
 * Observability server functions — thin wrappers only (AGENTS.md §3).
 *
 * Each handler re-resolves the caller's workspace role server-side; the reads
 * themselves run under the caller's RLS so cross-workspace rows are never
 * returned.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const windowInput = z.object({ windowDays: z.number().int().min(1).max(90).default(30) });

export const listExportAuditFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => windowInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/observability/observability.server");
    const access = await mod.observabilityAccess(context.supabase, context.userId);
    if (!access.authorized) return { authorized: false as const, reason: access.reason };
    const result = await mod.listExportAudit(context.supabase, access.workspaceId, data.windowDays);
    return { authorized: true as const, scope: access.scope, ...result };
  });

export const aiUsageAnalyticsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => windowInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/observability/observability.server");
    const access = await mod.observabilityAccess(context.supabase, context.userId);
    if (!access.authorized) return { authorized: false as const, reason: access.reason };
    const analytics = await mod.aiUsageAnalytics(
      context.supabase,
      access.workspaceId,
      data.windowDays,
    );
    return { authorized: true as const, scope: access.scope, analytics };
  });

export const securityAlertsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => windowInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/observability/observability.server");
    const access = await mod.observabilityAccess(context.supabase, context.userId);
    if (!access.authorized) return { authorized: false as const, reason: access.reason };
    const result = await mod.securityAlerts(context.supabase, access.workspaceId, data.windowDays);
    return { authorized: true as const, scope: access.scope, ...result };
  });
