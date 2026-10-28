/**
 * First-class multi-tenancy models for UseCasesX™.
 *
 * These are the product/architecture vocabulary. They map onto existing
 * Postgres tables — we do **not** introduce a parallel `tenants` table.
 * `organizations` is the tenant (see docs/architecture/workspace-navigation-context.md).
 */

import type { Edition } from "@/lib/authz/editions";
import type { ScopedPermission } from "@/lib/authz/scoped-permissions";
import type { WorkspaceRole } from "@/lib/authz/roles";

/** Mirrors `public.org_unit_type` — kept here so client modules never import `*.server.ts`. */
export const ORG_UNIT_TYPES = [
  "group",
  "company",
  "business_unit",
  "department",
  "team",
  "program",
  "project",
] as const;
export type OrgUnitType = (typeof ORG_UNIT_TYPES)[number];

/** Product language: Tenant ≡ Organization. */
export type TenantId = string;
export type OrganizationId = TenantId;
export type WorkspaceId = string;
export type BusinessUnitId = string;
export type PortfolioId = string;
export type ProgramId = string;
export type UseCaseId = string;

/** Platform is not a row — it is AIgilityX ops via `user_roles`. */
export type PlatformRef = { kind: "platform" };

export type Organization = {
  id: OrganizationId;
  name: string | null;
  plan: string | null;
};

/** Alias kept explicit so call sites can say "tenant" without inventing a table. */
export type Tenant = Organization & { kind: "tenant" };

export type Workspace = {
  id: WorkspaceId;
  name: string;
  organizationId: OrganizationId;
};

export type OrgMembership = {
  organizationId: OrganizationId;
  userId: string;
  role: string;
  status: string;
};

export type WorkspaceMembership = {
  workspaceId: WorkspaceId;
  userId: string;
  role: WorkspaceRole | string;
};

export type BusinessUnit = {
  id: BusinessUnitId;
  organizationId: OrganizationId;
  name: string;
  slug: string | null;
  parentId: string | null;
  unitType: Extract<OrgUnitType, "business_unit"> | OrgUnitType;
  isActive: boolean;
};

export type Portfolio = {
  id: PortfolioId;
  organizationId: OrganizationId | null;
  workspaceId: WorkspaceId | null;
  organizationUnitId: BusinessUnitId | null;
  parentPortfolioId: PortfolioId | null;
  name: string;
};

/**
 * Program / initiative — modelled as `organization_units` with
 * `unit_type = 'program'` (or nested portfolio when a dedicated program row
 * is not present). No parallel `programs` table in this phase.
 */
export type Program = {
  id: ProgramId;
  organizationId: OrganizationId;
  name: string;
  parentId: string | null;
  unitType: "program";
};

export type UseCaseRef = {
  id: UseCaseId;
  organizationId: OrganizationId | null;
  workspaceId: WorkspaceId | null;
  title?: string;
};

/** Role surfaces — never stored on `profiles`. */
export type RoleModel = {
  workspaceRole: WorkspaceRole | null;
  orgRole: string | null;
  isPlatformAdmin: boolean;
};

export type PermissionModel = {
  /** Catalogue entitlements (edition + role gated). */
  entitlementKeys: string[];
  /** Scoped action vocabulary (`view` | `edit` | …). */
  scoped: ReadonlySet<ScopedPermission>;
};

/**
 * Subscription = active entitlements ledger row for the organization.
 * Table: `public.entitlements` (plan_code, expires_at, revoked_at).
 */
export type Subscription = {
  organizationId: OrganizationId;
  planCode: string | null;
  edition: Edition;
  expiresAt: string | null;
  revokedAt: string | null;
  source: string | null;
};

/**
 * Quotas — from `plans.limits` jsonb when present, else AI fair-use defaults
 * keyed by edition (`src/lib/ai/fair-use.ts`).
 */
export type QuotaSet = {
  edition: Edition;
  aiPerUserPerDay: number;
  aiPerWorkspacePerDay: number;
  /** Optional commercial caps from `plans.limits` (opaque passthrough). */
  planLimits: Record<string, unknown>;
};

export type FeatureEntitlement = {
  key: string;
  allowed: boolean;
  requiredEdition: Edition;
  message?: string;
};

/**
 * Tenant policy configuration (sovereignty / AI routes / locale).
 * SoT: `src/lib/enterprise/tenant-policy.ts`.
 */
export type PolicyConfiguration = {
  organizationId: OrganizationId;
  dataRegion: string;
  allowedAiProviderRoutes: string[];
  preferredLocale: "en" | "ar";
};

/** Schema binding — documentation for audits; do not invent parallel tables. */
export const TENANCY_SCHEMA_BINDING = {
  platform: null,
  tenant: "organizations",
  organization: "organizations",
  workspace: "workspaces",
  membershipOrg: "organization_members",
  membershipWorkspace: "workspace_members",
  businessUnit: "organization_units",
  portfolio: "portfolios",
  program: "organization_units",
  useCase: "ai_use_cases",
  roles: "workspace_members.role | organization_members.role | user_roles",
  permissions: "src/lib/authz/{catalogue,scoped-permissions}",
  subscriptions: "entitlements",
  quotas: "plans.limits + src/lib/ai/fair-use.ts",
  featureEntitlements: "entitlements + authz catalogue",
  policyConfiguration: "enterprise tenant sovereignty policy",
} as const;

export function asTenant(org: Organization): Tenant {
  return { ...org, kind: "tenant" };
}
