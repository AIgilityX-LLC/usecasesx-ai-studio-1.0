/**
 * Journey summary — thin server-function wrapper (AGENTS.md §3).
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getJourneySummaryFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadJourneySummary } = await import("@/lib/journey.server");
    return loadJourneySummary(context.supabase, context.userId);
  });
