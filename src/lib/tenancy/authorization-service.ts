/**
 * AuthorizationService — central “may this subject do X?” facade.
 *
 * Composes existing SoT modules; does not invent a second permission system.
 * UI may call this for honest gating; server functions must re-check.
 */

import {
  can,
  evaluate,
  evaluateAll,
  type AuthzDecision,
  type AuthzSubject,
} from "@/lib/authz/permission-service";
import type { EntitlementKey } from "@/lib/authz/catalogue";
import {
  hasScopedPermission,
  permissionsForSubject,
  type ScopedPermission,
  type ScopedSubject,
} from "@/lib/authz/scoped-permissions";
import { DomainError } from "@/lib/domain/errors";
import type { TenantContext } from "./tenant-context";
import { tenantScopeIds } from "./tenant-context";

export type AuthorizationServiceApi = {
  can: (subject: AuthzSubject, key: EntitlementKey) => boolean;
  evaluate: (subject: AuthzSubject, key: EntitlementKey) => AuthzDecision;
  evaluateAll: (subject: AuthzSubject) => Record<EntitlementKey, boolean>;
  hasScopedPermission: (subject: ScopedSubject, permission: ScopedPermission) => boolean;
  permissionsFor: (subject: ScopedSubject) => ReadonlySet<ScopedPermission>;
  /**
   * Defence in depth: row must share the membership-derived workspace or org.
   * RLS remains authoritative.
   */
  assertResourceInTenant: (
    resource: { workspace_id?: string | null; organization_id?: string | null } | null | undefined,
    ctx: TenantContext,
  ) => void;
  /** Same-tenant membership check for ABAC-style decide paths. */
  assertSameWorkspace: (actorWorkspaceId: string | null | undefined, resourceWorkspaceId: string) => void;
};

function assertResourceInTenant(
  resource: { workspace_id?: string | null; organization_id?: string | null } | null | undefined,
  ctx: TenantContext,
): void {
  if (!resource) throw new DomainError("not_found");
  if (ctx.derivedFrom !== "authenticated_membership") {
    throw new DomainError("forbidden", "Tenant context was not derived from identity.");
  }
  const scope = tenantScopeIds(ctx);
  const workspaceMatch =
    resource.workspace_id != null &&
    scope.workspaceId != null &&
    resource.workspace_id === scope.workspaceId;
  const orgMatch =
    resource.organization_id != null &&
    scope.organizationId != null &&
    resource.organization_id === scope.organizationId;
  if (!workspaceMatch && !orgMatch) throw new DomainError("forbidden");
}

function assertSameWorkspace(
  actorWorkspaceId: string | null | undefined,
  resourceWorkspaceId: string,
): void {
  if (!actorWorkspaceId || actorWorkspaceId !== resourceWorkspaceId) {
    throw new DomainError("forbidden", "Cross-tenant access denied.");
  }
}

/** Singleton facade — prefer importing this over ad-hoc authz calls in new code. */
export const AuthorizationService: AuthorizationServiceApi = {
  can,
  evaluate,
  evaluateAll,
  hasScopedPermission,
  permissionsFor: permissionsForSubject,
  assertResourceInTenant,
  assertSameWorkspace,
};
