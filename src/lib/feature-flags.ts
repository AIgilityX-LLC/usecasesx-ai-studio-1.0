import { mergeCapabilityFlags, type CapabilityFlags } from "@/lib/authz/flags";

/** Public-launch switches. Environment values may disable a surface for an emergency rollback. */
function enabled(value: string | undefined): boolean {
  return value == null ? true : value !== "false";
}

function optional(value: string | undefined): boolean | undefined {
  return value == null ? undefined : value === "true";
}

export const PUBLIC_LAUNCH_FEATURES = Object.freeze({
  studio: enabled(import.meta.env.VITE_PUBLIC_STUDIO_ENABLED),
  myUseCases: enabled(import.meta.env.VITE_PUBLIC_MY_USE_CASES_ENABLED),
  boards: enabled(import.meta.env.VITE_PUBLIC_BOARDS_ENABLED),
  lifecycleAnalytics: enabled(import.meta.env.VITE_PUBLIC_LIFECYCLE_ANALYTICS_ENABLED),
  /**
   * Tenancy v2 surfaces (workspace switcher, member management).
   * OFF by default — the data foundation ships before any UI does.
   */
  tenancyV2: import.meta.env.VITE_TENANCY_V2_ENABLED === "true",
  /**
   * Enterprise navigation v2 (sectioned sidebar, command palette, platform-admin split).
   * OFF by default — classic `ClassicAppSidebar` remains the signed-in chrome until rollout.
   * Rollback: set `VITE_ENTERPRISE_NAVIGATION_V2_ENABLED=false` (or omit) and redeploy.
   */
  enterpriseNavigationV2: import.meta.env.VITE_ENTERPRISE_NAVIGATION_V2_ENABLED === "true",
});

/**
 * Value-realization capabilities that are designed now but sold with
 * Enterprise. OFF by default so no surface can claim automated benefit
 * verification is live in Lite or Pro.
 */
export const ENTERPRISE_VALUE_FEATURES = Object.freeze({
  erpBenefitVerification: import.meta.env.VITE_ERP_BENEFIT_VERIFICATION === "true",
});

/**
 * Browser mirror of the capability flags used by the entitlement catalogue.
 * Defaults live in `src/lib/authz/flags.ts`; Enterprise capabilities that are
 * designed but not shipped stay OFF so no surface can claim they are live.
 */
export const CLIENT_CAPABILITY_FLAGS: CapabilityFlags = mergeCapabilityFlags({
  opportunityMap: optional(import.meta.env.VITE_CAPABILITY_OPPORTUNITY_MAP),
  workshopMode: optional(import.meta.env.VITE_CAPABILITY_WORKSHOP_MODE),
  stageGates: optional(import.meta.env.VITE_CAPABILITY_STAGE_GATES),
  permissionBundles: optional(import.meta.env.VITE_CAPABILITY_PERMISSION_BUNDLES),
  multiEntity: optional(import.meta.env.VITE_CAPABILITY_MULTI_ENTITY),
  integrations: optional(import.meta.env.VITE_CAPABILITY_INTEGRATIONS),
  sso: optional(import.meta.env.VITE_CAPABILITY_SSO),
  fullAudit: optional(import.meta.env.VITE_CAPABILITY_FULL_AUDIT),
});

/**
 * Opportunity Map overlays that are designed into the model but deliberately
 * NOT shipped in Pro Founding Access. Surfaces list them as "not live" so no
 * UI can imply planned Enterprise capability is available today.
 */
export const RESERVED_MAP_OVERLAYS: { key: string; label: string; description: string }[] = [
  {
    key: "multiEntity",
    label: "Group-of-companies roll-up",
    description: "Consolidate the map across legal entities in a group structure.",
  },
  {
    key: "geographic",
    label: "Geographic and market overlay",
    description: "Plot concentration by country and market alongside value themes.",
  },
  {
    key: "capabilityGap",
    label: "Capability and data-readiness overlay",
    description: "Shade cells by assessed readiness rather than captured demand.",
  },
  {
    key: "dependency",
    label: "Dependency and sequencing overlay",
    description: "Show delivery dependencies between clusters for roadmap sequencing.",
  },
];
