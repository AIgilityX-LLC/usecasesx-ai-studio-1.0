/**
 * AIProvider — provider-independent interface for UseCasesX AI capabilities.
 *
 * Application/UI code must never import vendor SDKs or gateway URLs.
 * Resolve an adapter via `resolveAiProvider()` (server-only).
 */

export const AI_PROVIDER_IDS = [
  "lovable_gateway",
  "openai_compatible",
  "openai",
  "anthropic",
  "azure_openai",
  "bedrock",
  "google_vertex",
  "private_endpoint",
  "local_llm",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type AiAdapterStatus = "active" | "planned";

export type AiCapability =
  | "generateText"
  | "classify"
  | "embed"
  | "matchUseCases"
  | "summarize"
  | "extractStructuredData";

export type AiUsage = {
  prompt: number | null;
  completion: number | null;
  total: number | null;
};

export type AiProviderErrorKind =
  | "not_configured"
  | "not_implemented"
  | "rate_limited"
  | "credits_exhausted"
  | "upstream"
  | "network"
  | "timeout"
  | "invalid_output"
  | "policy_denied";

export type AiProviderFailure = { ok: false; kind: AiProviderErrorKind; detail?: string };

export type GenerateTextRequest = {
  model: string;
  system?: string;
  user: string;
  maxTokens?: number;
};

export type GenerateTextResult =
  | { ok: true; text: string; usage: AiUsage }
  | AiProviderFailure;

export type ClassifyRequest = {
  model: string;
  system?: string;
  user: string;
  labels: string[];
};

export type ClassifyResult =
  | { ok: true; label: string; confidence?: number; usage: AiUsage }
  | AiProviderFailure;

export type EmbedRequest = {
  model: string;
  texts: string[];
};

export type EmbedResult =
  | { ok: true; vectors: number[][]; usage: AiUsage }
  | AiProviderFailure;

export type MatchUseCasesRequest = {
  model: string;
  system?: string;
  query: string;
  /** Opaque catalogue snippets — never secrets. */
  candidates: Array<{ id: string; title: string; summary?: string }>;
};

export type MatchUseCasesResult =
  | {
      ok: true;
      matches: Array<{ id: string; score: number; rationale?: string }>;
      usage: AiUsage;
    }
  | AiProviderFailure;

export type SummarizeRequest = {
  model: string;
  system?: string;
  user: string;
  maxTokens?: number;
};

export type SummarizeResult =
  | { ok: true; summary: string; usage: AiUsage }
  | AiProviderFailure;

/** Tool-calling / JSON structured extraction — primary path today. */
export type ExtractStructuredDataRequest = {
  model: string;
  system: string;
  user: string;
  tool: unknown;
  toolName: string;
  timeoutMs: number;
  retries: number;
  /** Optional openai-compatible base URL (already SSRF-checked upstream). */
  endpoint?: string | null;
  apiKey?: string | null;
};

export type ExtractStructuredDataResult =
  | { ok: true; args: unknown; usage: AiUsage }
  | AiProviderFailure;

export type AiProviderMeta = {
  id: AiProviderId;
  label: string;
  status: AiAdapterStatus;
  capabilities: readonly AiCapability[];
  notes?: string;
};

/**
 * Provider-independent AI adapter contract.
 * Implement only what the adapter can do; others return `not_implemented`.
 */
export type AIProvider = {
  readonly meta: AiProviderMeta;
  generateText(req: GenerateTextRequest): Promise<GenerateTextResult>;
  classify(req: ClassifyRequest): Promise<ClassifyResult>;
  embed(req: EmbedRequest): Promise<EmbedResult>;
  matchUseCases(req: MatchUseCasesRequest): Promise<MatchUseCasesResult>;
  summarize(req: SummarizeRequest): Promise<SummarizeResult>;
  extractStructuredData(req: ExtractStructuredDataRequest): Promise<ExtractStructuredDataResult>;
};
