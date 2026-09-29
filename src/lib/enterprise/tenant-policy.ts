/**
 * Tenant sovereignty policy (V2-18 / FR-18).
 * Data region declaration + allowed AI provider routes.
 */

import { z } from "zod";
import type { ProviderAlias } from "@/lib/ai/models";
import { PROVIDER_ALIASES } from "@/lib/ai/models";

export const DATA_REGIONS = [
  "unspecified",
  "eu",
  "us",
  "me",
  "apac",
  "private",
  "airgap_reserved",
] as const;
export type DataRegion = (typeof DATA_REGIONS)[number];

export const DATA_REGION_LABEL: Record<DataRegion, string> = {
  unspecified: "Not specified",
  eu: "European Union",
  us: "United States",
  me: "Middle East",
  apac: "Asia-Pacific",
  private: "Private cloud (declared)",
  airgap_reserved: "Air-gapped (reserved — not deployed)",
};

/** Route keys tenants may allow. `default` = Lovable AI Gateway default path. */
export const AI_PROVIDER_ROUTES = ["default", ...PROVIDER_ALIASES, "local"] as const;
export type AiProviderRoute = (typeof AI_PROVIDER_ROUTES)[number];

export type TenantSovereigntyPolicy = {
  organizationId: string;
  dataRegion: DataRegion;
  allowedAiProviderRoutes: AiProviderRoute[];
  preferredLocale: "en" | "ar";
};

export const tenantPolicyInputSchema = z.object({
  dataRegion: z.enum(DATA_REGIONS),
  allowedAiProviderRoutes: z
    .array(z.enum(AI_PROVIDER_ROUTES))
    .min(1)
    .max(20),
  preferredLocale: z.enum(["en", "ar"]).default("en"),
});

export type TenantPolicyInput = z.infer<typeof tenantPolicyInputSchema>;

/**
 * Map a call-site provider alias (or null = default gateway) to a route key.
 */
export function routeKeyForAlias(alias: ProviderAlias | null | undefined): AiProviderRoute {
  if (!alias) return "default";
  return alias;
}

/**
 * Enforce tenant AI-provider allow-list. Returns allowed:true when the route
 * key is listed (or the list is empty → treat as ["default"] only).
 */
export function assertAiRouteAllowed(
  allowed: readonly string[] | null | undefined,
  alias: ProviderAlias | null | undefined,
): { allowed: true } | { allowed: false; reason: string; route: string } {
  const route = routeKeyForAlias(alias);
  const list =
    !allowed || allowed.length === 0 ? (["default"] as string[]) : [...allowed];
  if (list.includes(route)) return { allowed: true };
  return { allowed: false, reason: "ai_provider_route_denied", route };
}
