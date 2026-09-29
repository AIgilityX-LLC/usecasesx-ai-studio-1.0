/**
 * Entitlement catalogue — the canonical list of gated capabilities.
 * Every plan/role check in the app must resolve through a key defined here;
 * inline plan-name comparisons are prohibited (AGENTS.md §7).
 */

import type { Edition } from "./editions";
import type { CapabilityFlagKey } from "./flags";
import type { WorkspaceRole } from "./roles";

export type EntitlementKey =
  // Repository
  | "repository.browse"
  | "repository.fullCatalogue"
  | "repository.export"
  // Use case creation & lifecycle
  | "usecase.create"
  | "usecase.edit"
  | "usecase.delete"
  | "usecase.submit"
  | "usecase.review"
  | "usecase.decide"
  // AI assistance
  | "ai.assist"
  | "ai.bulkAssist"
  // Scoring / prioritization
  | "scoring.score"
  | "prioritization.manage"
  // Portfolio & roadmap
  | "portfolio.view"
  | "portfolio.manage"
  | "roadmap.manage"
  // Opportunity Map
  | "opportunityMap.view"
  | "opportunityMap.manage"
  // Workshops
  | "workshop.attend"
  | "workshop.facilitate"
  // Reports & exports
  | "reports.generate"
  | "reports.advanced"
  // Governance & administration
  | "stageGates.manage"
  | "multiEntity.manage"
  | "integrations.manage"
  | "sso.configure"
  | "audit.viewOwn"
  | "audit.full"
  | "members.manage"
  | "admin.taxonomy"
  | "admin.users";

export type EntitlementDefinition = {
  key: EntitlementKey;
  label: string;
  /** Plain-English description used by locked-state UI. */
  description: string;
  /** Lowest edition that unlocks the capability. */
  minEdition: Edition;
  /** Workspace roles allowed to exercise it. Empty array = any member. */
  roles: WorkspaceRole[];
  /** True when an unauthenticated visitor may use it (Lite public discovery). */
  anonymous?: boolean;
  /** Capability flag that must be ON for the entitlement to resolve. */
  flag?: CapabilityFlagKey;
  /** Platform admins bypass edition gating (defaults to true). */
  platformAdminBypass?: boolean;
};

const ALL_MEMBERS: WorkspaceRole[] = ["owner", "admin", "contributor", "facilitator", "viewer"];
const EDITORS: WorkspaceRole[] = ["owner", "admin", "contributor", "facilitator"];
const MANAGERS: WorkspaceRole[] = ["owner", "admin"];

export const ENTITLEMENT_CATALOGUE: Record<EntitlementKey, EntitlementDefinition> = {
  "repository.browse": {
    key: "repository.browse",
    label: "Browse the repository",
    description: "Public discovery of published AI use cases.",
    minEdition: "lite",
    roles: ALL_MEMBERS,
    anonymous: true,
  },
  "repository.fullCatalogue": {
    key: "repository.fullCatalogue",
    label: "Full repository catalogue",
    description: "Pro-tier depth: complete detail pages and Pro-only patterns.",
    minEdition: "pro",
    roles: ALL_MEMBERS,
  },
  "repository.export": {
    key: "repository.export",
    label: "Export repository selections",
    description: "Download shortlists and comparison sets.",
    minEdition: "pro",
    roles: ALL_MEMBERS,
  },

  "usecase.create": {
    key: "usecase.create",
    label: "Capture a use case",
    description: "Create opportunities and use cases in your workspace.",
    minEdition: "lite",
    roles: EDITORS,
  },
  "usecase.edit": {
    key: "usecase.edit",
    label: "Design a use case",
    description: "Edit use cases in the AI Use Case Studio™.",
    minEdition: "lite",
    roles: EDITORS,
  },
  "usecase.delete": {
    key: "usecase.delete",
    label: "Delete a use case",
    description: "Permanently remove workspace use cases.",
    minEdition: "lite",
    roles: MANAGERS,
  },
  "usecase.submit": {
    key: "usecase.submit",
    label: "Submit to the global repository",
    description: "Propose a workspace use case for editorial review.",
    minEdition: "pro",
    roles: EDITORS,
  },
  "usecase.review": {
    key: "usecase.review",
    label: "Review a use case",
    description: "Participate in peer or gate review without deciding.",
    minEdition: "pro",
    roles: MANAGERS,
    flag: "stageGates",
  },
  "usecase.decide": {
    key: "usecase.decide",
    label: "Decide a gate",
    description: "Approve, hold or reject at a human decision gate. AI never decides.",
    minEdition: "pro",
    roles: MANAGERS,
    flag: "stageGates",
  },

  "ai.assist": {
    key: "ai.assist",
    label: "AI assist",
    description: "AI drafting and refinement inside the Studio.",
    minEdition: "pro",
    roles: EDITORS,
  },
  "ai.bulkAssist": {
    key: "ai.bulkAssist",
    label: "Bulk AI assist",
    description: "Run AI assistance across a whole portfolio.",
    minEdition: "enterprise",
    roles: MANAGERS,
  },

  "scoring.score": {
    key: "scoring.score",
    label: "Score a use case",
    description: "Apply value, feasibility and risk scoring.",
    minEdition: "lite",
    roles: EDITORS,
  },
  "prioritization.manage": {
    key: "prioritization.manage",
    label: "Prioritize",
    description: "Rank and sequence scored use cases.",
    minEdition: "pro",
    roles: EDITORS,
  },

  "portfolio.view": {
    key: "portfolio.view",
    label: "View portfolios",
    description: "Read workspace portfolios.",
    minEdition: "lite",
    roles: ALL_MEMBERS,
  },
  "portfolio.manage": {
    key: "portfolio.manage",
    label: "Manage portfolios",
    description: "Create and curate portfolios of use cases.",
    minEdition: "pro",
    roles: EDITORS,
  },
  "roadmap.manage": {
    key: "roadmap.manage",
    label: "Manage the roadmap",
    description: "Sequence portfolio delivery across horizons.",
    minEdition: "pro",
    roles: EDITORS,
  },

  "opportunityMap.view": {
    key: "opportunityMap.view",
    label: "View the Opportunity Map",
    description: "Value-versus-feasibility view of the workspace.",
    minEdition: "lite",
    roles: ALL_MEMBERS,
    flag: "opportunityMap",
  },
  "opportunityMap.manage": {
    key: "opportunityMap.manage",
    label: "Configure the Opportunity Map",
    description: "Adjust axes, segments and saved views.",
    minEdition: "pro",
    roles: EDITORS,
    flag: "opportunityMap",
  },

  "workshop.attend": {
    key: "workshop.attend",
    label: "Join a workshop",
    description: "Participate in a facilitated discovery session.",
    minEdition: "pro",
    roles: ALL_MEMBERS,
    flag: "workshopMode",
  },
  "workshop.facilitate": {
    key: "workshop.facilitate",
    label: "Facilitate a workshop",
    description: "Run facilitated sessions and capture outcomes.",
    minEdition: "pro",
    roles: ["owner", "admin", "facilitator"],
    flag: "workshopMode",
  },

  "reports.generate": {
    key: "reports.generate",
    label: "Generate reports",
    description: "Produce executive summaries and exports.",
    minEdition: "pro",
    roles: EDITORS,
  },
  "reports.advanced": {
    key: "reports.advanced",
    label: "Advanced board reporting",
    description: "Multi-portfolio, board-level value reporting.",
    minEdition: "enterprise",
    roles: MANAGERS,
  },

  "stageGates.manage": {
    key: "stageGates.manage",
    label: "Stage gates",
    description: "Configure approval gates across the delivery lifecycle.",
    minEdition: "enterprise",
    roles: MANAGERS,
    flag: "stageGates",
  },
  "multiEntity.manage": {
    key: "multiEntity.manage",
    label: "Multi-entity management",
    description: "Operate several organizations and business units.",
    minEdition: "enterprise",
    roles: ["owner"],
    flag: "multiEntity",
  },
  "integrations.manage": {
    key: "integrations.manage",
    label: "Integrations",
    description: "Connect SovereignX and third-party systems.",
    minEdition: "enterprise",
    roles: MANAGERS,
    flag: "integrations",
  },
  "sso.configure": {
    key: "sso.configure",
    label: "Single sign-on",
    description: "Configure SAML/OIDC single sign-on.",
    minEdition: "enterprise",
    roles: ["owner"],
    flag: "sso",
  },
  "audit.viewOwn": {
    key: "audit.viewOwn",
    label: "View workspace activity",
    description: "See recent activity for your own workspace.",
    minEdition: "pro",
    roles: MANAGERS,
  },
  "audit.full": {
    key: "audit.full",
    label: "Full audit trail",
    description: "Tenant-wide, append-only audit history and export.",
    minEdition: "enterprise",
    roles: MANAGERS,
    flag: "fullAudit",
  },
  "members.manage": {
    key: "members.manage",
    label: "Manage members",
    description: "Invite, remove and re-role workspace members.",
    minEdition: "pro",
    roles: MANAGERS,
  },
  "admin.taxonomy": {
    key: "admin.taxonomy",
    label: "Manage taxonomy",
    description: "Editorial control of the global taxonomy.",
    minEdition: "lite",
    roles: [],
    platformAdminBypass: true,
  },
  "admin.users": {
    key: "admin.users",
    label: "Manage platform users",
    description: "Platform staff administration.",
    minEdition: "lite",
    roles: [],
    platformAdminBypass: true,
  },
};

export const ENTITLEMENT_KEYS = Object.keys(ENTITLEMENT_CATALOGUE) as EntitlementKey[];

export function isEntitlementKey(value: string): value is EntitlementKey {
  return Object.prototype.hasOwnProperty.call(ENTITLEMENT_CATALOGUE, value);
}
