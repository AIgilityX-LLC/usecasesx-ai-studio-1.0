/**
 * Provider-neutral model registry.
 *
 * The application never names a vendor model. It asks for a *capability tier*
 * ("fast", "balanced", "deep") or a brand alias, and this registry resolves it
 * to a Lovable AI Gateway model id. Swapping providers is a one-line change
 * here and requires no UI or call-site rewrite.
 */

/** Capability tiers the application may request. */
export const MODEL_TIERS = ["fast", "balanced", "deep"] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

/**
 * User-selectable aliases surfaced in the Studio. These stay stable even if
 * the underlying vendor model changes.
 */
export const PROVIDER_ALIASES = ["openai", "gemini", "conversx"] as const;
export type ProviderAlias = (typeof PROVIDER_ALIASES)[number];

/** Tier -> gateway model id. The only place vendor ids appear. */
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
