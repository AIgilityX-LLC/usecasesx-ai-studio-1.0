/**
 * Thin gate for Enterprise Administration Center.
 * Re-checks org owner/admin on the server — UI visibility is never enough.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireEnterpriseAdminAccessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const { organizationId, role } = await requireOrgManager(
      context.supabase as never,
      context.userId,
    );
    return { organizationId, role, ok: true as const };
  });
