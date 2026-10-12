/**
 * Pure helpers for picking the active organization/workspace context.
 * Safe to import from client and tests — no server I/O.
 */

export type WorkspaceMembershipOption = {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string | null;
  role: string | null;
  /** Organization membership status for this user (`active`, `suspended`, …). */
  orgStatus: string;
};

export type WorkspaceContextStatus =
  | "ready"
  | "no_workspace"
  | "suspended"
  | "forbidden";

export const ACTIVE_WORKSPACE_STORAGE_PREFIX = "usecasesx.active_workspace.";
export const ACTIVE_WORKSPACE_COOKIE = "usecasesx_workspace";

export function activeWorkspaceStorageKey(userId: string): string {
  return `${ACTIVE_WORKSPACE_STORAGE_PREFIX}${userId}`;
}

export function isOrgMembershipActive(status: string | null | undefined): boolean {
  return (status ?? "active") === "active";
}

/**
 * Choose the active workspace from memberships + optional preference.
 * Suspended org memberships are never selected; preferred id must be a member.
 */
export function pickActiveWorkspace(
  available: readonly WorkspaceMembershipOption[],
  preferredId: string | null | undefined,
  provisionedId: string | null | undefined,
): {
  active: WorkspaceMembershipOption | null;
  status: WorkspaceContextStatus;
  selectable: WorkspaceMembershipOption[];
} {
  const selectable = available.filter((w) => isOrgMembershipActive(w.orgStatus));
  const suspendedOnly = available.length > 0 && selectable.length === 0;

  if (selectable.length === 0) {
    return {
      active: null,
      status: suspendedOnly ? "suspended" : "no_workspace",
      selectable,
    };
  }

  const byId = (id: string | null | undefined) =>
    id ? (selectable.find((w) => w.id === id) ?? null) : null;

  const active =
    byId(preferredId) ?? byId(provisionedId) ?? selectable[0] ?? null;

  return {
    active,
    status: active ? "ready" : "no_workspace",
    selectable,
  };
}

export function readStoredWorkspaceId(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(activeWorkspaceStorageKey(userId));
    if (raw && /^[0-9a-f-]{36}$/i.test(raw)) return raw;
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${ACTIVE_WORKSPACE_COOKIE}=([^;]*)`),
    );
    const v = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (v && /^[0-9a-f-]{36}$/i.test(v)) return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function persistActiveWorkspaceId(userId: string, workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(activeWorkspaceStorageKey(userId), workspaceId);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${encodeURIComponent(workspaceId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function clearActiveWorkspaceId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(activeWorkspaceStorageKey(userId));
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}
