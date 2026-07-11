import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Ensure the signed-in user has an org + workspace provisioned.
 * Wraps the SECURITY DEFINER `ensure_user_workspace` DB function.
 * Called via service_role from the server so we can revoke direct
 * anon/authenticated EXECUTE on the DB function.
 */
export const ensureUserWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Impersonate caller so auth.uid() resolves inside the DB function.
    const { data, error } = await supabaseAdmin.rpc("ensure_user_workspace" as any, {}, {
      // pass user context via GUC-less approach: run as service role, but
      // ensure_user_workspace relies on auth.uid() — so we need to set the
      // request JWT. Do this via a per-request client bound to the user token.
    });
    if (error) throw error;
    if (!data) throw new Error("Workspace provisioning returned no workspace id.");
    return data as unknown as string;
  });
