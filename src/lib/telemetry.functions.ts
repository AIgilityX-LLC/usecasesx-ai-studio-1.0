import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Launch-learning reads. Thin wrappers only — RLS decides what the caller can
 * see (own events, own workspace as owner/admin, or all as platform admin).
 */

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  workspaceId: z.string().uuid().nullish(),
});

/** Daily activation counts by event and workspace, from `activation_funnel_daily`. */
export const getActivationFunnelFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("activation_funnel_daily" as never)
      .select("day, workspace_id, organization_id, event_name, event_count, user_count")
      .order("day", { ascending: false })
      .limit(500);
    if (data.from) query = query.gte("day", data.from.slice(0, 10));
    if (data.to) query = query.lte("day", data.to.slice(0, 10));
    if (data.workspaceId) query = query.eq("workspace_id", data.workspaceId);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[telemetry] activation read failed", { code: error.code });
      return { rows: [] as ActivationRow[], error: "Activation data is unavailable." };
    }
    return { rows: (rows ?? []) as unknown as ActivationRow[], error: null };
  });

export type ActivationRow = {
  day: string;
  workspace_id: string | null;
  organization_id: string | null;
  event_name: string;
  event_count: number;
  user_count: number;
};

/** Recent audit trail for one entity (governance evidence in the UI). */
export const getEntityAuditTrailFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ entityType: z.string().min(1).max(80), entityId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_events")
      .select("id, event_type, severity, previous_value, new_value, request_id, created_at")
      .eq("entity_type", data.entityType)
      .eq("entity_id", data.entityId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[telemetry] audit read failed", { code: error.code });
      return { rows: [], error: "Audit history is unavailable." };
    }
    return { rows: rows ?? [], error: null };
  });
