import type { ReactNode } from "react";
import { usePermissions } from "@/lib/permissions";
import type { PermissionAction } from "@/lib/permissions";

/**
 * Declarative permission gate for UI affordances.
 *
 *   <Can action="boards.delete"><DeleteButton /></Can>
 *   <Can action="repo.edit" fallback={<LockedHint />}>...</Can>
 */
export function Can({
  action,
  children,
  fallback = null,
}: {
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { loading, can } = usePermissions();
  if (loading) return null;
  return <>{can(action) ? children : fallback}</>;
}
