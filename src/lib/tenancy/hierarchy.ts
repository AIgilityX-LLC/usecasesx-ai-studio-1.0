/**
 * Enterprise organizational hierarchy for UseCasesX™.
 *
 * Platform
 *    ↓
 * Tenant / Organization   (`organizations`)
 *    ↓
 * Business Unit           (`organization_units` where unit_type = business_unit)
 *    ↓
 * Portfolio               (`portfolios`, scoped by workspace/org)
 *    ↓
 * Program / Initiative    (`organization_units` unit_type = program, or nested portfolio)
 *    ↓
 * Use Case                (`ai_use_cases`)
 *
 * Workspaces sit beside this tree as the **active working context** inside a
 * tenant (membership + RLS boundary), not as a separate hierarchy node that
 * replaces portfolio/program.
 */

import { TENANCY_SCHEMA_BINDING } from "./models";

export const HIERARCHY_LEVELS = [
  "platform",
  "tenant",
  "business_unit",
  "portfolio",
  "program",
  "use_case",
] as const;

export type HierarchyLevel = (typeof HIERARCHY_LEVELS)[number];

export type HierarchyNode = {
  level: HierarchyLevel;
  id: string | null;
  label?: string | null;
  parentId?: string | null;
};

/** Human-readable level labels for docs / admin surfaces. */
export const HIERARCHY_LABEL: Record<HierarchyLevel, string> = {
  platform: "Platform",
  tenant: "Tenant / Organization",
  business_unit: "Business Unit",
  portfolio: "Portfolio",
  program: "Program / Initiative",
  use_case: "Use Case",
};

/** Which table (if any) owns each level. */
export const HIERARCHY_TABLE: Record<HierarchyLevel, string | null> = {
  platform: TENANCY_SCHEMA_BINDING.platform,
  tenant: TENANCY_SCHEMA_BINDING.tenant,
  business_unit: TENANCY_SCHEMA_BINDING.businessUnit,
  portfolio: TENANCY_SCHEMA_BINDING.portfolio,
  program: TENANCY_SCHEMA_BINDING.program,
  use_case: TENANCY_SCHEMA_BINDING.useCase,
};

export type HierarchyPath = {
  platform: true;
  tenantId: string | null;
  businessUnitId: string | null;
  portfolioId: string | null;
  programId: string | null;
  useCaseId: string | null;
  /** Active workspace context (membership boundary), not a hierarchy parent. */
  workspaceId: string | null;
};

export function emptyHierarchyPath(partial?: Partial<HierarchyPath>): HierarchyPath {
  return {
    platform: true,
    tenantId: null,
    businessUnitId: null,
    portfolioId: null,
    programId: null,
    useCaseId: null,
    workspaceId: null,
    ...partial,
  };
}

/**
 * Build a path from known ids. Missing parents stay null — callers must not
 * invent tenant ids from the client.
 */
export function buildHierarchyPath(input: {
  tenantId?: string | null;
  organizationId?: string | null;
  businessUnitId?: string | null;
  portfolioId?: string | null;
  programId?: string | null;
  useCaseId?: string | null;
  workspaceId?: string | null;
}): HierarchyPath {
  const tenantId = input.tenantId ?? input.organizationId ?? null;
  return emptyHierarchyPath({
    tenantId,
    businessUnitId: input.businessUnitId ?? null,
    portfolioId: input.portfolioId ?? null,
    programId: input.programId ?? null,
    useCaseId: input.useCaseId ?? null,
    workspaceId: input.workspaceId ?? null,
  });
}

/** Child level immediately under `level`, or null at the leaf. */
export function childLevel(level: HierarchyLevel): HierarchyLevel | null {
  const i = HIERARCHY_LEVELS.indexOf(level);
  if (i < 0 || i >= HIERARCHY_LEVELS.length - 1) return null;
  return HIERARCHY_LEVELS[i + 1] ?? null;
}

/** True when `child` is strictly below `parent` in the hierarchy. */
export function isDescendantLevel(parent: HierarchyLevel, child: HierarchyLevel): boolean {
  return HIERARCHY_LEVELS.indexOf(child) > HIERARCHY_LEVELS.indexOf(parent);
}
