/**
 * Tenant scoping helpers for domain/services — not for random UI components.
 *
 * Components should read TenantContext (or useWorkspaceContext) once and pass
 * resolved ids into hooks/services. Filtering by a prop-supplied tenant_id in
 * JSX is prohibited.
 */

import { DomainError } from "@/lib/domain/errors";
import type { TenantContext } from "./tenant-context";
import { tenantScopeIds } from "./tenant-context";

export type TenantScope = {
  organizationId: string;
  workspaceId: string;
};

/**
 * Require a ready membership-derived scope for writes / scoped reads.
 * Throws DomainError when the caller has no active tenant context.
 */
export function requireTenantScope(ctx: TenantContext): TenantScope {
  if (ctx.derivedFrom !== "authenticated_membership") {
    throw new DomainError("forbidden", "Tenant context was not derived from identity.");
  }
  if (ctx.status !== "ready") {
    throw new DomainError(
      "forbidden",
      ctx.status === "suspended"
        ? "This organization membership is suspended."
        : "No active workspace is available.",
    );
  }
  const { organizationId, workspaceId } = tenantScopeIds(ctx);
  if (!organizationId || !workspaceId) {
    throw new DomainError("forbidden", "No active tenant scope.");
  }
  return { organizationId, workspaceId };
}

/** Apply membership-derived workspace filter to an already RLS-scoped list. */
export function filterByActiveWorkspace<T extends { workspace_id?: string | null }>(
  rows: readonly T[],
  ctx: TenantContext,
): T[] {
  const { workspaceId } = tenantScopeIds(ctx);
  if (!workspaceId) return [];
  return rows.filter((r) => r.workspace_id === workspaceId);
}

/**
 * Guard for server handlers: ignore any client-provided organization/tenant id
 * and use the membership-derived scope exclusively.
 */
export function ignoreClientTenantId<T extends Record<string, unknown>>(
  body: T,
): Omit<T, "tenant_id" | "tenantId" | "organization_id" | "organizationId"> & {
  /** Stripped — never use as authority. */
  _clientTenantIdIgnored?: true;
} {
  const {
    tenant_id: _a,
    tenantId: _b,
    organization_id: _c,
    organizationId: _d,
    ...rest
  } = body as T & {
    tenant_id?: unknown;
    tenantId?: unknown;
    organization_id?: unknown;
    organizationId?: unknown;
  };
  return { ...rest, _clientTenantIdIgnored: true };
}
