/**
 * ERP reconciliation server functions — thin wrappers only (AGENTS.md §3).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runErpReconciliationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ useCaseIds: z.array(z.string().uuid()).max(200).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { reconcileBenefits } = await import("@/lib/value/erp-reconciliation.server");
    // Runs under the caller's RLS scope, so a user can only reconcile their own benefits.
    return reconcileBenefits(context.supabase, {
      ...(data.useCaseIds ? { useCaseIds: data.useCaseIds } : {}),
      actorId: context.userId,
    });
  });
