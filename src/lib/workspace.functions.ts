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

/**
 * Single source of truth for the caller's tenancy context.
 * Routes must consume this instead of re-deriving organization / workspace
 * ownership independently. Provisioning is idempotent, so this is safe to call
 * on every signed-in surface.
 */
export const getWorkspaceContextFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: workspaceId, error: provisionError } = await supabaseAdmin.rpc(
      "ensure_user_workspace" as any,
      { _user_id: userId },
    );
    if (provisionError) throw provisionError;

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, organization_id")
      .eq("id", workspaceId as unknown as string)
      .maybeSingle();
    if (wsError) throw wsError;
    if (!workspace) throw new Error("Workspace context could not be resolved.");

    const organizationId = workspace.organization_id;

    const [orgResult, memberResult, wsMemberResult, entitlementResult] = await Promise.all([
      supabaseAdmin.from("organizations").select("id, name, plan").eq("id", organizationId).maybeSingle(),
      supabaseAdmin
        .from("organization_members" as any)
        .select("role, status")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("workspace_members" as any)
        .select("role")
        .eq("workspace_id", workspace.id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("entitlements" as any)
        .select("plan_code, expires_at, revoked_at")
        .eq("organization_id", organizationId)
        .is("revoked_at", null)
        .order("granted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const orgRole = ((memberResult.data as any)?.role ?? null) as string | null;
    const workspaceRole = ((wsMemberResult.data as any)?.role ?? null) as string | null;

    return {
      userId,
      organization: {
        id: organizationId,
        name: (orgResult.data as any)?.name ?? null,
        plan: (orgResult.data as any)?.plan ?? null,
      },
      workspace: { id: workspace.id, name: workspace.name },
      orgRole,
      workspaceRole,
      entitlement: {
        planCode: ((entitlementResult.data as any)?.plan_code ?? null) as string | null,
        expiresAt: ((entitlementResult.data as any)?.expires_at ?? null) as string | null,
      },
      can: {
        manageMembers: orgRole === "owner" || orgRole === "admin",
        edit: ["owner", "admin", "contributor", "facilitator"].includes(workspaceRole ?? ""),
        view: workspaceRole != null || orgRole != null,
      },
    };
  });
