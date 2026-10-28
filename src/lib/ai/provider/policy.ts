/**
 * AIProviderPolicy — prohibit / permit providers by tenant or deployment profile.
 *
 * Aligns with sovereignty control-plane AI slice; this module is the call-site
 * SoT for provider selection (UI must not invent allow-lists).
 */

import type { DeploymentProfileId } from "@/lib/deployment/profiles";
import type { AiProviderId } from "./types";
import { AI_PROVIDER_IDS } from "./types";

export type AIProviderPolicy = {
  /** Empty = no explicit permit filter (still subject to prohibited). */
  permittedProviders: AiProviderId[];
  prohibitedProviders: AiProviderId[];
  /** When set, only these deployment profiles may use the selected provider. */
  allowedDeploymentProfiles: DeploymentProfileId[] | null;
  /** Prefer local/private when true and local_llm / private_endpoint permitted. */
  preferLocalPrivate: boolean;
};

export const DEFAULT_AI_PROVIDER_POLICY: AIProviderPolicy = {
  permittedProviders: ["lovable_gateway", "openai_compatible"],
  prohibitedProviders: [],
  allowedDeploymentProfiles: null,
  preferLocalPrivate: false,
};

/** Stricter defaults by deployment profile (configurable packs may override). */
export const PROFILE_AI_PROVIDER_POLICY: Record<DeploymentProfileId, AIProviderPolicy> = {
  cloud_saas: {
    ...DEFAULT_AI_PROVIDER_POLICY,
  },
  dedicated_cloud: {
    permittedProviders: ["lovable_gateway", "openai_compatible", "azure_openai", "private_endpoint"],
    prohibitedProviders: [],
    allowedDeploymentProfiles: null,
    preferLocalPrivate: false,
  },
  sovereign_cloud_vpc: {
    permittedProviders: ["openai_compatible", "private_endpoint", "azure_openai", "local_llm"],
    prohibitedProviders: [],
    allowedDeploymentProfiles: ["sovereign_cloud_vpc", "sovereign_private"],
    preferLocalPrivate: true,
  },
  sovereign_private: {
    permittedProviders: ["local_llm", "private_endpoint", "openai_compatible"],
    prohibitedProviders: ["openai", "anthropic", "google_vertex", "bedrock"],
    allowedDeploymentProfiles: ["sovereign_private"],
    preferLocalPrivate: true,
  },
};

export type ProviderPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string; provider: string };

function norm(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * Evaluate whether a provider id may be used under this policy.
 * Optional deploymentProfileId applies profile allow-list when configured.
 */
export function assertAiProviderAllowed(
  policy: AIProviderPolicy,
  provider: string,
  opts?: { deploymentProfileId?: DeploymentProfileId | null },
): ProviderPolicyDecision {
  const id = norm(provider);
  if (policy.prohibitedProviders.map(norm).includes(id)) {
    return { allowed: false, reason: "ai_provider_prohibited", provider };
  }
  if (
    policy.permittedProviders.length > 0 &&
    !policy.permittedProviders.map(norm).includes(id)
  ) {
    return { allowed: false, reason: "ai_provider_not_permitted", provider };
  }
  if (
    policy.allowedDeploymentProfiles &&
    opts?.deploymentProfileId &&
    !policy.allowedDeploymentProfiles.includes(opts.deploymentProfileId)
  ) {
    return { allowed: false, reason: "ai_provider_profile_mismatch", provider };
  }
  return { allowed: true };
}

export function mergeAiProviderPolicy(
  base: AIProviderPolicy,
  overlay: Partial<AIProviderPolicy>,
): AIProviderPolicy {
  return {
    permittedProviders: overlay.permittedProviders ?? base.permittedProviders,
    prohibitedProviders: overlay.prohibitedProviders ?? base.prohibitedProviders,
    allowedDeploymentProfiles:
      overlay.allowedDeploymentProfiles === undefined
        ? base.allowedDeploymentProfiles
        : overlay.allowedDeploymentProfiles,
    preferLocalPrivate: overlay.preferLocalPrivate ?? base.preferLocalPrivate,
  };
}

/** Map legacy tenant AI route keys (default, openai, local, …) into provider ids. */
export function providerIdFromRouteKey(route: string): AiProviderId | null {
  const r = norm(route);
  if (r === "default" || r === "gateway") return "lovable_gateway";
  if (r === "local" || r === "air_gapped") return "local_llm";
  if (r === "openai" || r === "gemini" || r === "conversx") return "lovable_gateway";
  if ((AI_PROVIDER_IDS as readonly string[]).includes(r)) return r as AiProviderId;
  return null;
}

/**
 * Bridge from sovereignty `AIProviderPolicy` (string routes) into this module.
 */
export function fromSovereigntyAiPolicy(input: {
  permittedProviders: string[];
  prohibitedProviders: string[];
}): AIProviderPolicy {
  const permitted = input.permittedProviders
    .map(providerIdFromRouteKey)
    .filter((x): x is AiProviderId => x != null);
  const prohibited = input.prohibitedProviders
    .map(providerIdFromRouteKey)
    .filter((x): x is AiProviderId => x != null);
  return {
    permittedProviders:
      permitted.length > 0 ? permitted : DEFAULT_AI_PROVIDER_POLICY.permittedProviders,
    prohibitedProviders: prohibited,
    allowedDeploymentProfiles: null,
    preferLocalPrivate: permitted.includes("local_llm") || permitted.includes("private_endpoint"),
  };
}
