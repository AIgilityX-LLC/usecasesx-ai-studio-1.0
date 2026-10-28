/**
 * React entry point for TenantContext.
 *
 * Reuses `useWorkspaceContext` (membership-validated server resolve). UI must
 * read tenancy from here — never filter lists by a prop-supplied tenant_id.
 */

import { useMemo } from "react";
import { useWorkspaceContext, type WorkspaceContext } from "./useWorkspaceContext";
import {
  buildTenantContext,
  type TenantContext,
} from "@/lib/tenancy/tenant-context";

function toTenantContext(data: WorkspaceContext | undefined): TenantContext | null {
  if (!data) return null;
  // Server already returns Phase-4 fields when available; rebuild for a stable shape.
  if (
    data &&
    typeof data === "object" &&
    "derivedFrom" in data &&
    (data as { derivedFrom?: string }).derivedFrom === "authenticated_membership" &&
    "tenant" in data &&
    "hierarchy" in data
  ) {
    return data as unknown as TenantContext;
  }

  return buildTenantContext({
    userId: data.userId,
    organization: data.organization,
    workspace: data.workspace,
    orgRole: data.orgRole,
    workspaceRole: data.workspaceRole,
    orgStatus: data.orgStatus,
    planCode: data.entitlement?.planCode ?? null,
    expiresAt: data.entitlement?.expiresAt ?? null,
    availableWorkspaces: data.availableWorkspaces,
    status: data.status,
  });
}

/**
 * Central tenant context for signed-in surfaces.
 * Prefer this (or `useWorkspaceContext`) over reconstructing ownership per route.
 */
export function useTenantContext() {
  const workspace = useWorkspaceContext();
  const tenantContext = useMemo(
    () => toTenantContext(workspace.data),
    [workspace.data],
  );

  return {
    ...workspace,
    tenantContext,
    /** Convenience aliases */
    tenant: tenantContext?.tenant ?? null,
    hierarchy: tenantContext?.hierarchy ?? null,
    derivedFrom: tenantContext?.derivedFrom ?? null,
  };
}
