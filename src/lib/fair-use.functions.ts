/**
 * Fair-use server functions — thin wrappers only (AGENTS.md §3).
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getFairUseStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { fairUseStatus } = await import("@/lib/ai/fair-use.server");
    return fairUseStatus(context.supabase, context.userId);
  });
