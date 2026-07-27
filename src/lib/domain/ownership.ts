/**
 * Ownership guards shared by every domain service.
 *
 * RLS remains the security boundary; these helpers exist so components stop
 * re-implementing "am I signed in / is this mine" checks inline, and so the
 * failure is a predictable `DomainError` instead of a raw Postgres message.
 */

import { DomainError } from "./errors";

export function requireUserId(userId: string | null | undefined): string {
  if (!userId) throw new DomainError("unauthenticated");
  return userId;
}

/** Pure ownership check for a row that carries a `user_id`. */
export function assertOwned(
  row: { user_id?: string | null } | null | undefined,
  userId: string | null | undefined,
): void {
  if (!row) throw new DomainError("not_found");
  const uid = requireUserId(userId);
  if (row.user_id !== uid) throw new DomainError("forbidden");
}

/** Ownership check for tenant-scoped rows (workspace/organization aware). */
export function assertInWorkspace(
  row: { workspace_id?: string | null; organization_id?: string | null } | null | undefined,
  context: { workspaceId?: string | null; organizationId?: string | null },
): void {
  if (!row) throw new DomainError("not_found");
  const workspaceMatch =
    row.workspace_id != null && context.workspaceId != null && row.workspace_id === context.workspaceId;
  const orgMatch =
    row.organization_id != null &&
    context.organizationId != null &&
    row.organization_id === context.organizationId;
  if (!workspaceMatch && !orgMatch) throw new DomainError("forbidden");
}
