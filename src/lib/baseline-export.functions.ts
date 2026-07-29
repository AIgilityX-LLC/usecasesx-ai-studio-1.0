import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only export of the seeded launch baseline (demo accounts, their
 * workspaces, and the published reference use cases) as JSON.
 *
 * Verification / demo aid only: no passwords, tokens or tenant content are
 * returned. The caller must hold an admin-tier role — checked through the
 * authenticated client, never with the service-role client.
 */
export const exportBaseline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin_tier", {
      _user_id: context.userId,
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");

    const [profiles, workspaces, useCases] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("user_id, email, full_name, plan_type, entitlement_tier, organization_id")
        .like("email", "%@demo.usecasex.app")
        .order("email"),
      context.supabase
        .from("workspaces")
        .select("id, name, organization_id, created_at")
        .order("created_at"),
      context.supabase
        .from("use_cases")
        .select("id, slug, title, status, visibility, published_at")
        .eq("status", "published")
        .order("slug"),
    ]);

    return {
      generated_at: new Date().toISOString(),
      counts: {
        demo_accounts: profiles.data?.length ?? 0,
        workspaces: workspaces.data?.length ?? 0,
        published_use_cases: useCases.data?.length ?? 0,
      },
      demo_accounts: profiles.data ?? [],
      workspaces: workspaces.data ?? [],
      published_use_cases: useCases.data ?? [],
    };
  });
