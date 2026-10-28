/**
 * Runtime configuration for the AI provider plane.
 * Read from env inside server resolvers — never expose secret values to UI.
 */

import type { AiProviderId } from "./types";
import { AI_PROVIDER_IDS } from "./types";

export type AiLoggingPolicy = "minimal" | "standard" | "verbose_redacted";

export type AiPiiHandling = "redact_before_send" | "allow_with_audit" | "block_if_detected";

export type AiDataRetentionPolicy = "ephemeral" | "tenant_default" | "no_provider_retention";

export type AiProviderConfig = {
  provider: AiProviderId;
  /** Default model id or capability tier alias resolved by the registry. */
  model: string;
  /** Opaque region token (sovereignty vocabulary) — not a statute. */
  region: string | null;
  timeoutMs: number;
  retries: number;
  tokenLimit: number;
  loggingPolicy: AiLoggingPolicy;
  piiHandling: AiPiiHandling;
  dataRetentionPolicy: AiDataRetentionPolicy;
};

export const DEFAULT_AI_PROVIDER_CONFIG: AiProviderConfig = {
  provider: "lovable_gateway",
  model: "balanced",
  region: null,
  timeoutMs: 45_000,
  retries: 1,
  tokenLimit: 8_192,
  loggingPolicy: "minimal",
  piiHandling: "redact_before_send",
  dataRetentionPolicy: "no_provider_retention",
};

const ENV_KEYS = {
  provider: "AI_PROVIDER",
  model: "AI_MODEL",
  region: "AI_REGION",
  timeoutMs: "AI_TIMEOUT_MS",
  retries: "AI_RETRIES",
  tokenLimit: "AI_TOKEN_LIMIT",
  loggingPolicy: "AI_LOGGING_POLICY",
  piiHandling: "AI_PII_HANDLING",
  dataRetentionPolicy: "AI_DATA_RETENTION_POLICY",
} as const;

function readInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function isProviderId(value: string): value is AiProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

/** Build config from process env (server-only). */
export function loadAiProviderConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): AiProviderConfig {
  const providerRaw = (env[ENV_KEYS.provider] ?? DEFAULT_AI_PROVIDER_CONFIG.provider).trim();
  const provider = isProviderId(providerRaw) ? providerRaw : DEFAULT_AI_PROVIDER_CONFIG.provider;

  const logging = (env[ENV_KEYS.loggingPolicy] ?? DEFAULT_AI_PROVIDER_CONFIG.loggingPolicy).trim();
  const pii = (env[ENV_KEYS.piiHandling] ?? DEFAULT_AI_PROVIDER_CONFIG.piiHandling).trim();
  const retention = (
    env[ENV_KEYS.dataRetentionPolicy] ?? DEFAULT_AI_PROVIDER_CONFIG.dataRetentionPolicy
  ).trim();

  return {
    provider,
    model: (env[ENV_KEYS.model] ?? DEFAULT_AI_PROVIDER_CONFIG.model).trim() || "balanced",
    region: (env[ENV_KEYS.region] ?? "").trim() || null,
    timeoutMs: readInt(env[ENV_KEYS.timeoutMs], DEFAULT_AI_PROVIDER_CONFIG.timeoutMs, 1_000, 180_000),
    retries: readInt(env[ENV_KEYS.retries], DEFAULT_AI_PROVIDER_CONFIG.retries, 0, 3),
    tokenLimit: readInt(env[ENV_KEYS.tokenLimit], DEFAULT_AI_PROVIDER_CONFIG.tokenLimit, 256, 128_000),
    loggingPolicy: (["minimal", "standard", "verbose_redacted"].includes(logging)
      ? logging
      : DEFAULT_AI_PROVIDER_CONFIG.loggingPolicy) as AiLoggingPolicy,
    piiHandling: (["redact_before_send", "allow_with_audit", "block_if_detected"].includes(pii)
      ? pii
      : DEFAULT_AI_PROVIDER_CONFIG.piiHandling) as AiPiiHandling,
    dataRetentionPolicy: ([
      "ephemeral",
      "tenant_default",
      "no_provider_retention",
    ].includes(retention)
      ? retention
      : DEFAULT_AI_PROVIDER_CONFIG.dataRetentionPolicy) as AiDataRetentionPolicy,
  };
}

export { ENV_KEYS as AI_PROVIDER_CONFIG_ENV_KEYS };
