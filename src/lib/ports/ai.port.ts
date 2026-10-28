/**
 * AIProvider port — provider-neutral completion transport.
 *
 * Domain/application code must not import vendor SDKs. Resolve an adapter via
 * `resolveAiProvider()` (server-only). Default: Lovable AI Gateway.
 */

import type { AdapterMeta } from "./types";

export const AI_PROVIDER_IDS = [
  "lovable_gateway",
  "openai",
  "anthropic",
  "azure_openai",
  "bedrock",
  "local_llm",
  "sovereign_model",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type AiPortRequest = {
  model: string;
  system: string;
  user: string;
  tool: unknown;
  toolName: string;
  timeoutMs: number;
  retries: number;
  endpoint?: string | null;
  apiKey?: string | null;
};

export type AiPortResponse =
  | {
      ok: true;
      args: unknown;
      usage: { prompt: number | null; completion: number | null; total: number | null };
    }
  | {
      ok: false;
      kind:
        | "not_configured"
        | "rate_limited"
        | "credits_exhausted"
        | "upstream"
        | "network"
        | "timeout"
        | "invalid_output"
        | "not_implemented";
    };

export type AiProviderPort = {
  readonly meta: AdapterMeta & { port: "ai_provider"; id: AiProviderId };
  complete(req: AiPortRequest): Promise<AiPortResponse>;
};

export const AI_ADAPTER_CATALOGUE: Record<AiProviderId, Omit<AdapterMeta, "port"> & { id: AiProviderId }> =
  {
    lovable_gateway: {
      id: "lovable_gateway",
      label: "Lovable AI Gateway",
      status: "active",
      implementation: "src/lib/ai/gateway.server.ts → src/lib/ports/adapters/ai/lovable-gateway.adapter.ts",
      notes: "Default. Provider-neutral tiers/aliases resolve in src/lib/ai/models.ts.",
    },
    openai: {
      id: "openai",
      label: "OpenAI",
      status: "planned",
      implementation: "src/lib/ports/adapters/ai/planned.ts",
      notes: "Direct OpenAI API — not wired; use gateway alias `openai` today.",
    },
    anthropic: {
      id: "anthropic",
      label: "Anthropic",
      status: "planned",
      implementation: "src/lib/ports/adapters/ai/planned.ts",
    },
    azure_openai: {
      id: "azure_openai",
      label: "Azure OpenAI",
      status: "planned",
      implementation: "src/lib/ports/adapters/ai/planned.ts",
    },
    bedrock: {
      id: "bedrock",
      label: "AWS Bedrock",
      status: "planned",
      implementation: "src/lib/ports/adapters/ai/planned.ts",
    },
    local_llm: {
      id: "local_llm",
      label: "Local LLM",
      status: "planned",
      implementation: "src/lib/ports/adapters/ai/planned.ts",
      notes: "Maps to tenant route key `local` / air-gap candidate.",
    },
    sovereign_model: {
      id: "sovereign_model",
      label: "Sovereign Model",
      status: "planned",
      implementation: "src/lib/ports/adapters/ai/planned.ts",
      notes: "Customer-hosted / vetted sovereign endpoint.",
    },
  };
