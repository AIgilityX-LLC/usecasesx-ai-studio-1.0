/**
 * Opportunity Map — server functions (thin wrappers only, AGENTS.md §3).
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOpportunityMapFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadOpportunityMap } = await import("@/lib/opportunity-map.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return loadOpportunityMap(context.supabase as any);
  });
