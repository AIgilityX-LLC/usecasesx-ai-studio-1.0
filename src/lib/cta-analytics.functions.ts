import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  from: z.string().min(4),
  to: z.string().min(4),
  device: z.enum(["desktop", "tablet", "mobile"]).nullable().optional(),
});

export const getCtaAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { aggregateCtaEvents } = await import("@/lib/cta-analytics.server");
    return aggregateCtaEvents(context.supabase, {
      from: data.from,
      to: data.to,
      device: data.device ?? null,
    });
  });
