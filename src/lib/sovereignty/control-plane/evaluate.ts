/**
 * Sovereignty policy evaluation service.
 *
 * Single place for allow/deny decisions. UI and server handlers call this
 * instead of scattering residency / AI / export conditionals.
 *
 * Never interprets jurisdiction-specific law — only configured policy tokens.
 */

import type {
  AdministratorAccessPolicy,
  AIProviderPolicy,
  DataResidencyPolicy,
  EncryptionPolicy,
  ExportPolicy,
  IdentitySovereigntyPolicy,
  RetentionPolicy,
  SovereigntyPolicy,
  StorageSovereigntyPolicy,
  AuditSovereigntyPolicy,
} from "./policies";
import type { DataClassification, PolicyDecision, RegionCode } from "./vocabulary";
import { allow, deny } from "./vocabulary";
import { defaultSovereigntyPolicy } from "./defaults";

export type DataPlacementRequest = {
  region: RegionCode;
  classification?: DataClassification;
  /** Target region for a cross-border transfer (optional). */
  transferTo?: RegionCode;
};

export type AiInvocationRequest = {
  provider: string;
  modelRegion?: RegionCode;
  deploymentRegion?: RegionCode;
  promptLeavesRegion?: boolean;
  usesCustomerDataExternally?: boolean;
  localPrivateModel?: boolean;
};

export type IdentityAuthRequest = {
  provider: string;
  localAccount?: boolean;
  emailDomain?: string | null;
};

export type StorageWriteRequest = {
  provider: string;
  bucketPrivate?: boolean;
  namespace?: string | null;
  organizationId: string;
  workspaceId?: string | null;
};

export type EncryptionModeRequest = {
  requestedMode: EncryptionPolicy["keyManagementMode"];
};

export type AdminAccessRequest = {
  kind: "support_grant" | "break_glass";
  durationHours: number;
  reasonProvided: boolean;
  impersonationRequested?: boolean;
};

export type AuditExportRequest = {
  eventType: string;
};

export type ExitRequest = {
  kind: "complete_export" | "tenant_deletion" | "portability";
  format?: string;
};

export type EvaluationSubject =
  | { type: "data_placement"; request: DataPlacementRequest }
  | { type: "ai_invocation"; request: AiInvocationRequest }
  | { type: "identity_auth"; request: IdentityAuthRequest }
  | { type: "storage_write"; request: StorageWriteRequest }
  | { type: "encryption_mode"; request: EncryptionModeRequest }
  | { type: "admin_access"; request: AdminAccessRequest }
  | { type: "audit_event"; request: AuditExportRequest }
  | { type: "exit"; request: ExitRequest };

function normalize(token: string): string {
  return token.trim().toLowerCase();
}

function regionDenied(policy: DataResidencyPolicy, region: RegionCode): PolicyDecision | null {
  const r = normalize(region);
  if (policy.prohibitedRegions.map(normalize).includes(r)) {
    return deny("data.prohibited_regions", "region_prohibited", { region });
  }
  if (
    policy.permittedRegions.length > 0 &&
    !policy.permittedRegions.map(normalize).includes(r)
  ) {
    return deny("data.permitted_regions", "region_not_permitted", { region });
  }
  return null;
}

export function evaluateDataPlacement(
  policy: DataResidencyPolicy,
  request: DataPlacementRequest,
): PolicyDecision {
  const denied = regionDenied(policy, request.region);
  if (denied) return denied;

  if (request.transferTo) {
    const targetDenied = regionDenied(policy, request.transferTo);
    if (targetDenied) {
      return deny("data.cross_border", targetDenied.reason, {
        from: request.region,
        to: request.transferTo,
      });
    }
    const mode = policy.crossBorder;
    if (mode === "deny_by_default" && normalize(request.transferTo) !== normalize(request.region)) {
      return deny("data.cross_border", "cross_border_deny_by_default", {
        from: request.region,
        to: request.transferTo,
      });
    }
    if (mode === "permit_list_only") {
      const ok = policy.permittedRegions.map(normalize).includes(normalize(request.transferTo));
      if (!ok) {
        return deny("data.cross_border", "cross_border_not_on_permit_list", {
          to: request.transferTo,
        });
      }
    }
    if (
      mode === "deny_prohibited" &&
      policy.prohibitedRegions.map(normalize).includes(normalize(request.transferTo))
    ) {
      return deny("data.cross_border", "cross_border_target_prohibited", {
        to: request.transferTo,
      });
    }
  }

  const classification = request.classification ?? policy.defaultClassification;
  if (
    request.transferTo &&
    normalize(request.transferTo) !== normalize(request.region) &&
    policy.classificationsBoundToRegion.includes(classification)
  ) {
    return deny("data.classification_bound", "classification_must_stay_in_region", {
      classification,
    });
  }

  return allow("data.placement", "data_placement_allowed", {
    region: request.region,
    classification,
  });
}

export function evaluateAiInvocation(
  policy: AIProviderPolicy,
  request: AiInvocationRequest,
): PolicyDecision {
  const provider = normalize(request.provider);
  if (policy.prohibitedProviders.map(normalize).includes(provider)) {
    return deny("ai.prohibited_providers", "ai_provider_prohibited", { provider: request.provider });
  }
  if (
    policy.permittedProviders.length > 0 &&
    !policy.permittedProviders.map(normalize).includes(provider)
  ) {
    return deny("ai.permitted_providers", "ai_provider_not_permitted", {
      provider: request.provider,
    });
  }
  if (request.localPrivateModel && !policy.localPrivateModelOption) {
    return deny("ai.local_private", "local_private_model_disabled");
  }
  if (request.modelRegion) {
    const mr = normalize(request.modelRegion);
    if (
      policy.permittedModelRegions.length > 0 &&
      !policy.permittedModelRegions.map(normalize).includes(mr)
    ) {
      return deny("ai.model_regions", "model_region_not_permitted", {
        modelRegion: request.modelRegion,
      });
    }
  }
  if (
    request.promptLeavesRegion &&
    !policy.promptsMayLeaveDeploymentRegion
  ) {
    return deny("ai.prompt_residency", "prompts_may_not_leave_deployment_region");
  }
  if (request.usesCustomerDataExternally && !policy.customerDataMayBeUsedExternally) {
    return deny("ai.external_use", "customer_data_external_use_denied");
  }
  return allow("ai.invocation", "ai_invocation_allowed", { provider: request.provider });
}

export function evaluateIdentityAuth(
  policy: IdentitySovereigntyPolicy,
  request: IdentityAuthRequest,
): PolicyDecision {
  const provider = normalize(request.provider);
  if (
    policy.approvedIdentityProviders.length > 0 &&
    !policy.approvedIdentityProviders.map(normalize).includes(provider)
  ) {
    return deny("identity.approved_providers", "identity_provider_not_approved", {
      provider: request.provider,
    });
  }
  if (request.localAccount && policy.localAccountsRestricted) {
    return deny("identity.local_accounts", "local_accounts_restricted");
  }
  if (policy.customerSsoRequired && !["oidc", "saml"].includes(provider)) {
    return deny("identity.customer_sso", "customer_sso_required");
  }
  if (
    request.emailDomain &&
    policy.allowedEmailDomains.length > 0 &&
    !policy.allowedEmailDomains.map(normalize).includes(normalize(request.emailDomain))
  ) {
    return deny("identity.email_domain", "email_domain_not_allowed", {
      domain: request.emailDomain,
    });
  }
  return allow("identity.auth", "identity_auth_allowed");
}

export function evaluateStorageWrite(
  policy: StorageSovereigntyPolicy,
  request: StorageWriteRequest,
): PolicyDecision {
  const provider = normalize(request.provider);
  if (
    policy.permittedStorageProviders.length > 0 &&
    !policy.permittedStorageProviders.map(normalize).includes(provider)
  ) {
    return deny("storage.providers", "storage_provider_not_permitted", {
      provider: request.provider,
    });
  }
  if (policy.privateOnlyBuckets && request.bucketPrivate === false) {
    return deny("storage.private_only", "public_buckets_denied");
  }
  if (policy.tenantStorageNamespaceRequired) {
    if (!request.namespace) {
      return deny("storage.namespace", "tenant_namespace_required");
    }
    if (!request.namespace.includes(request.organizationId)) {
      return deny("storage.namespace", "namespace_must_include_organization", {
        organizationId: request.organizationId,
      });
    }
  }
  return allow("storage.write", "storage_write_allowed");
}

export function evaluateEncryptionMode(
  policy: EncryptionPolicy,
  request: EncryptionModeRequest,
): PolicyDecision {
  const mode = request.requestedMode;
  if (mode === "platform_managed" && !policy.platformManagedKeys) {
    return deny("encryption.platform", "platform_managed_keys_disabled");
  }
  if (mode === "customer_managed" && !policy.customerManagedKeyCapability) {
    return deny("encryption.cmk", "customer_managed_keys_not_enabled");
  }
  if (mode === "byok_reserved" && !policy.byokCapability) {
    return deny("encryption.byok", "byok_capability_reserved_not_live");
  }
  return allow("encryption.mode", "encryption_mode_allowed", { mode });
}

export function evaluateAdminAccess(
  policy: AdministratorAccessPolicy,
  request: AdminAccessRequest,
): PolicyDecision {
  if (!policy.supportAccessLoggingRequired && request.kind === "support_grant") {
    // Logging required is a config flag — if false, still allow but note.
    // When true, caller must persist logs; evaluator only checks grant shape.
  }
  if (request.kind === "break_glass" && !policy.breakGlass.enabled) {
    return deny("operations.break_glass", "break_glass_disabled");
  }
  const maxHours =
    request.kind === "break_glass"
      ? policy.breakGlass.maxDurationHours
      : policy.breakGlass.maxDurationHours;
  if (request.durationHours > maxHours) {
    return deny("operations.duration", "privileged_access_duration_exceeded", {
      durationHours: request.durationHours,
      maxHours,
    });
  }
  if (policy.breakGlass.requireReason && !request.reasonProvided) {
    return deny("operations.reason", "privileged_access_reason_required");
  }
  if (request.impersonationRequested && !policy.breakGlass.impersonationAllowed) {
    return deny("operations.impersonation", "impersonation_prohibited");
  }
  if (policy.supportAccessLoggingRequired) {
    return allow("operations.admin_access", "admin_access_allowed_logging_required", {
      kind: request.kind,
    });
  }
  return allow("operations.admin_access", "admin_access_allowed", { kind: request.kind });
}

export function evaluateRetentionDays(
  policy: RetentionPolicy,
  classification: DataClassification,
  requestedDays: number,
): PolicyDecision {
  const min =
    policy.classificationOverrides[classification] ?? policy.retentionDays ?? 0;
  if (policy.retentionDays != null && requestedDays < policy.retentionDays) {
    return deny("retention.minimum", "retention_below_policy_minimum", {
      requestedDays,
      minimumDays: policy.retentionDays,
    });
  }
  if (requestedDays < min) {
    return deny("retention.classification", "retention_below_classification_override", {
      requestedDays,
      minimumDays: min,
      classification,
    });
  }
  return allow("retention.days", "retention_allowed", { requestedDays });
}

export function evaluateAuditEvent(
  policy: AuditSovereigntyPolicy,
  request: AuditExportRequest,
): PolicyDecision {
  if (policy.requiredEvents.map(normalize).includes(normalize(request.eventType))) {
    return allow("audit.required_event", "audit_event_required", {
      eventType: request.eventType,
    });
  }
  return allow("audit.event", "audit_event_optional", { eventType: request.eventType });
}

export function evaluateExit(policy: ExportPolicy, request: ExitRequest): PolicyDecision {
  if (request.kind === "complete_export" && !policy.completeCustomerExportEnabled) {
    return deny("exit.export", "complete_customer_export_disabled");
  }
  if (request.kind === "tenant_deletion" && !policy.tenantDeletionEnabled) {
    return deny("exit.deletion", "tenant_deletion_disabled");
  }
  if (request.kind === "portability") {
    if (!policy.completeCustomerExportEnabled) {
      return deny("exit.portability", "portability_disabled");
    }
    if (
      request.format &&
      policy.portabilityFormats.length > 0 &&
      !policy.portabilityFormats.map(normalize).includes(normalize(request.format))
    ) {
      return deny("exit.format", "portability_format_not_permitted", {
        format: request.format,
      });
    }
  }
  return allow("exit.action", "exit_action_allowed", { kind: request.kind });
}

export function evaluateSovereignty(
  policy: SovereigntyPolicy,
  subject: EvaluationSubject,
): PolicyDecision {
  switch (subject.type) {
    case "data_placement":
      return evaluateDataPlacement(policy.data, subject.request);
    case "ai_invocation":
      return evaluateAiInvocation(policy.ai, subject.request);
    case "identity_auth":
      return evaluateIdentityAuth(policy.identity, subject.request);
    case "storage_write":
      return evaluateStorageWrite(policy.storage, subject.request);
    case "encryption_mode":
      return evaluateEncryptionMode(policy.encryption, subject.request);
    case "admin_access":
      return evaluateAdminAccess(policy.administrators, subject.request);
    case "audit_event":
      return evaluateAuditEvent(policy.audit, subject.request);
    case "exit":
      return evaluateExit(policy.exit, subject.request);
  }
}

/**
 * Bridge from legacy V2-18 tenant policy fields into a SovereigntyPolicy overlay.
 * Keeps one evaluation path while older rows still store region + AI routes only.
 */
export function overlayLegacyTenantPolicy(
  base: SovereigntyPolicy,
  legacy: {
    dataRegion?: string | null;
    allowedAiProviderRoutes?: string[] | null;
  },
): SovereigntyPolicy {
  const next: SovereigntyPolicy = {
    ...base,
    data: { ...base.data },
    ai: { ...base.ai },
  };
  if (legacy.dataRegion) {
    next.data.residencyPreference = legacy.dataRegion;
    if (!next.data.permittedRegions.map(normalize).includes(normalize(legacy.dataRegion))) {
      next.data.permittedRegions = [...next.data.permittedRegions, legacy.dataRegion];
    }
  }
  if (legacy.allowedAiProviderRoutes && legacy.allowedAiProviderRoutes.length > 0) {
    next.ai.permittedProviders = [...legacy.allowedAiProviderRoutes];
  }
  return next;
}

export type SovereigntyControlPlaneApi = {
  evaluate: typeof evaluateSovereignty;
  evaluateDataPlacement: typeof evaluateDataPlacement;
  evaluateAiInvocation: typeof evaluateAiInvocation;
  evaluateIdentityAuth: typeof evaluateIdentityAuth;
  evaluateStorageWrite: typeof evaluateStorageWrite;
  evaluateEncryptionMode: typeof evaluateEncryptionMode;
  evaluateAdminAccess: typeof evaluateAdminAccess;
  evaluateRetentionDays: typeof evaluateRetentionDays;
  evaluateAuditEvent: typeof evaluateAuditEvent;
  evaluateExit: typeof evaluateExit;
  defaultPolicy: typeof defaultSovereigntyPolicy;
  overlayLegacy: typeof overlayLegacyTenantPolicy;
  isAllowed: (decision: PolicyDecision) => boolean;
};

export const SovereigntyControlPlane: SovereigntyControlPlaneApi = {
  evaluate: evaluateSovereignty,
  evaluateDataPlacement,
  evaluateAiInvocation,
  evaluateIdentityAuth,
  evaluateStorageWrite,
  evaluateEncryptionMode,
  evaluateAdminAccess,
  evaluateRetentionDays,
  evaluateAuditEvent,
  evaluateExit,
  defaultPolicy: defaultSovereigntyPolicy,
  overlayLegacy: overlayLegacyTenantPolicy,
  isAllowed: (d) => d.effect === "allow",
};
