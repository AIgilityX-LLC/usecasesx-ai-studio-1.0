/**
 * Configurable sovereignty policy types.
 *
 * Aggregate: SovereigntyPolicy. Domain slices are evaluated by the control
 * plane — do not re-implement these checks in UI components.
 */

import type {
  CrossBorderMode,
  DataClassification,
  KeyManagementMode,
  RegionCode,
} from "./vocabulary";

/** DATA — residency, transfer, classification. */
export type DataResidencyPolicy = {
  permittedRegions: RegionCode[];
  prohibitedRegions: RegionCode[];
  /** Preferred processing / storage region (soft). */
  residencyPreference: RegionCode | null;
  crossBorder: CrossBorderMode;
  /** Minimum classification for assets covered by this policy. */
  defaultClassification: DataClassification;
  /** Classifications that must not leave the deployment region. */
  classificationsBoundToRegion: DataClassification[];
};

/** DATA — retention & deletion (durations are opaque ISO-8601 durations or day counts). */
export type RetentionPolicy = {
  /** Default retention in days; null = use platform default. */
  retentionDays: number | null;
  /** Soft-delete grace before hard delete (days). */
  deletionGraceDays: number;
  /** Require explicit customer confirmation for tenant wipe. */
  requireDeletionConfirmation: boolean;
  /** Classifications with extended retention (days). */
  classificationOverrides: Partial<Record<DataClassification, number>>;
};

/** IDENTITY */
export type IdentitySovereigntyPolicy = {
  /** Approved IdP protocol/provider slugs (e.g. oidc, saml, local). */
  approvedIdentityProviders: string[];
  customerSsoRequired: boolean;
  /** When true, password/local accounts are blocked for workforce users. */
  localAccountsRestricted: boolean;
  /** Email domains allowed to authenticate (empty = no domain filter here). */
  allowedEmailDomains: string[];
};

/** AI */
export type AIProviderPolicy = {
  permittedProviders: string[];
  prohibitedProviders: string[];
  permittedModelRegions: RegionCode[];
  /** When false, prompt/completion payloads must stay in deployment region. */
  promptsMayLeaveDeploymentRegion: boolean;
  /** When false, customer content must not train or leave to external vendors. */
  customerDataMayBeUsedExternally: boolean;
  /** Local / private model route is allowed. */
  localPrivateModelOption: boolean;
};

/** STORAGE */
export type StorageSovereigntyPolicy = {
  permittedStorageProviders: string[];
  privateOnlyBuckets: boolean;
  /** Tenant-scoped object prefix / namespace required. */
  tenantStorageNamespaceRequired: boolean;
  namespacePattern: string;
};

/** CRYPTOGRAPHY */
export type EncryptionPolicy = {
  platformManagedKeys: boolean;
  customerManagedKeyCapability: boolean;
  /** Future BYOK — capability flag only until adapter exists. */
  byokCapability: boolean;
  keyManagementMode: KeyManagementMode;
};

/** OPERATIONS */
export type AdministratorAccessPolicy = {
  /** Max concurrent privileged admin sessions (soft contract). */
  maxPrivilegedAdmins: number;
  supportAccessLoggingRequired: boolean;
  /** Break-glass must be time-bound and reason-coded. */
  breakGlass: {
    enabled: boolean;
    maxDurationHours: number;
    requireReason: boolean;
    impersonationAllowed: boolean;
  };
};

/** AUDIT */
export type AuditSovereigntyPolicy = {
  requiredEvents: string[];
  exportEnabled: boolean;
  retentionDays: number;
  customerAccessEnabled: boolean;
};

/** EXIT */
export type ExportPolicy = {
  completeCustomerExportEnabled: boolean;
  tenantDeletionEnabled: boolean;
  portabilityFormats: string[];
  /** Include audit + evidence packages in full export. */
  includeAuditAndEvidence: boolean;
};

/**
 * Aggregate tenant / deployment sovereignty policy.
 * Versioned for additive evolution; evaluators ignore unknown future fields
 * only when reading through this typed shape.
 */
export type SovereigntyPolicy = {
  version: 1;
  organizationId: string;
  /** Optional link to a Phase 9 deployment profile id. */
  deploymentProfileId: string | null;
  /** Opaque pack id for customer/regulatory templates — not statute code. */
  policyPackId: string | null;
  data: DataResidencyPolicy;
  retention: RetentionPolicy;
  identity: IdentitySovereigntyPolicy;
  ai: AIProviderPolicy;
  storage: StorageSovereigntyPolicy;
  encryption: EncryptionPolicy;
  administrators: AdministratorAccessPolicy;
  audit: AuditSovereigntyPolicy;
  exit: ExportPolicy;
};

export type SovereigntyPolicyInput = Omit<SovereigntyPolicy, "version"> & {
  version?: 1;
};
