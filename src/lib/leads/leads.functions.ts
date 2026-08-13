import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEAD_STATUSES } from "@/lib/leads/leads.model";

export const getLeadPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { listLeads } = await import("@/lib/leads/leads.server");
    return listLeads(context.supabase);
  });

const StatusInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(LEAD_STATUSES),
  note: z.string().trim().max(1000).nullable().optional(),
});

export const setLeadPipelineStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { setLeadStatus } = await import("@/lib/leads/leads.server");
    const updated = await setLeadStatus(context.supabase, {
      ids: data.ids,
      status: data.status,
      note: data.note ?? null,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "lead_capture", id: data.ids[0]! },
        next: { lead_status: data.status, affected: updated },
        source: "lead-pipeline",
      },
    );
    return { updated };
  });
