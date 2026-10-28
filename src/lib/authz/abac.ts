/**
 * Attribute-based checks layered on RBAC (scoped permissions).
 *
 * Example (Phase 3): a Portfolio Manager may `decide` only when the use case
 * is in their business unit and estimated value is within their authority.
 *
 * UI visibility is never enough — call these from server functions after
 * `hasScopedPermission` / RLS.
 */

import {
  assertSameTenantMembership,
  hasScopedPermission,
  type PermissionSubject,
} from "./scoped-permissions";

export type AbacResource = {
  workspaceId: string | null | undefined;
  /** Business unit / org unit id the resource belongs to. */
  businessUnitId?: string | null;
  /** Estimated value in the same currency units as the subject's threshold. */
  estimatedValue?: number | null;
};

export type AbacSubject = PermissionSubject & {
  actorWorkspaceId: string | null | undefined;
  /** Business units the actor is authorized for (empty = none). */
  authorizedBusinessUnitIds?: readonly string[] | null;
  /** Max value the actor may approve; null/undefined = no value authority. */
  approvalValueLimit?: number | null;
};

export type AbacDecision =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Portfolio Manager (or any subject with `decide`) may approve only if:
 * 1. same workspace (tenant),
 * 2. has scoped `decide`,
 * 3. resource business unit ∈ actor's authorized units,
 * 4. estimated value ≤ actor's approval limit (when both present).
 */
export function canApproveUseCase(subject: AbacSubject, resource: AbacResource): AbacDecision {
  try {
    assertSameTenantMembership(subject, resource.workspaceId, subject.actorWorkspaceId);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Cross-tenant access denied." };
  }

  if (!hasScopedPermission(subject, "decide")) {
    return { ok: false, reason: "Missing scoped permission: decide" };
  }

  const units = subject.authorizedBusinessUnitIds ?? [];
  const unit = resource.businessUnitId ?? null;
  if (!unit || !units.includes(unit)) {
    return { ok: false, reason: "Business unit outside actor authority." };
  }

  const limit = subject.approvalValueLimit;
  const value = resource.estimatedValue;
  if (limit == null || Number.isNaN(limit)) {
    return { ok: false, reason: "No approval value limit configured." };
  }
  if (value == null || Number.isNaN(value)) {
    return { ok: false, reason: "Use case estimated value is required for approval." };
  }
  if (value > limit) {
    return { ok: false, reason: "Estimated value exceeds actor approval limit." };
  }

  return { ok: true };
}

export function assertCanApproveUseCase(subject: AbacSubject, resource: AbacResource): void {
  const d = canApproveUseCase(subject, resource);
  if (!d.ok) throw new Error(d.reason);
}
