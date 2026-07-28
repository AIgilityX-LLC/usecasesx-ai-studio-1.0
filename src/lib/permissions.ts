import { useRoles, type AppRole } from "@/lib/usecasex.roles";

/**
 * Simple 3-tier permission model layered on top of the existing 9-role
 * taxonomy. Tiers are derived from the underlying app_role list so this stays
 * a pure code/UI layer — no migration of existing assignments needed.
 *
 *   admin   → full control (create/edit/delete anywhere, admin panel)
 *   editor  → can create + edit content (own + workspace), cannot hard-delete
 *   user    → can save / view, create own boards & portfolios, cannot edit
 *             shared/published content
 */
export type PermissionTier = "admin" | "editor" | "user";

const ADMIN_ROLES: AppRole[] = ["admin", "super_admin", "ai_hub_admin", "usecasex_admin"];
const EDITOR_ROLES: AppRole[] = [
  "editor",
  "moderator",
  "content_manager",
  "reviewer",
  "contributor",
];

export function tierFromRoles(roles: AppRole[]): PermissionTier {
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return "admin";
  if (roles.some((r) => EDITOR_ROLES.includes(r))) return "editor";
  return "user";
}

/** Action verbs the UI cares about — keep aligned with the nav-map doc. */
export type PermissionAction =
  // Repository (global published catalogue)
  | "repo.view"
  | "repo.save" // shortlist / add to "My Use Cases"
  | "repo.create" // submit a new pattern to the global repo
  | "repo.edit" // edit published patterns
  | "repo.delete" // hard-delete a pattern
  // Dashboard (Pro)
  | "dashboard.view"
  | "dashboard.export"
  // Saved Use Cases / My Use Cases
  | "saved.view"
  | "saved.create"
  | "saved.edit"
  | "saved.delete"
  // Boards
  | "boards.view"
  | "boards.create"
  | "boards.edit"
  | "boards.delete"
  | "boards.addItem"
  | "boards.removeItem"
  // Admin surface
  | "admin.taxonomy"
  | "admin.users";

const MATRIX: Record<PermissionAction, PermissionTier[]> = {
  "repo.view": ["admin", "editor", "user"],
  "repo.save": ["admin", "editor", "user"],
  "repo.create": ["admin", "editor"],
  "repo.edit": ["admin", "editor"],
  "repo.delete": ["admin"],

  "dashboard.view": ["admin", "editor", "user"],
  "dashboard.export": ["admin", "editor", "user"],

  "saved.view": ["admin", "editor", "user"],
  "saved.create": ["admin", "editor", "user"],
  "saved.edit": ["admin", "editor", "user"], // own rows (RLS-enforced)
  "saved.delete": ["admin", "editor", "user"], // own rows (RLS-enforced)

  "boards.view": ["admin", "editor", "user"],
  "boards.create": ["admin", "editor", "user"],
  "boards.edit": ["admin", "editor"],
  "boards.delete": ["admin", "editor"],
  "boards.addItem": ["admin", "editor", "user"],
  "boards.removeItem": ["admin", "editor"],

  "admin.taxonomy": ["admin"],
  "admin.users": ["admin"],
};

export function can(tier: PermissionTier, action: PermissionAction): boolean {
  return MATRIX[action]?.includes(tier) ?? false;
}

/** React hook — single entry point for UI gating. */
export function usePermissions() {
  const { loading, userId, roles } = useRoles();
  const tier = tierFromRoles(roles);
  return {
    loading,
    userId,
    roles,
    tier,
    isAdmin: tier === "admin",
    isEditor: tier === "editor",
    isUser: tier === "user",
    can: (action: PermissionAction) => userId != null && can(tier, action),
  };
}
