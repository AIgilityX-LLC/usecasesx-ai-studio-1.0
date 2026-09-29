/**
 * Lifecycle transition audit helper (pure payload builders + event names).
 * Persist via telemetry recorders — never write DB from this module.
 */

import { AUDIT_EVENTS, type AuditEventInput } from "@/lib/telemetry/events";
import type { ScopedPermission } from "@/lib/authz/scoped-permissions";
import type { CanonicalState } from "./states";

export type LifecycleTransitionAudit = {
  entityType: string;
  entityId: string;
  from: CanonicalState;
  to: CanonicalState;
  requiredPermission: ScopedPermission;
  workspaceId?: string | null;
  organizationId?: string | null;
  rationale?: string | null;
  recordVersion?: string | number | null;
};

export function lifecycleTransitionAuditInput(input: LifecycleTransitionAudit): AuditEventInput {
  return {
    event: AUDIT_EVENTS.lifecycleTransitioned,
    entity: { type: input.entityType, id: input.entityId },
    previous: { status: input.from },
    next: {
      status: input.to,
      requiredPermission: input.requiredPermission,
      rationale: input.rationale ?? null,
      recordVersion: input.recordVersion ?? null,
    },
    severity: "notice",
    source: "lifecycle",
    workspaceId: input.workspaceId,
    organizationId: input.organizationId,
  };
}

export type PermissionSensitiveAudit = {
  entityType: string;
  entityId?: string | null;
  action: string;
  permission: ScopedPermission;
  allowed: boolean;
  workspaceId?: string | null;
  organizationId?: string | null;
};

export function permissionSensitiveAuditInput(input: PermissionSensitiveAudit): AuditEventInput {
  return {
    event: input.allowed ? AUDIT_EVENTS.permissionGranted : AUDIT_EVENTS.permissionDenied,
    entity: { type: input.entityType, id: input.entityId ?? null },
    next: {
      action: input.action,
      permission: input.permission,
      allowed: input.allowed,
    },
    severity: input.allowed ? "info" : "warning",
    source: "authz",
    workspaceId: input.workspaceId,
    organizationId: input.organizationId,
  };
}
