/**
 * Enterprise role catalogue (Phase 3) — mapping only.
 *
 * Launch workspace roles stay Owner / Admin / Contributor / Viewer / Facilitator
 * (`roles.ts`). Platform staff stay in `user_roles` / PLATFORM_ADMIN_ROLES.
 * This module maps the richer enterprise vocabulary onto those primitives +
 * permission bundles. It does **not** invent a second RBAC store.
 */

import type { PermissionBundleId } from "./scoped-permissions";
import type { WorkspaceRole } from "./roles";

/** Product-facing enterprise role labels (SRS / Phase 3 catalogue). */
export type EnterpriseRoleId =
  | "platform_super_admin"
  | "tenant_admin"
  | "portfolio_admin"
  | "business_sponsor"
  | "use_case_owner"
  | "reviewer"
  | "approver"
  | "financial_analyst"
  | "contributor"
  | "viewer"
  | "external_advisor"
  | "auditor";

export const ENTERPRISE_ROLE_IDS: EnterpriseRoleId[] = [
  "platform_super_admin",
  "tenant_admin",
  "portfolio_admin",
  "business_sponsor",
  "use_case_owner",
  "reviewer",
  "approver",
  "financial_analyst",
  "contributor",
  "viewer",
  "external_advisor",
  "auditor",
];

export const ENTERPRISE_ROLE_LABEL: Record<EnterpriseRoleId, string> = {
  platform_super_admin: "Platform Super Admin",
  tenant_admin: "Tenant Admin",
  portfolio_admin: "Portfolio Admin",
  business_sponsor: "Business Sponsor",
  use_case_owner: "Use Case Owner",
  reviewer: "Reviewer",
  approver: "Approver",
  financial_analyst: "Financial Analyst",
  contributor: "Contributor",
  viewer: "Viewer",
  external_advisor: "External Advisor",
  auditor: "Auditor",
};

export type EnterpriseRoleMapping = {
  /** Workspace membership role when this enterprise role is assigned in-tenant. */
  workspaceRole: WorkspaceRole | null;
  /** Additive Enterprise bundles (scoped-permissions). */
  bundles: readonly PermissionBundleId[];
  /** True only for AIgilityX platform operators (`user_roles`). */
  isPlatformAdmin: boolean;
  /** Notes for operators — not enforced by this pure module. */
  notes?: string;
};

/**
 * Canonical mapping. Assignments in the product must still go through
 * workspace membership + bundles / platform `user_roles` — never trust this
 * map alone as authorization.
 */
export const ENTERPRISE_ROLE_MAPPING: Record<EnterpriseRoleId, EnterpriseRoleMapping> = {
  platform_super_admin: {
    workspaceRole: null,
    bundles: [],
    isPlatformAdmin: true,
    notes: "Platform `user_roles` only — never a tenant membership role.",
  },
  tenant_admin: {
    workspaceRole: "admin",
    bundles: [],
    isPlatformAdmin: false,
  },
  portfolio_admin: {
    workspaceRole: "admin",
    bundles: ["portfolio_manager"],
    isPlatformAdmin: false,
  },
  business_sponsor: {
    workspaceRole: "viewer",
    bundles: ["executive_reviewer"],
    isPlatformAdmin: false,
  },
  use_case_owner: {
    workspaceRole: "contributor",
    bundles: [],
    isPlatformAdmin: false,
  },
  reviewer: {
    workspaceRole: "contributor",
    bundles: ["technical_reviewer"],
    isPlatformAdmin: false,
  },
  approver: {
    workspaceRole: "admin",
    bundles: ["executive_reviewer"],
    isPlatformAdmin: false,
  },
  financial_analyst: {
    workspaceRole: "contributor",
    bundles: ["portfolio_manager"],
    isPlatformAdmin: false,
  },
  contributor: {
    workspaceRole: "contributor",
    bundles: [],
    isPlatformAdmin: false,
  },
  viewer: {
    workspaceRole: "viewer",
    bundles: [],
    isPlatformAdmin: false,
  },
  external_advisor: {
    workspaceRole: "viewer",
    bundles: ["risk_reviewer"],
    isPlatformAdmin: false,
    notes: "Read + risk review; no decide/admin.",
  },
  auditor: {
    workspaceRole: "viewer",
    bundles: ["risk_reviewer"],
    isPlatformAdmin: false,
    notes: "Export/audit visibility via review+export; append-only audit remains SoR.",
  },
};

export function mappingForEnterpriseRole(role: EnterpriseRoleId): EnterpriseRoleMapping {
  return ENTERPRISE_ROLE_MAPPING[role];
}
