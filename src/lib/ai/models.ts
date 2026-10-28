/**
 * Capability-tier / Studio alias registry (provider-neutral at the UI).
 *
 * UI selects *aliases* and *tiers* only. Concrete vendor model ids live here
 * and in the active AIProvider adapter — never import gateway URLs or SDKs
 * from components. Swap models by editing this file or AI_PROVIDER config.
 */

/** Capability tiers the application may request. */
export const MODEL_TIERS = ["fast", "balanced", "deep"] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

/**
 * Stable Studio research aliases. Labels are product names; they do not bind
 * the UI to a vendor SDK.
 */
export const PROVIDER_ALIASES = ["openai", "gemini", "conversx"] as const;
export type ProviderAlias = (typeof PROVIDER_ALIASES)[number];

/** Display metadata for Studio — no vendor endpoints or keys. */
export const PROVIDER_ALIAS_META: Record<
  ProviderAlias,
  { label: string; tagline: string }
> = {
  openai: { label: "Deep reasoning", tagline: "High-depth research alias" },
  gemini: { label: "Fast research", tagline: "Balanced speed and quality" },
  conversx: { label: "ConversX", tagline: "Conversational research engine" },
};

/** Tier -> gateway model id. The only place vendor ids appear (server registry). */
const TIER_MODEL: Record<ModelTier, string> = {
  fast: "google/gemini-3.1-flash-lite",
  balanced: "google/gemini-3.6-flash",
  deep: "openai/gpt-5.5",
};

/** Alias -> gateway model id. */
const ALIAS_MODEL: Record<ProviderAlias, string> = {
  openai: "openai/gpt-5.4-mini",
  gemini: "google/gemini-3.6-flash",
  conversx: "google/gemini-3.1-pro-preview",
};

export function isProviderAlias(value: unknown): value is ProviderAlias {
  return typeof value === "string" && (PROVIDER_ALIASES as readonly string[]).includes(value);
}

/** Resolve a tier to a concrete gateway model id. */
export function modelForTier(tier: ModelTier): string {
  return TIER_MODEL[tier];
}

/**
 * Resolve the model for a task. An explicit alias wins; otherwise the task's
 * default tier is used.
 */
export function resolveModel(tier: ModelTier, alias?: ProviderAlias | null): string {
  if (alias && ALIAS_MODEL[alias]) return ALIAS_MODEL[alias];
  return modelForTier(tier);
}
