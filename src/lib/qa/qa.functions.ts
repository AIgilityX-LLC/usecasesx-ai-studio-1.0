import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Runs the signed-in P0/P1 launch checks as the calling user. There is no
 * elevation: the probes see exactly what this session is allowed to see, which
 * is what makes the result evidence.
 */
export const runLaunchChecksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runLaunchChecks } = await import("@/lib/qa/harness.server");
    const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;
    return runLaunchChecks(context.supabase, {
      userId: context.userId,
      email,
      isAdmin: Boolean(isAdmin),
    });
  });
