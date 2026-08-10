import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  from: z.string().min(4),
  to: z.string().min(4),
});

export const getLaunchLearning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAnalyticsReader } = await import("@/lib/cta-analytics-access.server");
    await assertAnalyticsReader(context.supabase, context.userId);
    const { aggregateLaunchLearning } = await import("@/lib/analytics/launch-learning.server");
    return aggregateLaunchLearning(context.supabase, { from: data.from, to: data.to });
  });
