/**
 * Apply a canonical lifecycle transition with permission + SoD checks.
 * Pure validation + audit payload; persistence stays with the caller.
 */

import { assertNotSelfReview } from "@/lib/submissions";
import {
  assertSameTenantMembership,
  hasScopedPermission,
  type PermissionSubject,
  type ScopedPermission,
} from "@/lib/authz/scoped-permissions";
import { assertTransition, MissingPermissionError, permissionForTransition } from "./transitions";
import type { CanonicalState } from "./states";
import { lifecycleTransitionAuditInput, permissionSensitiveAuditInput } from "./audit";
import type { AuditEventInput } from "@/lib/telemetry/events";
import {
  assertPilotAuthorizationReady,
  type SolutionDesignDraft,
} from "@/lib/solution-design/model";

export type ApplyLifecycleTransitionInput = {
  from: CanonicalState;
  to: CanonicalState;
  subject: PermissionSubject;
  /** Record owner / submitter — used for SoD on decide transitions. */
  subjectUserId?: string | null;
  actorUserId: string;
  entityType: string;
  entityId: string;
  workspaceId: string | null;
  actorWorkspaceId: string | null;
  organizationId?: string | null;
  rationale?: string | null;
  recordVersion?: string | number | null;
  /**
   * When transitioning to `approved_pilot`, pass the solution design so agentic
   * Pilot Authorization controls (action limits, checkpoints, kill switch) are enforced.
   */
  solutionDesign?: SolutionDesignDraft | null;
};

export type ApplyLifecycleTransitionResult = {
  from: CanonicalState;
  to: CanonicalState;
  requiredPermission: ScopedPermission;
  auditEvents: AuditEventInput[];
};

/**
 * Validate tenancy, permission, transition and (for decide) SoD.
 * Returns audit payloads the caller must persist after a successful update.
 * Throws on forbidden transition, missing permission, SoD, or cross-tenant access.
 */
export function prepareLifecycleTransition(
  input: ApplyLifecycleTransitionInput,
): ApplyLifecycleTransitionResult {
  assertSameTenantMembership(input.subject, input.workspaceId, input.actorWorkspaceId);

  const requiredPermission = permissionForTransition(input.from, input.to);
  const allowed = hasScopedPermission(input.subject, requiredPermission);

  const permissionAudit = permissionSensitiveAuditInput({
    entityType: input.entityType,
    entityId: input.entityId,
    action: `lifecycle.${input.from}->${input.to}`,
    permission: requiredPermission,
    allowed,
    workspaceId: input.workspaceId,
    organizationId: input.organizationId,
  });

  if (!allowed) {
    const err = new MissingPermissionError(requiredPermission, input.from, input.to);
    (err as Error & { auditEvents?: AuditEventInput[] }).auditEvents = [permissionAudit];
    throw err;
  }

  assertTransition(input.from, input.to, (p) => hasScopedPermission(input.subject, p));

  if (requiredPermission === "decide") {
    assertNotSelfReview(input.subjectUserId, input.actorUserId);
  }

  // FR-04 / SRS §14.4 — agentic Pilot Authorization needs confirmed controls.
  if (input.to === "approved_pilot" && input.solutionDesign) {
    assertPilotAuthorizationReady(input.solutionDesign);
  }

  return {
    from: input.from,
    to: input.to,
    requiredPermission,
    auditEvents: [
      permissionAudit,
      lifecycleTransitionAuditInput({
        entityType: input.entityType,
        entityId: input.entityId,
        from: input.from,
        to: input.to,
        requiredPermission,
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        rationale: input.rationale,
        recordVersion: input.recordVersion,
      }),
    ],
  };
}
