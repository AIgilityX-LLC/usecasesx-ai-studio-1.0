/**
 * Privacy-conscious product navigation analytics.
 *
 * Writes only through `recordProductEvent` → `product_events`. Never invents
 * a second vendor. Never stores use-case text, prompts, uploads, financials,
 * or personal data. Search events carry counts and source only — not query text.
 *
 * See `docs/analytics/navigation-events.md`.
 */

import type { WorkspaceRole } from "@/lib/authz/roles";
import { WORKSPACE_ROLES } from "@/lib/authz/roles";
import { PRODUCT_EVENTS, safeErrorShape, type ProductEventName } from "./events";
import { recordProductEvent } from "./recorder";

/** Product edition buckets (mirrors `usePlan` tier — kept local to avoid hook imports). */
export type NavPlan = "lite" | "pro" | "enterprise" | "unknown";

/** Coarse role buckets safe for aggregate product learning. */
export type NavRoleCategory = WorkspaceRole | "platform" | "unknown";

/** Product edition of the active workspace / org (not a free-text label). */
export type NavWorkspaceType = NavPlan;

export type NavAnalyticsBase = {
  plan: NavPlan;
  roleCategory: NavRoleCategory;
  workspaceType: NavWorkspaceType;
};

export type NavEventProperties = NavAnalyticsBase & {
  navigationItemId?: string;
  module?: string;
  /** Where the chrome interaction happened. */
  surface?: "sidebar" | "command_palette" | "icon_rail" | "section" | "workspace_switcher";
  /** Command-palette / nav search: result count only. */
  resultCount?: number;
  /** How the palette was opened. */
  openVia?: "shortcut" | "button";
};

const ALLOWED_PROPERTY_KEYS = new Set([
  "navigationItemId",
  "module",
  "workspaceType",
  "roleCategory",
  "plan",
  "surface",
  "resultCount",
  "openVia",
]);

/** Stable module ids derived from enterprise nav section ids / route prefixes. */
const PATH_MODULE_RULES: Array<{ prefix: string; module: string }> = [
  { prefix: "/platform-admin", module: "platform_admin" },
  { prefix: "/dashboard", module: "overview" },
  { prefix: "/repository", module: "discover" },
  { prefix: "/discover", module: "discover" },
  { prefix: "/patterns", module: "discover" },
  { prefix: "/insights", module: "discover" },
  { prefix: "/demo-scenarios", module: "discover" },
  { prefix: "/studio", module: "design" },
  { prefix: "/ai-use-case-studio", module: "design" },
  { prefix: "/my-use-cases", module: "design" },
  { prefix: "/boards", module: "design" },
  { prefix: "/submit", module: "design" },
  { prefix: "/use-cases", module: "discover" },
  { prefix: "/opportunities", module: "assess" },
  { prefix: "/opportunity-map", module: "assess" },
  { prefix: "/workshops", module: "assess" },
  { prefix: "/quick-wins", module: "assess" },
  { prefix: "/roi-calculator", module: "assess" },
  { prefix: "/portfoliox", module: "portfolio" },
  { prefix: "/roadmap", module: "portfolio" },
  { prefix: "/reviews", module: "govern" },
  { prefix: "/governance", module: "govern" },
  { prefix: "/module-analytics", module: "intelligence" },
  { prefix: "/reports", module: "reports" },
  { prefix: "/handoffs", module: "integrations" },
  { prefix: "/admin-observability", module: "workspace_admin" },
  { prefix: "/account", module: "account" },
  { prefix: "/support", module: "help" },
  { prefix: "/pilot", module: "help" },
  { prefix: "/faq", module: "help" },
];

const SECTION_TO_MODULE = new Set([
  "overview",
  "discover",
  "design",
  "assess",
  "portfolio",
  "govern",
  "intelligence",
  "reports",
  "integrations",
  "workspace-admin",
  "help",
]);

export function roleCategoryFromWorkspaceRole(
  role: string | null | undefined,
  opts?: { isPlatformAdmin?: boolean },
): NavRoleCategory {
  if (role) {
    const normalized = role.toLowerCase().trim();
    if ((WORKSPACE_ROLES as readonly string[]).includes(normalized)) {
      return normalized as WorkspaceRole;
    }
  }
  if (opts?.isPlatformAdmin) return "platform";
  return "unknown";
}

export function planFromTier(tier: string | null | undefined): NavPlan {
  if (tier === "lite" || tier === "pro" || tier === "enterprise") return tier;
  return "unknown";
}

export function workspaceTypeFromPlan(
  planCode: string | null | undefined,
  tier?: string | null,
): NavWorkspaceType {
  const code = (planCode ?? "").toLowerCase();
  if (code.includes("enterprise") || code === "sovereign") return "enterprise";
  if (code.includes("pro")) return "pro";
  if (code.includes("lite") || code === "free") return "lite";
  return planFromTier(tier);
}

export function moduleFromPath(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  const path = pathname.split("?")[0] ?? pathname;
  for (const rule of PATH_MODULE_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) return rule.module;
  }
  return undefined;
}

export function moduleFromSectionId(sectionId: string | null | undefined): string | undefined {
  if (!sectionId) return undefined;
  if (SECTION_TO_MODULE.has(sectionId)) {
    return sectionId === "workspace-admin" ? "workspace_admin" : sectionId;
  }
  return undefined;
}

/** Strip anything outside the allow-listed navigation metadata keys. */
export function sanitizeNavProperties(
  input: Partial<NavEventProperties> | null | undefined,
): Record<string, unknown> {
  if (!input) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) continue;
    if (value == null) continue;
    if (key === "resultCount") {
      if (typeof value === "number" && Number.isFinite(value)) {
        out.resultCount = Math.max(0, Math.trunc(value));
      }
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim().slice(0, 64);
      if (trimmed) out[key] = trimmed;
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      out[key] = value;
    }
  }
  return out;
}

export async function trackNavEvent(
  event: ProductEventName,
  properties?: Partial<NavEventProperties>,
): Promise<string> {
  return recordProductEvent({
    event,
    properties: sanitizeNavProperties(properties),
  });
}

export function trackNavigationClicked(
  base: NavAnalyticsBase,
  meta: { navigationItemId: string; module?: string; surface?: NavEventProperties["surface"] },
): void {
  void trackNavEvent(PRODUCT_EVENTS.navigationClicked, { ...base, ...meta });
}

export function trackModuleOpened(
  base: NavAnalyticsBase,
  meta: { module: string; navigationItemId?: string; surface?: NavEventProperties["surface"] },
): void {
  void trackNavEvent(PRODUCT_EVENTS.moduleOpened, { ...base, ...meta });
}

export function trackSidebarToggle(
  base: NavAnalyticsBase,
  meta: { expanded: boolean; surface: "icon_rail" | "section"; navigationItemId?: string },
): void {
  void trackNavEvent(
    meta.expanded ? PRODUCT_EVENTS.sidebarExpanded : PRODUCT_EVENTS.sidebarCollapsed,
    {
      ...base,
      surface: meta.surface,
      navigationItemId: meta.navigationItemId,
      module: moduleFromSectionId(meta.navigationItemId),
    },
  );
}

export function trackWorkspaceSwitched(base: NavAnalyticsBase): void {
  void trackNavEvent(PRODUCT_EVENTS.workspaceSwitched, {
    ...base,
    surface: "workspace_switcher",
  });
}

export function trackCommandPaletteOpened(
  base: NavAnalyticsBase,
  openVia: "shortcut" | "button",
): void {
  void trackNavEvent(PRODUCT_EVENTS.commandPaletteOpened, {
    ...base,
    surface: "command_palette",
    openVia,
  });
}

/**
 * Command-palette search only. Does NOT send query text.
 * Distinct from CTA `search_used` (repository discovery via `cta_events`).
 */
export function trackNavSearchUsed(base: NavAnalyticsBase, resultCount: number): void {
  void trackNavEvent(PRODUCT_EVENTS.searchUsed, {
    ...base,
    surface: "command_palette",
    resultCount,
  });
}

export type NavChromeVariant = "classic" | "enterprise_v2";

/** Rollout signal: which signed-in chrome mounted. No identity beyond allow-listed ids. */
export function trackNavVariantActive(variant: NavChromeVariant): void {
  void recordProductEvent({
    event: PRODUCT_EVENTS.navVariantActive,
    properties: { navigationItemId: variant, surface: "sidebar" },
  });
}

/**
 * Enterprise chrome crash → classic fallback. Message only (via safeErrorShape);
 * no component stacks, routes, or user content.
 */
export function trackNavRenderError(error: unknown): void {
  const shape = safeErrorShape(error);
  void recordProductEvent({
    event: PRODUCT_EVENTS.navRenderError,
    properties: {
      navigationItemId: "enterprise_v2",
      surface: "sidebar",
      module: shape.name.slice(0, 64),
    },
  });
  if (import.meta.env.DEV) {
    console.warn("[nav] enterprise chrome failed; classic fallback", shape);
  }
}
