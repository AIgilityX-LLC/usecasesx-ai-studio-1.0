/**
 * Server-only TenantContext resolution.
 *
 * Every authenticated request should obtain tenancy through this module (or
 * `getWorkspaceContextFn`, which wraps it). Organization / tenant ids are
 * derived from membership for `auth.uid()` — never from a client `tenant_id`.
 *
 * Never import this file from client bundles.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isOrgMembershipActive,
  type WorkspaceMembershipOption,
} from "@/lib/workspace-selection";
import { buildTenantContext, deriveActiveScope, type TenantContext } from "./tenant-context";
import { EntitlementService } from "./entitlement-service";

async function loadMembershipOptions(
  admin: SupabaseClient<any, any, any>,
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

/**
 * Resolve TenantContext for the authenticated user.
 *
 * @param preferredWorkspaceId Client selection hint only — must already be a
 *   membership for this user or it is ignored. Never accept organization/tenant
 *   id from the client as authority.
 */
export async function resolveTenantContext(
  admin: SupabaseClient<any, any, any>,
  userId: string,
  preferredWorkspaceId: string | null = null,
): Promise<TenantContext> {
  const { data: provisionedId, error: provisionError } = await admin.rpc(
    "ensure_user_workspace" as any,
    { _user_id: userId },
  );
  if (provisionError) throw provisionError;

  const availableWorkspaces = await loadMembershipOptions(admin, userId);
  const scope = deriveActiveScope(
    availableWorkspaces,
    preferredWorkspaceId,
    (provisionedId as string | null) ?? null,
  );

  if (!scope.workspaceId || !scope.organizationId) {
    return buildTenantContext({
      userId,
      organization: null,
      workspace: null,
      orgRole: null,
      workspaceRole: null,
      orgStatus: scope.orgStatus,
      planCode: null,
      expiresAt: null,
      availableWorkspaces,
      status: scope.status,
    });
  }

  const organizationId = scope.organizationId;

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
      .select("plan_code, expires_at, revoked_at, organization_id, source")
      .eq("organization_id", organizationId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const orgRole = ((memberResult.data as any)?.role ?? null) as string | null;
  const orgStatus = ((memberResult.data as any)?.status ?? scope.orgStatus) as string;
  const ent = entitlementResult.data as any;
  const subscription = EntitlementService.subscriptionFromRow(
    ent
      ? {
          organization_id: ent.organization_id ?? organizationId,
          plan_code: ent.plan_code ?? null,
          expires_at: ent.expires_at ?? null,
          revoked_at: ent.revoked_at ?? null,
          source: ent.source ?? null,
        }
      : null,
  );

  return buildTenantContext({
    userId,
    organization: {
      id: organizationId,
      name: (orgResult.data as any)?.name ?? null,
      plan: (orgResult.data as any)?.plan ?? null,
    },
    workspace: { id: scope.workspaceId, name: scope.workspaceName ?? "Workspace" },
    orgRole,
    workspaceRole: scope.workspaceRole,
    orgStatus,
    planCode: subscription?.planCode ?? null,
    expiresAt: subscription?.expiresAt ?? null,
    availableWorkspaces,
    status: isOrgMembershipActive(orgStatus) ? "ready" : "suspended",
  });
}

/**
 * Legacy shape returned by `getWorkspaceContextFn` — kept for call-site
 * compatibility while consumers migrate to TenantContext.
 */
export function toWorkspaceContextView(ctx: TenantContext) {
  return {
    userId: ctx.userId,
    organization: ctx.organization,
    workspace: ctx.workspace,
    orgRole: ctx.orgRole,
    workspaceRole: ctx.workspaceRole,
    orgStatus: ctx.orgStatus,
    entitlement: {
      planCode: ctx.subscription.planCode,
      expiresAt: ctx.subscription.expiresAt,
    },
    can: ctx.can,
    availableWorkspaces: ctx.availableWorkspaces,
    status: ctx.status,
    /** Phase 4: explicit hierarchy + provenance for new consumers. */
    tenant: ctx.tenant,
    hierarchy: ctx.hierarchy,
    derivedFrom: ctx.derivedFrom,
  };
}
