/**
 * UseCasesX deployment profiles — product packaging for how the same
 * modular monolith is operated. Four profiles; one codebase.
 *
 * Self-hosted Supabase (or equivalent) is an *option* for higher profiles,
 * not the sole sovereignty architecture (see operator-responsibility.ts).
 */

import type { SovereigntyDimensionId } from "@/lib/sovereignty/dimensions";
import type { SovereigntyMaturityLevel } from "@/lib/sovereignty/maturity";

export const DEPLOYMENT_PROFILE_IDS = [
  "cloud_saas",
  "dedicated_cloud",
  "sovereign_cloud_vpc",
  "sovereign_private",
] as const;

export type DeploymentProfileId = (typeof DEPLOYMENT_PROFILE_IDS)[number];

export type DeploymentAudience =
  | "sme_standard_enterprise"
  | "major_enterprise"
  | "public_sector_regulated"
  | "highly_sensitive";

export type IsolationModel =
  | "logical_multi_tenant"
  | "dedicated_environment"
  | "customer_vpc"
  | "air_gapped_or_private";

export type RuntimeHost =
  | "aigilityx_managed"
  | "aigilityx_dedicated"
  | "customer_cloud_account"
  | "customer_on_prem_or_private_cloud";

export type DeploymentControl = {
  id: string;
  label: string;
  /** Who operates this control in this profile. */
  owner: "aigilityx" | "customer" | "shared";
};

export type DeploymentProfile = {
  id: DeploymentProfileId;
  /** Product name as sold. */
  productName: string;
  shortLabel: string;
  audience: DeploymentAudience;
  bestFor: string;
  runtimeHost: RuntimeHost;
  isolation: IsolationModel;
  highlights: readonly string[];
  controls: readonly DeploymentControl[];
  /**
   * Minimum sovereignty maturity expected per dimension when this profile
   * is fully delivered (aspirational contract — not auto-attested).
   */
  sovereigntyTargets: Partial<Record<SovereigntyDimensionId, SovereigntyMaturityLevel>>;
  /**
   * Whether self-hosted Supabase (or Postgres+Auth stack) is a supported
   * backend option — never the only path to sovereignty.
   */
  selfHostedSupabase: "not_applicable" | "optional" | "common_option";
  /** Explicit marketing/engineering non-claims for this profile. */
  nonClaims: readonly string[];
};

export const DEPLOYMENT_PROFILES: Record<DeploymentProfileId, DeploymentProfile> = {
  cloud_saas: {
    id: "cloud_saas",
    productName: "UseCasesX Cloud SaaS",
    shortLabel: "Cloud SaaS",
    audience: "sme_standard_enterprise",
    bestFor: "SMEs and standard enterprise customers.",
    runtimeHost: "aigilityx_managed",
    isolation: "logical_multi_tenant",
    highlights: [
      "AIgilityX-managed",
      "Multi-tenant",
      "Regional deployment",
      "Logical isolation (RLS + workspace tenancy)",
    ],
    controls: [
      { id: "platform_ops", label: "Platform operations & patching", owner: "aigilityx" },
      { id: "regional_residency", label: "Regional data residency (declared + enforced)", owner: "shared" },
      { id: "logical_isolation", label: "Tenant/workspace logical isolation", owner: "aigilityx" },
      { id: "managed_db", label: "Managed database & backups", owner: "aigilityx" },
    ],
    sovereigntyTargets: {
      data: "enforced",
      ai: "enforced",
      audit: "enforced",
      exit: "enforced",
      operational: "enforced",
      identity: "declared",
      cryptographic: "declared",
      infrastructure: "declared",
    },
    selfHostedSupabase: "not_applicable",
    nonClaims: [
      "Not dedicated infrastructure.",
      "Not customer VPC / customer KMS.",
    ],
  },
  dedicated_cloud: {
    id: "dedicated_cloud",
    productName: "UseCasesX Dedicated Cloud",
    shortLabel: "Dedicated Cloud",
    audience: "major_enterprise",
    bestFor: "Major enterprises.",
    runtimeHost: "aigilityx_dedicated",
    isolation: "dedicated_environment",
    highlights: [
      "Dedicated customer environment",
      "Dedicated database",
      "Dedicated encryption keys",
      "Regional residency",
      "Enterprise SSO",
    ],
    controls: [
      { id: "dedicated_env", label: "Dedicated runtime environment", owner: "aigilityx" },
      { id: "dedicated_db", label: "Dedicated database instance", owner: "aigilityx" },
      { id: "dedicated_keys", label: "Dedicated encryption keys", owner: "shared" },
      { id: "regional_residency", label: "Regional residency", owner: "shared" },
      { id: "enterprise_sso", label: "Enterprise SSO (customer IdP)", owner: "customer" },
    ],
    sovereigntyTargets: {
      data: "customer_controlled",
      infrastructure: "enforced",
      identity: "customer_controlled",
      cryptographic: "enforced",
      ai: "customer_controlled",
      operational: "customer_controlled",
      audit: "customer_controlled",
      exit: "customer_controlled",
    },
    selfHostedSupabase: "optional",
    nonClaims: [
      "Not customer-owned VPC by default (AIgilityX still operates the plane).",
      "Dedicated keys ≠ full customer-managed KMS unless contracted.",
    ],
  },
  sovereign_cloud_vpc: {
    id: "sovereign_cloud_vpc",
    productName: "UseCasesX Sovereign Cloud / Customer VPC",
    shortLabel: "Sovereign Cloud / VPC",
    audience: "public_sector_regulated",
    bestFor: "Public sector, financial services and regulated clients.",
    runtimeHost: "customer_cloud_account",
    isolation: "customer_vpc",
    highlights: [
      "Customer-controlled cloud account / VPC",
      "Private networking",
      "Customer IAM",
      "Customer KMS",
      "Customer logs",
      "Restricted AI endpoints",
    ],
    controls: [
      { id: "customer_vpc", label: "Customer cloud account / VPC", owner: "customer" },
      { id: "private_network", label: "Private networking", owner: "customer" },
      { id: "customer_iam", label: "Customer IAM", owner: "customer" },
      { id: "customer_kms", label: "Customer KMS", owner: "customer" },
      { id: "customer_logs", label: "Customer-owned logs / evidence", owner: "customer" },
      { id: "restricted_ai", label: "Restricted AI endpoints / allow-lists", owner: "shared" },
      { id: "app_pack", label: "UseCasesX application pack & updates", owner: "shared" },
    ],
    sovereigntyTargets: {
      data: "customer_controlled",
      infrastructure: "customer_controlled",
      identity: "customer_controlled",
      cryptographic: "customer_controlled",
      ai: "customer_controlled",
      operational: "customer_controlled",
      audit: "customer_controlled",
      exit: "customer_controlled",
    },
    selfHostedSupabase: "common_option",
    nonClaims: [
      "Selecting this profile does not by itself attest air-gap or sovereign maturity.",
      "Self-hosted Supabase (if chosen) shifts ops responsibility to the customer/operator.",
    ],
  },
  sovereign_private: {
    id: "sovereign_private",
    productName: "UseCasesX Sovereign Private",
    shortLabel: "Sovereign Private",
    audience: "highly_sensitive",
    bestFor: "Highly sensitive environments.",
    runtimeHost: "customer_on_prem_or_private_cloud",
    isolation: "air_gapped_or_private",
    highlights: [
      "On-premises / private cloud",
      "Self-hosted services",
      "Local identity",
      "Local storage",
      "Local model gateway",
      "No mandatory public SaaS dependencies",
      "Optional disconnected operation",
    ],
    controls: [
      { id: "on_prem", label: "On-prem / private cloud hosting", owner: "customer" },
      { id: "local_identity", label: "Local identity / IdP", owner: "customer" },
      { id: "local_storage", label: "Local object storage", owner: "customer" },
      { id: "local_model", label: "Local / restricted model gateway", owner: "customer" },
      { id: "no_saas_dep", label: "No mandatory public SaaS dependencies", owner: "shared" },
      { id: "disconnected", label: "Optional disconnected operation", owner: "customer" },
    ],
    sovereigntyTargets: {
      data: "customer_controlled",
      infrastructure: "customer_controlled",
      identity: "customer_controlled",
      cryptographic: "customer_controlled",
      ai: "customer_controlled",
      operational: "customer_controlled",
      audit: "customer_controlled",
      exit: "customer_controlled",
    },
    selfHostedSupabase: "common_option",
    nonClaims: [
      "Disconnected / air-gap operation requires attested exit criteria (Phase 8).",
      "Self-hosted backend is one deployment option — ports/adapters remain the swap seam.",
      "AIgilityX does not claim to operate the customer's private plane.",
    ],
  },
};

export function deploymentProfileList(): DeploymentProfile[] {
  return DEPLOYMENT_PROFILE_IDS.map((id) => DEPLOYMENT_PROFILES[id]);
}

export function isDeploymentProfileId(value: string): value is DeploymentProfileId {
  return (DEPLOYMENT_PROFILE_IDS as readonly string[]).includes(value);
}
