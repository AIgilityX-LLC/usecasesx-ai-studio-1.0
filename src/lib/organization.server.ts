/**
 * Server-only helpers for the organization + taxonomy model.
 * Never imported from client code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Taxonomy dimensions that support tenant-private entries. */
export const TENANT_TAXONOMY_TABLES = [
  "taxonomy_processes",
  "taxonomy_strategic_themes",
  "taxonomy_value_themes",
] as const;

export type TenantTaxonomyTable = (typeof TENANT_TAXONOMY_TABLES)[number];

/**
 * Resolve the caller's organization and confirm they may administer it.
 * RLS also enforces this; the explicit check produces a clear error instead of
 * a silent zero-row write.
 */
export async function requireOrgManager(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members" as any)
    .select("organization_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const row = data as any;
  if (!row?.organization_id) {
    throw new Error("No organization is provisioned for this account yet.");
  }
  if (!["owner", "admin"].includes(row.role)) {
    throw new Error("Only workspace owners and admins can change the organization structure.");
  }
  return { organizationId: row.organization_id as string, role: row.role as string };
}

export async function resolveOrganizationId(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members" as any)
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return {
    organizationId: ((data as any)?.organization_id ?? null) as string | null,
    role: ((data as any)?.role ?? null) as string | null,
  };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
