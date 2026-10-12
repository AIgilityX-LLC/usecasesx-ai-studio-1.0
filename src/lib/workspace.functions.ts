import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isOrgMembershipActive,
  pickActiveWorkspace,
  type WorkspaceMembershipOption,
} from "@/lib/workspace-selection";

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

type BuiltContext = {
  userId: string;
  organization: { id: string; name: string | null; plan: string | null } | null;
  workspace: { id: string; name: string } | null;
  orgRole: string | null;
  workspaceRole: string | null;
  orgStatus: string | null;
  entitlement: { planCode: string | null; expiresAt: string | null };
  can: { manageMembers: boolean; edit: boolean; view: boolean };
  availableWorkspaces: WorkspaceMembershipOption[];
  status: "ready" | "no_workspace" | "suspended" | "forbidden";
};

async function loadMembershipOptions(
  admin: any,
  userId: string,
): Promise<WorkspaceMembershipOption[]> {
  const { data: memberRows, error } = await admin
    .from("workspace_members")
    .select("role, workspace_id")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = (memberRows ?? []) as Array<{ role: string; workspace_id: string }>;
  if (rows.length === 0) return [];

  const workspaceIds = [...new Set(rows.map((r) => r.workspace_id))];
  const { data: workspaces, error: wsError } = await admin
    .from("workspaces")
    .select("id, name, organization_id")
    .in("id", workspaceIds);
  if (wsError) throw wsError;

  const orgIds = [
    ...new Set(
      ((workspaces ?? []) as Array<{ organization_id: string }>).map((w) => w.organization_id),
    ),
  ];
  const [{ data: orgs }, { data: orgMembers }] = await Promise.all([
    admin.from("organizations").select("id, name").in("id", orgIds),
    admin
      .from("organization_members")
      .select("organization_id, role, status")
      .eq("user_id", userId)
      .in("organization_id", orgIds),
  ]);

  const orgName = new Map(
    ((orgs ?? []) as Array<{ id: string; name: string | null }>).map((o) => [o.id, o.name]),
  );
  const orgMeta = new Map(
    ((orgMembers ?? []) as Array<{ organization_id: string; role: string; status: string }>).map(
      (m) => [m.organization_id, m],
    ),
  );
  const wsById = new Map(
    ((workspaces ?? []) as Array<{ id: string; name: string; organization_id: string }>).map(
      (w) => [w.id, w],
    ),
  );

  const options: WorkspaceMembershipOption[] = [];
  for (const r of rows) {
    const ws = wsById.get(r.workspace_id);
    if (!ws) continue;
    const om = orgMeta.get(ws.organization_id);
    options.push({
      id: ws.id,
      name: ws.name,
      organizationId: ws.organization_id,
      organizationName: orgName.get(ws.organization_id) ?? null,
      role: r.role,
      orgStatus: om?.status ?? "active",
    });
  }
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

async function buildContext(
  admin: any,
  userId: string,
  preferredWorkspaceId: string | null,
): Promise<BuiltContext> {
  // Provision a default workspace for brand-new accounts (idempotent).
  const { data: provisionedId, error: provisionError } = await admin.rpc(
    "ensure_user_workspace" as any,
    { _user_id: userId },
  );
  if (provisionError) throw provisionError;

  const availableWorkspaces = await loadMembershipOptions(admin, userId);
  const picked = pickActiveWorkspace(
    availableWorkspaces,
    preferredWorkspaceId,
    (provisionedId as string | null) ?? null,
  );

  if (!picked.active) {
    return {
      userId,
      organization: null,
      workspace: null,
      orgRole: null,
      workspaceRole: null,
      orgStatus: picked.status === "suspended" ? "suspended" : null,
      entitlement: { planCode: null, expiresAt: null },
      can: { manageMembers: false, edit: false, view: false },
      availableWorkspaces,
      status: picked.status,
    };
  }

  const active = picked.active;
  const organizationId = active.organizationId;

  const [orgResult, memberResult, entitlementResult] = await Promise.all([
    admin.from("organizations").select("id, name, plan").eq("id", organizationId).maybeSingle(),
    admin
      .from("organization_members" as any)
      .select("role, status")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("entitlements" as any)
      .select("plan_code, expires_at, revoked_at")
      .eq("organization_id", organizationId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const orgRole = ((memberResult.data as any)?.role ?? null) as string | null;
  const orgStatus = ((memberResult.data as any)?.status ?? active.orgStatus) as string;
  const workspaceRole = active.role;

  return {
    userId,
    organization: {
      id: organizationId,
      name: (orgResult.data as any)?.name ?? active.organizationName,
      plan: (orgResult.data as any)?.plan ?? null,
    },
    workspace: { id: active.id, name: active.name },
    orgRole,
    workspaceRole,
    orgStatus,
    entitlement: {
      planCode: ((entitlementResult.data as any)?.plan_code ?? null) as string | null,
      expiresAt: ((entitlementResult.data as any)?.expires_at ?? null) as string | null,
    },
    can: {
      manageMembers: orgRole === "owner" || orgRole === "admin",
      edit: ["owner", "admin", "contributor", "facilitator"].includes(workspaceRole ?? ""),
      view: workspaceRole != null || orgRole != null,
    },
    availableWorkspaces,
    status: isOrgMembershipActive(orgStatus) ? "ready" : "suspended",
  };
}

/**
 * Single source of truth for the caller's tenancy context.
 * Routes must consume this instead of re-deriving organization / workspace
 * ownership independently. Provisioning is idempotent, so this is safe to call
 * on every signed-in surface.
 *
 * `preferredWorkspaceId` is a client hint (last selection). Membership is
 * always re-checked server-side; an invalid hint is ignored.
 */
export const getWorkspaceContextFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ preferredWorkspaceId: z.string().uuid().optional().nullable() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return buildContext(supabaseAdmin, context.userId, data.preferredWorkspaceId ?? null);
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
    return buildContext(supabaseAdmin, context.userId, data.workspaceId);
  });
