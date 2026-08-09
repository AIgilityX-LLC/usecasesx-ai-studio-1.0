/**
 * Caching policy for the client-side authz context query.
 *
 * Workspace provisioning (`ensure_user_workspace`, profile insert by the
 * `handle_new_user` trigger, membership row) can complete a moment *after* the
 * first authenticated render. A long, unconditional `staleTime` freezes the
 * mirrored subject in that half-provisioned state, so Pro users see lite/viewer
 * UI (no "New portfolio" control) until a hard reload.
 *
 * The rule is therefore: cache aggressively only once the subject is fully
 * resolved; poll while it is still provisional.
 */

export type AuthzSubjectShape = {
  workspaceId?: string | null;
  organizationId?: string | null;
  workspaceRole?: string | null;
  edition?: string | null;
} | null;

export type AuthzQueryPolicy = {
  /** True once tenancy is resolved and the subject can be trusted for gating. */
  resolved: boolean;
  /** ms before the cached subject is considered stale. */
  staleTime: number;
  /** ms between background refetches, or false when settled. */
  refetchInterval: number | false;
};

/** ms between polls while provisioning is still settling. */
export const AUTHZ_PROVISIONING_POLL_MS = 1_500;
/** ms the resolved subject may be trusted without a refetch. */
export const AUTHZ_RESOLVED_STALE_MS = 60_000;

/**
 * A subject is only "resolved" when it carries a workspace *and* a workspace
 * role: membership is what every editor entitlement (portfolio.manage,
 * roadmap.manage, …) is evaluated against, so a workspace without a role is
 * still mid-provisioning.
 */
export function isAuthzSubjectResolved(subject: AuthzSubjectShape): boolean {
  if (!subject) return false;
  return Boolean(subject.workspaceId) && Boolean(subject.workspaceRole);
}

export function authzQueryPolicy(subject: AuthzSubjectShape): AuthzQueryPolicy {
  const resolved = isAuthzSubjectResolved(subject);
  return {
    resolved,
    staleTime: resolved ? AUTHZ_RESOLVED_STALE_MS : 0,
    refetchInterval: resolved ? false : AUTHZ_PROVISIONING_POLL_MS,
  };
}
