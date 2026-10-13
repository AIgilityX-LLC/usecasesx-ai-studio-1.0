/**
 * Navigation capabilities — UI visibility + route-guard layer.
 *
 * Extends (does not replace) workspace roles, entitlement catalogue, scoped
 * permissions, and platform `user_roles`. Hidden nav is never the security
 * boundary: RLS and server handlers remain authoritative.
 */

import type { WorkspaceRole } from "./roles";
import type { PermissionBundleId } from "./scoped-permissions";
import type { AppRole } from "@/lib/usecasex.roles";
import { ADMIN_TIER_ROLES } from "@/lib/usecasex.roles";

/** Product navigation capabilities (nav + route guards). */
export type NavCapability =
  | "dashboard.read"
  | "repository.read"
  | "opportunity.read"
  | "opportunity.create"
  | "opportunity.manage"
  | "usecase.read"
  | "usecase.create"
  | "usecase.edit"
  | "usecase.submit"
  | "assessment.read"
  | "assessment.manage"
  | "roi.read"
  | "roi.manage"
  | "portfolio.read"
  | "portfolio.manage"
  | "decision.read"
  | "decision.approve"
  | "pilot.read"
  | "pilot.manage"
  | "governance.read"
  | "governance.review"
  | "analytics.read"
  | "report.read"
  | "report.generate"
  | "integration.read"
  | "integration.manage"
  | "workspace.manage"
  | "security.manage"
  | "platform.manage";

export const NAV_CAPABILITIES: readonly NavCapability[] = [
  "dashboard.read",
  "repository.read",
  "opportunity.read",
  "opportunity.create",
  "opportunity.manage",
  "usecase.read",
  "usecase.create",
  "usecase.edit",
  "usecase.submit",
  "assessment.read",
  "assessment.manage",
  "roi.read",
  "roi.manage",
  "portfolio.read",
  "portfolio.manage",
  "decision.read",
  "decision.approve",
  "pilot.read",
  "pilot.manage",
  "governance.read",
  "governance.review",
  "analytics.read",
  "report.read",
  "report.generate",
  "integration.read",
  "integration.manage",
  "workspace.manage",
  "security.manage",
  "platform.manage",
] as const;

/** Suggested product personas — mapped onto existing workspace + platform roles. */
export type NavPersona =
  | "EXECUTIVE"
  | "AI_LEADER"
  | "PORTFOLIO_MANAGER"
  | "BUSINESS_OWNER"
  | "USE_CASE_OWNER"
  | "FINANCE_REVIEWER"
  | "GOVERNANCE_REVIEWER"
  | "WORKSPACE_ADMIN"
  | "PLATFORM_ADMIN"
  | "SUPER_ADMIN";

export const NAV_PERSONAS: readonly NavPersona[] = [
  "EXECUTIVE",
  "AI_LEADER",
  "PORTFOLIO_MANAGER",
  "BUSINESS_OWNER",
  "USE_CASE_OWNER",
  "FINANCE_REVIEWER",
  "GOVERNANCE_REVIEWER",
  "WORKSPACE_ADMIN",
  "PLATFORM_ADMIN",
  "SUPER_ADMIN",
] as const;

const READ_CORE: NavCapability[] = [
  "dashboard.read",
  "repository.read",
  "opportunity.read",
  "usecase.read",
  "assessment.read",
  "roi.read",
  "portfolio.read",
  "governance.read",
  "report.read",
  "integration.read",
  "pilot.read",
  "security.manage",
];

const AUTHOR_CORE: NavCapability[] = [
  ...READ_CORE,
  "opportunity.create",
  "usecase.create",
  "usecase.edit",
  "usecase.submit",
  "assessment.manage",
  "roi.manage",
  "report.generate",
];

/** Role → capability map (personas). Platform.manage is staff-only. */
export const ROLE_CAPABILITY_MAP: Record<NavPersona, readonly NavCapability[]> = {
  EXECUTIVE: [...READ_CORE, "decision.read", "analytics.read", "report.generate"],
  AI_LEADER: [
    ...AUTHOR_CORE,
    "opportunity.manage",
    "portfolio.manage",
    "decision.read",
    "decision.approve",
    "analytics.read",
    "governance.review",
  ],
  PORTFOLIO_MANAGER: [
    ...AUTHOR_CORE,
    "opportunity.manage",
    "portfolio.manage",
    "decision.read",
    "analytics.read",
  ],
  BUSINESS_OWNER: [...AUTHOR_CORE, "decision.read"],
  USE_CASE_OWNER: [
    "dashboard.read",
    "repository.read",
    "opportunity.read",
    "opportunity.create",
    "usecase.read",
    "usecase.create",
    "usecase.edit",
    "usecase.submit",
    "assessment.read",
    "assessment.manage",
    "roi.read",
    "portfolio.read",
    "report.read",
    "pilot.read",
    "security.manage",
    "integration.read",
  ],
  FINANCE_REVIEWER: [
    "dashboard.read",
    "repository.read",
    "opportunity.read",
    "usecase.read",
    "roi.read",
    "roi.manage",
    "portfolio.read",
    "report.read",
    "report.generate",
    "analytics.read",
    "security.manage",
  ],
  GOVERNANCE_REVIEWER: [
    ...READ_CORE,
    "decision.read",
    "decision.approve",
    "governance.review",
    "analytics.read",
    "report.generate",
  ],
  WORKSPACE_ADMIN: [
    ...AUTHOR_CORE,
    "opportunity.manage",
    "portfolio.manage",
    "decision.read",
    "decision.approve",
    "pilot.manage",
    "governance.review",
    "analytics.read",
    "workspace.manage",
    "integration.manage",
  ],
  PLATFORM_ADMIN: [
    ...AUTHOR_CORE,
    "opportunity.manage",
    "portfolio.manage",
    "decision.read",
    "decision.approve",
    "pilot.manage",
    "governance.review",
    "analytics.read",
    "workspace.manage",
    "integration.manage",
    "platform.manage",
  ],
  SUPER_ADMIN: [...NAV_CAPABILITIES],
};

/** Baseline for any signed-in user with no workspace role yet. */
export const AUTHENTICATED_BASELINE: readonly NavCapability[] = [
  "dashboard.read",
  "repository.read",
  "usecase.read",
  "usecase.submit",
  "assessment.read",
  "roi.read",
  "pilot.read",
  "report.read",
  "security.manage",
  "integration.read",
];

export type NavAuthzContext = {
  userId: string | null;
  workspaceRole: WorkspaceRole | null;
  /** Platform `user_roles` rows (global). */
  appRoles?: readonly AppRole[] | null;
  /** True when any ADMIN_TIER_ROLES membership (sidebar/platform staff). */
  isPlatformAdminTier?: boolean;
  /** Optional Enterprise bundles (additive). */
  bundles?: readonly PermissionBundleId[] | null;
};

function isAdminTierRole(role: AppRole): boolean {
  return (ADMIN_TIER_ROLES as readonly string[]).includes(role);
}

/** Resolve personas from existing workspace + platform roles (no new DB table). */
export function resolveNavPersonas(ctx: NavAuthzContext): NavPersona[] {
  if (!ctx.userId) return [];

  const personas = new Set<NavPersona>();
  const appRoles = ctx.appRoles ?? [];
  const tier =
    ctx.isPlatformAdminTier === true ||
    appRoles.some(isAdminTierRole) ||
    appRoles.includes("super_admin");

  if (appRoles.includes("super_admin")) {
    personas.add("SUPER_ADMIN");
  } else if (tier) {
    personas.add("PLATFORM_ADMIN");
  }

  switch (ctx.workspaceRole) {
    case "owner":
      personas.add("WORKSPACE_ADMIN");
      personas.add("AI_LEADER");
      break;
    case "admin":
      personas.add("WORKSPACE_ADMIN");
      break;
    case "contributor":
      personas.add("USE_CASE_OWNER");
      personas.add("BUSINESS_OWNER");
      break;
    case "facilitator":
      personas.add("BUSINESS_OWNER");
      break;
    case "viewer":
      personas.add("EXECUTIVE");
      break;
    default:
      break;
  }

  for (const bundle of ctx.bundles ?? []) {
    if (bundle === "executive_reviewer") personas.add("EXECUTIVE");
    if (bundle === "portfolio_manager") personas.add("PORTFOLIO_MANAGER");
    if (bundle === "risk_reviewer" || bundle === "technical_reviewer") {
      personas.add("GOVERNANCE_REVIEWER");
    }
    if (bundle === "content_curator") personas.add("USE_CASE_OWNER");
  }

  return [...personas];
}

export function capabilitiesForPersonas(personas: readonly NavPersona[]): Set<NavCapability> {
  const out = new Set<NavCapability>();
  for (const persona of personas) {
    for (const cap of ROLE_CAPABILITY_MAP[persona] ?? []) out.add(cap);
  }
  return out;
}

export function resolveNavCapabilities(ctx: NavAuthzContext): Set<NavCapability> {
  if (!ctx.userId) return new Set();
  const personas = resolveNavPersonas(ctx);
  const caps = capabilitiesForPersonas(personas);
  for (const cap of AUTHENTICATED_BASELINE) caps.add(cap);
  // Tenant users never receive platform.manage unless they are platform staff.
  if (!personas.includes("PLATFORM_ADMIN") && !personas.includes("SUPER_ADMIN")) {
    caps.delete("platform.manage");
  }
  return caps;
}

export function hasNavCapability(
  ctx: NavAuthzContext,
  capability: NavCapability | readonly NavCapability[],
): boolean {
  const caps = resolveNavCapabilities(ctx);
  const needed = Array.isArray(capability) ? capability : [capability];
  return needed.some((c) => caps.has(c));
}

export function assertNavCapability(
  ctx: NavAuthzContext,
  capability: NavCapability,
  message = `Missing capability: ${capability}`,
): void {
  if (!hasNavCapability(ctx, capability)) throw new Error(message);
}

/**
 * Primary capability required to show a sidebar target / open a route.
 * Platform administration paths use platform.manage exclusively.
 */
export const NAV_ROUTE_CAPABILITIES: Record<string, NavCapability> = {
  "/dashboard": "dashboard.read",
  "/repository": "repository.read",
  "/discover": "repository.read",
  "/opportunities": "opportunity.read",
  "/opportunity-map": "opportunity.read",
  "/workshops": "opportunity.read",
  "/quick-wins": "assessment.read",
  "/roi-calculator": "roi.read",
  "/insights": "dashboard.read",
  "/studio": "usecase.read",
  "/my-use-cases": "usecase.read",
  "/boards": "usecase.read",
  "/submit": "usecase.submit",
  "/patterns": "repository.read",
  "/demo-scenarios": "usecase.read",
  "/roadmap": "portfolio.read",
  "/portfoliox": "portfolio.read",
  "/sarpi": "integration.read",
  "/advisorx": "integration.read",
  "/cyberx/c3g/intake": "governance.read",
  "/handoffs": "integration.read",
  "/reviews": "decision.read",
  "/reports": "report.read",
  "/reports/export-center": "report.read",
  "/admin-observability": "workspace.manage",
  "/module-analytics": "analytics.read",
  "/pilot": "pilot.read",
  "/support": "security.manage",
  "/account": "security.manage",
  "/account/security": "security.manage",
  "/entitlement": "security.manage",
  "/platform-admin": "platform.manage",
  "/platform-admin/requests": "platform.manage",
  "/platform-admin/founding-access": "platform.manage",
  "/platform-admin/leads": "platform.manage",
  "/platform-admin/pilot": "platform.manage",
  "/platform-admin/pilot-milestones": "platform.manage",
  "/platform-admin/ai-engines": "platform.manage",
  "/platform-admin/email-delivery": "platform.manage",
  "/platform-admin/platform-admins": "platform.manage",
  "/platform-admin/readiness": "platform.manage",
  "/platform-admin/production-readiness": "platform.manage",
  "/platform-admin/production-data": "platform.manage",
  "/platform-admin/launch-checks": "platform.manage",
  "/platform-admin/release-candidate": "platform.manage",
  "/platform-admin/launch-readiness": "platform.manage",
  "/platform-admin/launch-learning": "platform.manage",
  "/platform-admin/feedback": "platform.manage",
  "/platform-admin/analytics": "platform.manage",
  "/platform-admin/submissions": "platform.manage",
  "/platform-admin/waitlist": "platform.manage",
  "/platform-admin/submission-audit": "platform.manage",
  // Legacy paths (redirect targets still classified for capability checks).
  "/administration": "platform.manage",
  "/admin-submissions": "platform.manage",
  "/admin-waitlist": "platform.manage",
  "/admin-audit": "platform.manage",
};

export function capabilityForRoute(pathname: string): NavCapability | null {
  if (NAV_ROUTE_CAPABILITIES[pathname]) return NAV_ROUTE_CAPABILITIES[pathname];
  // Longest-prefix match for nested admin/studio paths.
  const keys = Object.keys(NAV_ROUTE_CAPABILITIES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pathname === key || pathname.startsWith(`${key}/`)) {
      return NAV_ROUTE_CAPABILITIES[key] ?? null;
    }
  }
  return null;
}
