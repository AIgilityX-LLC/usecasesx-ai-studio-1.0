/**
 * AI provider adapter catalogue — active vs planned.
 */

import type { AiProviderId, AiProviderMeta } from "./types";

export const AI_PROVIDER_CATALOGUE: Record<AiProviderId, AiProviderMeta> = {
  lovable_gateway: {
    id: "lovable_gateway",
    label: "UseCasesX AI Gateway",
    status: "active",
    capabilities: [
      "generateText",
      "classify",
      "matchUseCases",
      "summarize",
      "extractStructuredData",
    ],
    notes: "Default. Vendor model ids resolve only in models.ts / gateway transport.",
  },
  openai_compatible: {
    id: "openai_compatible",
    label: "OpenAI-compatible endpoint",
    status: "active",
    capabilities: ["generateText", "classify", "summarize", "extractStructuredData", "matchUseCases"],
    notes: "BYO endpoint via engines (SSRF-guarded). Not a vendor SDK import.",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    status: "planned",
    capabilities: ["generateText", "classify", "embed", "summarize", "extractStructuredData"],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    status: "planned",
    capabilities: ["generateText", "classify", "summarize", "extractStructuredData"],
  },
  azure_openai: {
    id: "azure_openai",
    label: "Azure OpenAI",
    status: "planned",
    capabilities: ["generateText", "classify", "embed", "summarize", "extractStructuredData"],
  },
  bedrock: {
    id: "bedrock",
    label: "AWS Bedrock",
    status: "planned",
    capabilities: ["generateText", "classify", "embed", "summarize", "extractStructuredData"],
  },
  google_vertex: {
    id: "google_vertex",
    label: "Google Vertex AI",
    status: "planned",
    capabilities: ["generateText", "classify", "embed", "summarize", "extractStructuredData"],
  },
  private_endpoint: {
    id: "private_endpoint",
    label: "Private model endpoint",
    status: "planned",
    capabilities: ["generateText", "classify", "summarize", "extractStructuredData", "matchUseCases"],
    notes: "Customer VPC / sovereign cloud restricted AI.",
  },
  local_llm: {
    id: "local_llm",
    label: "Local / self-hosted model",
    status: "planned",
    capabilities: ["generateText", "classify", "embed", "summarize", "extractStructuredData"],
    notes: "Air-gap / sovereign private candidate.",
  },
};

export function listAiProviders(status?: AiProviderMeta["status"]): AiProviderMeta[] {
  const all = Object.values(AI_PROVIDER_CATALOGUE);
  return status ? all.filter((p) => p.status === status) : all;
}
