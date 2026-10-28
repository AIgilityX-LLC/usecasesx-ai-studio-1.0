/**
 * PolicyService — central tenant policy configuration.
 *
 * Sovereignty / AI provider allow-lists live in
 * `src/lib/enterprise/tenant-policy.ts`. This facade is the call-site SoT so
 * routes and server functions do not re-implement policy checks.
 */

import {
  assertAiRouteAllowed,
  DATA_REGION_LABEL,
  DATA_REGIONS,
  tenantPolicyInputSchema,
  type AiProviderRoute,
  type DataRegion,
  type TenantPolicyInput,
  type TenantSovereigntyPolicy,
} from "@/lib/enterprise/tenant-policy";
import type { ProviderAlias } from "@/lib/ai/models";
import type { PolicyConfiguration } from "./models";

export type PolicyServiceApi = {
  regions: typeof DATA_REGIONS;
  regionLabel: (region: DataRegion) => string;
  parseInput: (raw: unknown) => TenantPolicyInput;
  defaultPolicy: (organizationId: string) => TenantSovereigntyPolicy;
  toConfiguration: (policy: TenantSovereigntyPolicy) => PolicyConfiguration;
  assertAiRouteAllowed: (
    allowed: readonly string[] | null | undefined,
    alias: ProviderAlias | null | undefined,
  ) => ReturnType<typeof assertAiRouteAllowed>;
  isRouteAllowed: (
    policy: Pick<TenantSovereigntyPolicy, "allowedAiProviderRoutes">,
    alias: ProviderAlias | null | undefined,
  ) => boolean;
};

function defaultPolicy(organizationId: string): TenantSovereigntyPolicy {
  return {
    organizationId,
    dataRegion: "unspecified",
    allowedAiProviderRoutes: ["default"] as AiProviderRoute[],
    preferredLocale: "en",
  };
}

function toConfiguration(policy: TenantSovereigntyPolicy): PolicyConfiguration {
  return {
    organizationId: policy.organizationId,
    dataRegion: policy.dataRegion,
    allowedAiProviderRoutes: [...policy.allowedAiProviderRoutes],
    preferredLocale: policy.preferredLocale,
  };
}

export const PolicyService: PolicyServiceApi = {
  regions: DATA_REGIONS,
  regionLabel: (region) => DATA_REGION_LABEL[region],
  parseInput: (raw) => tenantPolicyInputSchema.parse(raw),
  defaultPolicy,
  toConfiguration,
  assertAiRouteAllowed,
  isRouteAllowed(policy, alias) {
    return assertAiRouteAllowed(policy.allowedAiProviderRoutes, alias).allowed;
  },
};
