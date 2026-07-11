import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Ensure the signed-in user has an org + workspace provisioned.
 * Wraps the SECURITY DEFINER `ensure_user_workspace(_user_id uuid)` DB function.
 * Invoked via service_role so we can revoke direct anon/authenticated EXECUTE
 * on the DB function (see security finding
 * SUPA_authenticated_security_definer_function_executable).
 */
export const ensureUserWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc(
      "ensure_user_workspace" as any,
      { _user_id: context.userId },
    );
    if (error) throw error;
    if (!data) throw new Error("Workspace provisioning returned no workspace id.");
    return data as unknown as string;
  });
