/**
 * Safe default SovereigntyPolicy — platform SaaS baseline.
 * Prefer building customer packs by cloning + overriding, not forking evaluators.
 */

import type { SovereigntyPolicy } from "./policies";

export function defaultSovereigntyPolicy(organizationId: string): SovereigntyPolicy {
  return {
    version: 1,
    organizationId,
    deploymentProfileId: "cloud_saas",
    policyPackId: null,
    data: {
      permittedRegions: ["unspecified", "eu", "us", "me", "apac", "private", "airgap_reserved"],
      prohibitedRegions: [],
      residencyPreference: null,
      crossBorder: "unrestricted",
      defaultClassification: "internal",
      classificationsBoundToRegion: ["restricted"],
    },
    retention: {
      retentionDays: null,
      deletionGraceDays: 30,
      requireDeletionConfirmation: true,
      classificationOverrides: { restricted: 365 },
    },
    identity: {
      approvedIdentityProviders: ["email", "oidc", "saml"],
      customerSsoRequired: false,
      localAccountsRestricted: false,
      allowedEmailDomains: [],
    },
    ai: {
      permittedProviders: ["default"],
      prohibitedProviders: [],
      permittedModelRegions: ["unspecified", "eu", "us", "me", "apac"],
      promptsMayLeaveDeploymentRegion: true,
      customerDataMayBeUsedExternally: false,
      localPrivateModelOption: true,
    },
    storage: {
      permittedStorageProviders: ["supabase_storage", "default"],
      privateOnlyBuckets: true,
      tenantStorageNamespaceRequired: true,
      namespacePattern: "{organizationId}/{workspaceId}/",
    },
    encryption: {
      platformManagedKeys: true,
      customerManagedKeyCapability: false,
      byokCapability: false,
      keyManagementMode: "platform_managed",
    },
    administrators: {
      maxPrivilegedAdmins: 25,
      supportAccessLoggingRequired: true,
      breakGlass: {
        enabled: true,
        maxDurationHours: 72,
        requireReason: true,
        impersonationAllowed: false,
      },
    },
    audit: {
      requiredEvents: [
        "auth.login",
        "auth.sso",
        "support.grant",
        "support.revoke",
        "export.generate",
        "ai.assist",
        "policy.change",
        "tenant.delete",
      ],
      exportEnabled: true,
      retentionDays: 365,
      customerAccessEnabled: true,
    },
    exit: {
      completeCustomerExportEnabled: true,
      tenantDeletionEnabled: true,
      portabilityFormats: ["json", "csv", "pdf"],
      includeAuditAndEvidence: true,
    },
  };
}

/** Example regulated pack — still no statute hardcoding; just tighter tokens. */
export function regulatedBaselinePack(organizationId: string): SovereigntyPolicy {
  const base = defaultSovereigntyPolicy(organizationId);
  return {
    ...base,
    deploymentProfileId: "sovereign_cloud_vpc",
    policyPackId: "regulated_baseline_v1",
    data: {
      ...base.data,
      permittedRegions: ["eu", "private"],
      prohibitedRegions: [],
      residencyPreference: "eu",
      crossBorder: "permit_list_only",
      defaultClassification: "confidential",
      classificationsBoundToRegion: ["confidential", "restricted"],
    },
    identity: {
      approvedIdentityProviders: ["oidc", "saml"],
      customerSsoRequired: true,
      localAccountsRestricted: true,
      allowedEmailDomains: [],
    },
    ai: {
      permittedProviders: ["default", "local"],
      prohibitedProviders: [],
      permittedModelRegions: ["eu", "private"],
      promptsMayLeaveDeploymentRegion: false,
      customerDataMayBeUsedExternally: false,
      localPrivateModelOption: true,
    },
    encryption: {
      platformManagedKeys: true,
      customerManagedKeyCapability: true,
      byokCapability: false,
      keyManagementMode: "customer_managed",
    },
    administrators: {
      ...base.administrators,
      breakGlass: {
        enabled: true,
        maxDurationHours: 8,
        requireReason: true,
        impersonationAllowed: false,
      },
    },
  };
}
