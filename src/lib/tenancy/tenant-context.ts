/**
 * TenantContext — the only in-app tenancy handle UI and services should read.
 *
 * Rules:
 * 1. Context is derived from authenticated identity + membership tables.
 * 2. Client-supplied `tenant_id` / `organization_id` is never authority.
 * 3. `preferredWorkspaceId` is a selection hint; membership revalidation decides.
 * 4. Do not sprinkle tenant filters through random components — use this context
 *    (or server helpers that produce it) and RLS.
 */

import {
  isOrgMembershipActive,
  pickActiveWorkspace,
  type WorkspaceContextStatus,
  type WorkspaceMembershipOption,
} from "@/lib/workspace-selection";
import { asTenant, type Organization, type Subscription, type Tenant } from "./models";
import { buildHierarchyPath, type HierarchyPath } from "./hierarchy";

export type TenantContextStatus = WorkspaceContextStatus;

export type TenantContext = {
  userId: string;
  /** Product language alias for organization. */
  tenant: Tenant | null;
  organization: Organization | null;
  workspace: { id: string; name: string } | null;
  orgRole: string | null;
  workspaceRole: string | null;
  orgStatus: string | null;
  subscription: Pick<Subscription, "planCode" | "expiresAt"> & { source: "entitlements" | "none" };
  /** Coarse capability mirror for shell UX (membership-derived). */
  can: { manageMembers: boolean; edit: boolean; view: boolean };
  availableWorkspaces: WorkspaceMembershipOption[];
  status: TenantContextStatus;
  hierarchy: HierarchyPath;
  /**
   * Provenance marker — always membership. Presence of this field is what
   * scanners/tests assert against forged client tenant ids.
   */
  derivedFrom: "authenticated_membership";
};

export type ClientTenantClaim = {
  tenantId?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
};

/**
 * Reject treating a client-supplied tenant/organization id as authoritative.
 * Preferred workspace may be passed as a *hint* only (see pickActiveWorkspace).
 */
export function assertClientTenantNotAuthoritative(
  claim: ClientTenantClaim,
  resolved: { organizationId: string | null; workspaceId: string | null },
): { ok: true } | { ok: false; reason: string } {
  const claimedOrg = claim.tenantId ?? claim.organizationId ?? null;
  if (claimedOrg && resolved.organizationId && claimedOrg !== resolved.organizationId) {
    return {
      ok: false,
      reason: "Client-supplied tenant/organization id does not match membership-derived context.",
    };
  }
  if (claim.workspaceId && resolved.workspaceId && claim.workspaceId !== resolved.workspaceId) {
    // Preferred hint that failed membership must already have been ignored.
    return {
      ok: false,
      reason: "Client-supplied workspace id is not the membership-validated active workspace.",
    };
  }
  return { ok: true };
}

/** Pure derivation of active org/workspace ids from membership — no DB. */
export function deriveActiveScope(
  memberships: readonly WorkspaceMembershipOption[],
  preferredWorkspaceId: string | null | undefined,
  provisionedWorkspaceId: string | null | undefined,
): {
  organizationId: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceRole: string | null;
  orgStatus: string | null;
  status: TenantContextStatus;
  selectable: WorkspaceMembershipOption[];
} {
  const picked = pickActiveWorkspace(
    memberships,
    preferredWorkspaceId,
    provisionedWorkspaceId,
  );
  if (!picked.active) {
    return {
      organizationId: null,
      workspaceId: null,
      workspaceName: null,
      workspaceRole: null,
      orgStatus: picked.status === "suspended" ? "suspended" : null,
      status: picked.status,
      selectable: picked.selectable,
    };
  }
  return {
    organizationId: picked.active.organizationId,
    workspaceId: picked.active.id,
    workspaceName: picked.active.name,
    workspaceRole: picked.active.role,
    orgStatus: picked.active.orgStatus,
    status: isOrgMembershipActive(picked.active.orgStatus) ? "ready" : "suspended",
    selectable: picked.selectable,
  };
}

export function buildTenantContext(input: {
  userId: string;
  organization: Organization | null;
  workspace: { id: string; name: string } | null;
  orgRole: string | null;
  workspaceRole: string | null;
  orgStatus: string | null;
  planCode: string | null;
  expiresAt: string | null;
  availableWorkspaces: WorkspaceMembershipOption[];
  status: TenantContextStatus;
  businessUnitId?: string | null;
}): TenantContext {
  const organization = input.organization;
  const tenant = organization ? asTenant(organization) : null;
  const canManage = input.orgRole === "owner" || input.orgRole === "admin";
  const canEdit = ["owner", "admin", "contributor", "facilitator"].includes(
    input.workspaceRole ?? "",
  );

  return {
    userId: input.userId,
    tenant,
    organization,
    workspace: input.workspace,
    orgRole: input.orgRole,
    workspaceRole: input.workspaceRole,
    orgStatus: input.orgStatus,
    subscription: {
      planCode: input.planCode,
      expiresAt: input.expiresAt,
      source: input.planCode ? "entitlements" : "none",
    },
    can: {
      manageMembers: canManage,
      edit: canEdit,
      view: input.workspaceRole != null || input.orgRole != null,
    },
    availableWorkspaces: input.availableWorkspaces,
    status: input.status,
    hierarchy: buildHierarchyPath({
      tenantId: organization?.id ?? null,
      workspaceId: input.workspace?.id ?? null,
      businessUnitId: input.businessUnitId ?? null,
    }),
    derivedFrom: "authenticated_membership",
  };
}

/** Narrow ids for repository queries — never take these from uncontrolled props. */
export function tenantScopeIds(ctx: TenantContext): {
  organizationId: string | null;
  workspaceId: string | null;
} {
  return {
    organizationId: ctx.organization?.id ?? ctx.tenant?.id ?? null,
    workspaceId: ctx.workspace?.id ?? null,
  };
}
