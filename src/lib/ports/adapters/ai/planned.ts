/**
 * Planned AI provider adapters — portable targets, not live transports.
 * Server-safe stub: always returns not_implemented.
 */

import {
  AI_ADAPTER_CATALOGUE,
  type AiProviderId,
  type AiProviderPort,
} from "@/lib/ports/ai.port";

function planned(id: Exclude<AiProviderId, "lovable_gateway">): AiProviderPort {
  return {
    meta: { ...AI_ADAPTER_CATALOGUE[id], port: "ai_provider" },
    async complete() {
      return { ok: false, kind: "not_implemented" };
    },
  };
}

export const openaiAdapter = planned("openai");
export const anthropicAdapter = planned("anthropic");
export const azureOpenAiAdapter = planned("azure_openai");
export const bedrockAdapter = planned("bedrock");
export const localLlmAdapter = planned("local_llm");
export const sovereignModelAdapter = planned("sovereign_model");

export const PLANNED_AI_ADAPTERS = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  azure_openai: azureOpenAiAdapter,
  bedrock: bedrockAdapter,
  local_llm: localLlmAdapter,
  sovereign_model: sovereignModelAdapter,
} as const;
