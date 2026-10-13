/**
 * Scoped permissions for V2 authorization (SRS §4.2).
 *
 * Launch workspace roles remain Owner / Admin / Contributor / Viewer / Facilitator.
 * Enterprise permission bundles add scoped capabilities without replacing those roles
 * or introducing hard-coded UI role checks.
 */

import type { WorkspaceRole } from "./roles";

export type ScopedPermission =
  "view" | "edit" | "submit" | "review" | "decide" | "export" | "admin";

export const SCOPED_PERMISSIONS: ScopedPermission[] = [
  "view",
  "edit",
  "submit",
  "review",
  "decide",
  "export",
  "admin",
];

/** Optional Enterprise bundles — additive permission sets, not new hard roles. */
export type PermissionBundleId =
  | "executive_reviewer"
  | "technical_reviewer"
  | "risk_reviewer"
  | "portfolio_manager"
  | "content_curator";

export const PERMISSION_BUNDLE_IDS: PermissionBundleId[] = [
  "executive_reviewer",
  "technical_reviewer",
  "risk_reviewer",
  "portfolio_manager",
  "content_curator",
];

export const PERMISSION_BUNDLE_LABEL: Record<PermissionBundleId, string> = {
  executive_reviewer: "Executive Reviewer",
  technical_reviewer: "Technical Reviewer",
  risk_reviewer: "Risk Reviewer",
  portfolio_manager: "Portfolio Manager",
  content_curator: "Content Curator",
};

/** Baseline capabilities granted by each launch workspace role. */
export const ROLE_SCOPED_PERMISSIONS: Record<WorkspaceRole, readonly ScopedPermission[]> = {
  viewer: ["view"],
  facilitator: ["view", "edit", "submit", "export"],
  contributor: ["view", "edit", "submit", "export"],
  admin: ["view", "edit", "submit", "review", "decide", "export", "admin"],
  owner: ["view", "edit", "submit", "review", "decide", "export", "admin"],
};

/**
 * Enterprise bundles. Reviewers get review (+ decide for executive);
 * managers get portfolio/content edit paths without full workspace admin.
 */
export const BUNDLE_SCOPED_PERMISSIONS: Record<PermissionBundleId, readonly ScopedPermission[]> = {
  executive_reviewer: ["view", "review", "decide", "export"],
  technical_reviewer: ["view", "review", "export"],
  risk_reviewer: ["view", "review", "export"],
  portfolio_manager: ["view", "edit", "submit", "review", "export"],
  content_curator: ["view", "edit", "submit", "review", "export"],
};

export type PermissionSubject = {
  workspaceRole: WorkspaceRole | null;
  /** Optional Enterprise bundles assigned to the member. */
  bundles?: readonly PermissionBundleId[] | null;
  isPlatformAdmin?: boolean;
};

export function permissionsForSubject(subject: PermissionSubject): Set<ScopedPermission> {
  const out = new Set<ScopedPermission>();
  if (subject.isPlatformAdmin) {
    for (const p of SCOPED_PERMISSIONS) out.add(p);
    return out;
  }
  if (subject.workspaceRole) {
    for (const p of ROLE_SCOPED_PERMISSIONS[subject.workspaceRole]) out.add(p);
  }
  for (const bundle of subject.bundles ?? []) {
    for (const p of BUNDLE_SCOPED_PERMISSIONS[bundle] ?? []) out.add(p);
  }
  return out;
}

export function hasScopedPermission(
  subject: PermissionSubject,
  permission: ScopedPermission,
): boolean {
  return permissionsForSubject(subject).has(permission);
}

export function assertScopedPermission(
  subject: PermissionSubject,
  permission: ScopedPermission,
): void {
  if (!hasScopedPermission(subject, permission)) {
    throw new Error(`Missing scoped permission: ${permission}`);
  }
}

/** Cross-tenant guard: a subject must have a workspace role for tenant-scoped work. */
export function assertSameTenantMembership(
  subject: PermissionSubject,
  resourceWorkspaceId: string | null | undefined,
  actorWorkspaceId: string | null | undefined,
): void {
  if (!resourceWorkspaceId || !actorWorkspaceId || resourceWorkspaceId !== actorWorkspaceId) {
    throw new Error("Cross-tenant access denied.");
  }
  if (!subject.workspaceRole && !subject.isPlatformAdmin) {
    throw new Error("Cross-tenant access denied: no workspace membership.");
  }
}
