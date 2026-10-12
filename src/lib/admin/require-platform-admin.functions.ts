import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side gate for AIgilityX platform administration.
 * UI hiding is never enough — routes and loaders must call this (or RLS).
 */
export const requirePlatformAdminFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!data) {
      const err: Error & { statusCode?: number; kind?: string } = new Error(
        "Platform administrator access is required.",
      );
      err.statusCode = 403;
      err.kind = "forbidden";
      throw err;
    }
    return { ok: true as const, userId: context.userId };
  });
