/**
 * Planned AI adapters — catalogue presence only until implemented.
 * Selecting these via env throws from resolveAiProvider (no silent fallback).
 */

import { AI_PROVIDER_CATALOGUE } from "../catalogue";
import type { AiProviderId, AIProvider } from "../types";
import { notImplemented, withUnimplementedCapabilities } from "./base";

function planned(id: AiProviderId): AIProvider {
  return withUnimplementedCapabilities({
    meta: AI_PROVIDER_CATALOGUE[id],
    extractStructuredData: async () => notImplemented("not_implemented"),
  });
}

export const plannedProviders: Record<
  Exclude<AiProviderId, "lovable_gateway" | "openai_compatible">,
  AIProvider
> = {
  openai: planned("openai"),
  anthropic: planned("anthropic"),
  azure_openai: planned("azure_openai"),
  bedrock: planned("bedrock"),
  google_vertex: planned("google_vertex"),
  private_endpoint: planned("private_endpoint"),
  local_llm: planned("local_llm"),
};
