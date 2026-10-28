/**
 * Active adapter — OpenAI-compatible HTTP endpoints (engine base_url + key).
 * Reuses the same gateway transport with endpoint/apiKey overrides (SSRF-checked).
 */

import { AI_PROVIDER_CATALOGUE } from "../catalogue";
import type { AIProvider, ExtractStructuredDataRequest } from "../types";
import { lovableGatewayProvider } from "./lovable-gateway.adapter.server";
import { withUnimplementedCapabilities } from "./base";

/**
 * openai-compatible calls share the gateway client's request shape; the
 * transport attaches Authorization + /chat/completions to the safe endpoint.
 */
export const openaiCompatibleProvider: AIProvider = withUnimplementedCapabilities({
  meta: AI_PROVIDER_CATALOGUE.openai_compatible,
  extractStructuredData: (req: ExtractStructuredDataRequest) =>
    lovableGatewayProvider.extractStructuredData(req),
  generateText: (req) => lovableGatewayProvider.generateText(req),
  classify: (req) => lovableGatewayProvider.classify(req),
  summarize: (req) => lovableGatewayProvider.summarize(req),
  matchUseCases: (req) => lovableGatewayProvider.matchUseCases(req),
});
