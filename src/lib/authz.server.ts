/**
 * Server-only resolution of the caller's authorization subject.
 * Never imported from client code (filename is `.server.ts`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveEdition, resolveFoundingAccess, type FoundingAccessConfig } from "./authz/editions";
import { mergeCapabilityFlags, type CapabilityFlags } from "./authz/flags";
import { isPlatformAdminRole, resolveWorkspaceRole } from "./authz/roles";
import type { AuthzSubject } from "./authz/permission-service";

/** Central edition configuration, overridable per environment. */
export function foundingAccessConfig(): FoundingAccessConfig {
  return resolveFoundingAccess(process.env.FOUNDING_ACCESS_UNTIL ?? null);
}

/** Capability flags as the server sees them (`CAPABILITY_<KEY>=true`). */
export function serverCapabilityFlags(): CapabilityFlags {
  const read = (name: string): boolean | undefined => {
    const raw = process.env[name];
    if (raw == null) return undefined;
    return raw === "true";
  };
  return mergeCapabilityFlags({
    opportunityMap: read("CAPABILITY_OPPORTUNITY_MAP"),
    workshopMode: read("CAPABILITY_WORKSHOP_MODE"),
    stageGates: read("CAPABILITY_STAGE_GATES"),
    multiEntity: read("CAPABILITY_MULTI_ENTITY"),
    integrations: read("CAPABILITY_INTEGRATIONS"),
    sso: read("CAPABILITY_SSO"),
    fullAudit: read("CAPABILITY_FULL_AUDIT"),
  });
}

export type ResolvedSubject = AuthzSubject & {
  organizationId: string | null;
  workspaceId: string | null;
  foundingExpiresAt: string;
};

/**
 * Build the subject for a signed-in caller. Reads through the RLS-scoped
 * client so a caller can never widen their own context.
 */
export async function resolveSubject(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  workspaceId?: string | null,
): Promise<ResolvedSubject> {
  const founding = foundingAccessConfig();

  const [profileResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "plan_type, entitlement_tier, entitlement_expires_at, founding_member, organization_id",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const profile = (profileResult.data ?? null) as any;
  const organizationId = (profile?.organization_id ?? null) as string | null;

  const [wsMemberResult, orgMemberResult, entitlementResult] = await Promise.all([
    workspaceId
      ? supabase
          .from("workspace_members")
          .select("role")
          .eq("user_id", userId)
          .eq("workspace_id", workspaceId)
          .maybeSingle()
      : supabase
          .from("workspace_members")
          .select("role, workspace_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle(),
    organizationId
      ? supabase
          .from("organization_members")
          .select("role, status")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    organizationId
      ? supabase
          .from("entitlements")
          .select("plan_code, expires_at, revoked_at")
          .eq("organization_id", organizationId)
          .is("revoked_at", null)
          .order("granted_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const wsMember = (wsMemberResult as any).data ?? null;
  const orgMember = (orgMemberResult as any).data ?? null;
  const entitlement = (entitlementResult as any).data ?? null;

  const orgRole = orgMember?.status === "active" ? orgMember?.role : orgMember?.role;
  const workspaceRole = resolveWorkspaceRole(wsMember?.role ?? null, orgRole ?? null);

  const edition = resolveEdition(
    {
      storedTier: profile?.entitlement_tier ?? null,
      expiresAt: profile?.entitlement_expires_at ?? null,
      planType: profile?.plan_type ?? null,
      orgPlanCode: entitlement?.plan_code ?? null,
      orgPlanExpiresAt: entitlement?.expires_at ?? null,
      foundingMember: profile?.founding_member ?? null,
    },
    founding,
  );

  const roles = ((rolesResult.data ?? []) as Array<{ role: string }>).map((r) => r.role);

  return {
    userId,
    edition,
    workspaceRole,
    isPlatformAdmin: roles.some(isPlatformAdminRole),
    flags: serverCapabilityFlags(),
    organizationId,
    workspaceId: workspaceId ?? wsMember?.workspace_id ?? null,
    foundingExpiresAt: founding.expiresAt,
  };
}
