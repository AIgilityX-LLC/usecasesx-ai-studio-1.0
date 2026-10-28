import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOrgMembershipActive } from "@/lib/workspace-selection";

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
    const { data, error } = await supabaseAdmin.rpc("ensure_user_workspace" as any, {
      _user_id: context.userId,
    });
    if (error) throw error;
    if (!data) throw new Error("Workspace provisioning returned no workspace id.");
    return data as unknown as string;
  });

/**
 * Single source of truth for the caller's tenancy context.
 * Routes must consume this instead of re-deriving organization / workspace
 * ownership independently. Provisioning is idempotent, so this is safe to call
 * on every signed-in surface.
 *
 * `preferredWorkspaceId` is a client hint (last selection). Membership is
 * always re-checked server-side; an invalid hint is ignored.
 * Client-supplied tenant/organization ids are never accepted as authority —
 * see `src/lib/tenancy/`.
 */
export const getWorkspaceContextFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ preferredWorkspaceId: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveTenantContext, toWorkspaceContextView } = await import(
      "@/lib/tenancy/tenant-context.server"
    );
    const ctx = await resolveTenantContext(
      supabaseAdmin,
      context.userId,
      data.preferredWorkspaceId ?? null,
    );
    return toWorkspaceContextView(ctx);
  });

/**
 * Switch the active workspace. Validates membership via the user-scoped
 * client (RLS). Does not write a DB preference — the client persists the id.
 */
export const setActiveWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS-scoped read — non-members see zero rows.
    const { data: membership, error } = await context.supabase
      .from("workspace_members")
      .select("role, workspace_id")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!membership) {
      const err: any = new Error("You are not a member of that workspace.");
      err.kind = "forbidden";
      err.statusCode = 403;
      throw err;
    }

    const { data: workspace, error: wsError } = await context.supabase
      .from("workspaces")
      .select("id, organization_id")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (wsError) throw wsError;
    if (!workspace) {
      const err: any = new Error("Workspace not found.");
      err.kind = "not_found";
      err.statusCode = 404;
      throw err;
    }

    const { data: orgMember } = await context.supabase
      .from("organization_members")
      .select("status")
      .eq("organization_id", workspace.organization_id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (orgMember && !isOrgMembershipActive((orgMember as any).status)) {
      const err: any = new Error("This organization membership is suspended.");
      err.kind = "suspended";
      err.statusCode = 403;
      throw err;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveTenantContext, toWorkspaceContextView } = await import(
      "@/lib/tenancy/tenant-context.server"
    );
    const ctx = await resolveTenantContext(supabaseAdmin, context.userId, data.workspaceId);
    return toWorkspaceContextView(ctx);
  });
