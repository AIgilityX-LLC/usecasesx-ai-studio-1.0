import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Production configuration report. Platform-admin only: it names the
 * server-side secrets the deployment expects, so the shape itself is
 * operational information. Values are never read into the result.
 */
export const getProductionConfigFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Only platform admins can read the production configuration.");
    const { collectProductionConfig } = await import("@/lib/ops/production-config.server");
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      context.userId;
    let observedHost = "unknown";
    try {
      observedHost = new URL(getRequest().url).host;
    } catch {
      observedHost = "unknown";
    }
    return collectProductionConfig({ observedHost, actor: email });
  });
