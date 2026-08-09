/**
 * Platform administration authorization.
 *
 * Platform admin governs GLOBAL repository content and taxonomy. It is
 * deliberately separate from workspace administration (`workspace_can_manage`,
 * `useEntitlement`, `usePlan`), which only governs tenant-owned data.
 * A workspace owner is NOT a platform admin, and a platform admin gets no
 * extra rights inside somebody else's workspace.
 *
 * Keep these lists aligned with the RLS policies on `public.use_cases` and the
 * `taxonomy_*` tables.
 */

import { useRoles, type AppRole } from "@/lib/usecasex.roles";

/** Roles allowed to open the platform admin CMS (read + author drafts). */
export const PLATFORM_ADMIN_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "super_admin",
  "ai_hub_admin",
  "usecasex_admin",
  "content_manager",
  "reviewer",
];

/** Roles allowed to publish / unpublish / archive global content. */
export const PLATFORM_PUBLISHER_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "super_admin",
  "ai_hub_admin",
  "usecasex_admin",
];

/** Roles allowed to mutate global taxonomy reference data. */
export const PLATFORM_TAXONOMY_ROLES: AppRole[] = PLATFORM_PUBLISHER_ROLES;

/** Roles allowed to run a bulk CSV import into the global catalogue. */
export const PLATFORM_IMPORT_ROLES: AppRole[] = PLATFORM_PUBLISHER_ROLES;

export interface PlatformAdminState {
  loading: boolean;
  userId: string | null;
  roles: AppRole[];
  /** Can open the platform admin CMS at all. */
  isPlatformAdmin: boolean;
  /** Can publish, unpublish, archive or feature global content. */
  canPublishGlobal: boolean;
  /** Can create, rename or retire taxonomy reference rows. */
  canEditTaxonomy: boolean;
  /** Can run validated CSV imports. */
  canImport: boolean;
}

export function usePlatformAdmin(): PlatformAdminState {
  const { loading, userId, roles, hasAny } = useRoles();
  return {
    loading,
    userId,
    roles,
    isPlatformAdmin: hasAny(PLATFORM_ADMIN_ROLES),
    canPublishGlobal: hasAny(PLATFORM_PUBLISHER_ROLES),
    canEditTaxonomy: hasAny(PLATFORM_TAXONOMY_ROLES),
    canImport: hasAny(PLATFORM_IMPORT_ROLES),
  };
}
