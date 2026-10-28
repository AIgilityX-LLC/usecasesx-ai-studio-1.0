/**
 * Server-only AI provider resolution.
 * Never import this module from client bundles.
 */

import type { DeploymentProfileId } from "@/lib/deployment/profiles";
import { AI_PROVIDER_CATALOGUE } from "./catalogue";
import { loadAiProviderConfig, type AiProviderConfig } from "./config";
import {
  DEFAULT_AI_PROVIDER_POLICY,
  PROFILE_AI_PROVIDER_POLICY,
  assertAiProviderAllowed,
  type AIProviderPolicy,
} from "./policy";
import type { AIProvider, AiProviderId } from "./types";

export type ResolveAiProviderOptions = {
  env?: Record<string, string | undefined>;
  /** Override provider id (e.g. openai_compatible when engine has endpoint). */
  providerId?: AiProviderId;
  policy?: AIProviderPolicy;
  deploymentProfileId?: DeploymentProfileId | null;
};

async function loadAdapter(id: AiProviderId): Promise<AIProvider> {
  if (id === "lovable_gateway") {
    const { lovableGatewayProvider } = await import(
      "./adapters/lovable-gateway.adapter.server"
    );
    return lovableGatewayProvider;
  }
  if (id === "openai_compatible") {
    const { openaiCompatibleProvider } = await import(
      "./adapters/openai-compatible.adapter.server"
    );
    return openaiCompatibleProvider;
  }
  const { plannedProviders } = await import("./adapters/planned");
  const planned = plannedProviders[id as keyof typeof plannedProviders];
  if (!planned) {
    throw new Error(`Unknown AI provider '${id}'.`);
  }
  if (AI_PROVIDER_CATALOGUE[id].status !== "active") {
    throw new Error(
      `AI provider '${id}' is planned, not active. Keep AI_PROVIDER=lovable_gateway until the adapter ships.`,
    );
  }
  return planned;
}

/**
 * Resolve the active AIProvider after policy checks.
 * When an engine endpoint is present, prefer openai_compatible without changing
 * gateway behavior for the default path.
 */
export async function resolveAiProvider(
  opts: ResolveAiProviderOptions = {},
): Promise<{ provider: AIProvider; config: AiProviderConfig }> {
  const env = opts.env ?? (process.env as Record<string, string | undefined>);
  const config = loadAiProviderConfig(env);
  const providerId = opts.providerId ?? config.provider;

  const policy =
    opts.policy ??
    (opts.deploymentProfileId
      ? PROFILE_AI_PROVIDER_POLICY[opts.deploymentProfileId]
      : DEFAULT_AI_PROVIDER_POLICY);

  const decision = assertAiProviderAllowed(policy, providerId, {
    deploymentProfileId: opts.deploymentProfileId,
  });
  if (!decision.allowed) {
    throw new Error(`AI provider policy denied: ${decision.reason} (${providerId})`);
  }

  const provider = await loadAdapter(providerId);
  return { provider, config };
}

/**
 * Pick transport for a call that may already have an engine endpoint.
 * Preserves today's behavior: gateway when no endpoint; openai-compatible when set.
 */
export async function resolveAiProviderForCall(opts: {
  endpoint?: string | null;
  policy?: AIProviderPolicy;
  deploymentProfileId?: DeploymentProfileId | null;
  env?: Record<string, string | undefined>;
}): Promise<{ provider: AIProvider; config: AiProviderConfig }> {
  const providerId: AiProviderId = opts.endpoint ? "openai_compatible" : "lovable_gateway";
  return resolveAiProvider({
    providerId,
    policy: opts.policy,
    deploymentProfileId: opts.deploymentProfileId,
    env: opts.env,
  });
}
