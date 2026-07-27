/**
 * Launch role model: Workspace Owner, Admin, Contributor, Viewer, Facilitator.
 * Pure module — mapping only, no data access.
 */

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "contributor"
  | "facilitator"
  | "viewer";

export const WORKSPACE_ROLES: WorkspaceRole[] = [
  "owner",
  "admin",
  "contributor",
  "facilitator",
  "viewer",
];

export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Workspace Owner",
  admin: "Workspace Admin",
  contributor: "Contributor",
  facilitator: "Facilitator",
  viewer: "Viewer",
};

/**
 * Seniority ranking used only for "at least" comparisons. Facilitator is a
 * peer of Contributor for editing, but carries workshop rights Contributor
 * does not — capability differences live in the entitlement catalogue, not here.
 */
export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  facilitator: 1,
  contributor: 1,
  admin: 2,
  owner: 3,
};

/** Legacy/free-text role strings that may exist on membership rows. */
const ROLE_ALIASES: Record<string, WorkspaceRole> = {
  owner: "owner",
  org_owner: "owner",
  workspace_owner: "owner",
  admin: "admin",
  workspace_admin: "admin",
  manager: "admin",
  contributor: "contributor",
  editor: "contributor",
  member: "contributor",
  facilitator: "facilitator",
  workshop_facilitator: "facilitator",
  viewer: "viewer",
  reader: "viewer",
  guest: "viewer",
};

export function normalizeWorkspaceRole(
  value: string | null | undefined,
): WorkspaceRole | null {
  if (!value) return null;
  return ROLE_ALIASES[value.trim().toLowerCase()] ?? null;
}

/**
 * Resolve the effective workspace role from the workspace membership row,
 * falling back to the organization membership role.
 */
export function resolveWorkspaceRole(
  workspaceRole: string | null | undefined,
  orgRole: string | null | undefined,
): WorkspaceRole | null {
  return (
    normalizeWorkspaceRole(workspaceRole) ?? normalizeWorkspaceRole(orgRole)
  );
}

export function roleAtLeast(
  role: WorkspaceRole | null,
  minimum: WorkspaceRole,
): boolean {
  if (!role) return false;
  return WORKSPACE_ROLE_RANK[role] >= WORKSPACE_ROLE_RANK[minimum];
}

/** Platform (`user_roles`) roles that bypass edition gating for staff operations. */
export const PLATFORM_ADMIN_ROLES = [
  "admin",
  "super_admin",
  "ai_hub_admin",
  "usecasex_admin",
] as const;

export function isPlatformAdminRole(role: string): boolean {
  return (PLATFORM_ADMIN_ROLES as readonly string[]).includes(role);
}
