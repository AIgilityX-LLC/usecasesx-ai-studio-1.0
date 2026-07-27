import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const unitTypeSchema = z.enum([
  "group",
  "company",
  "business_unit",
  "department",
  "team",
  "program",
  "project",
]);

const taxonomyTableSchema = z.enum([
  "taxonomy_processes",
  "taxonomy_strategic_themes",
  "taxonomy_value_themes",
]);

/** Organization units + taxonomy visible to the caller (RLS scoped). */
export const getOrganizationSetupFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveOrganizationId } = await import("@/lib/organization.server");
    const supabase = context.supabase as any;
    const { organizationId, role } = await resolveOrganizationId(supabase, context.userId);

    const [org, units, processes, strategic, value, risk, lifecycle] = await Promise.all([
      organizationId
        ? supabase.from("organizations").select("id, name, plan").eq("id", organizationId).maybeSingle()
        : Promise.resolve({ data: null }),
      organizationId
        ? supabase
            .from("organization_units")
            .select("id, name, slug, unit_type, parent_id, description, sort_order, is_active")
            .eq("organization_id", organizationId)
            .order("sort_order")
            .order("name")
        : Promise.resolve({ data: [] }),
      supabase.from("taxonomy_processes").select("id, name, slug, organization_id, sort_order").order("sort_order"),
      supabase.from("taxonomy_strategic_themes").select("id, name, slug, organization_id, sort_order").order("sort_order"),
      supabase.from("taxonomy_value_themes").select("id, name, slug, organization_id, sort_order").order("sort_order"),
      supabase.from("taxonomy_risk_levels").select("id, name, slug, sort_order").order("sort_order"),
      supabase.from("taxonomy_lifecycle_stages").select("id, name, slug, sort_order").order("sort_order"),
    ]);

    return {
      organization: (org as any)?.data ?? null,
      canManage: role === "owner" || role === "admin",
      units: ((units as any)?.data ?? []) as any[],
      taxonomy: {
        taxonomy_processes: ((processes as any)?.data ?? []) as any[],
        taxonomy_strategic_themes: ((strategic as any)?.data ?? []) as any[],
        taxonomy_value_themes: ((value as any)?.data ?? []) as any[],
        risk_levels: ((risk as any)?.data ?? []) as any[],
        lifecycle_stages: ((lifecycle as any)?.data ?? []) as any[],
      },
    };
  });

export const saveOrganizationUnitFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(120),
        unitType: unitTypeSchema,
        parentId: z.string().uuid().nullable().optional(),
        description: z.string().trim().max(400).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { requireOrgManager, slugify } = await import("@/lib/organization.server");
    const supabase = context.supabase as any;
    const { organizationId } = await requireOrgManager(supabase, context.userId);

    const payload = {
      organization_id: organizationId,
      name: data.name,
      slug: slugify(data.name),
      unit_type: data.unitType,
      parent_id: data.parentId ?? null,
      description: data.description ?? null,
    };

    const query = data.id
      ? supabase.from("organization_units").update(payload).eq("id", data.id).eq("organization_id", organizationId).select("id").maybeSingle()
      : supabase.from("organization_units").insert(payload).select("id").maybeSingle();

    const { data: row, error } = await query;
    if (error) throw error;
    return { id: (row as any)?.id ?? data.id ?? null };
  });

export const deleteOrganizationUnitFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const supabase = context.supabase as any;
    const { organizationId } = await requireOrgManager(supabase, context.userId);
    const { error } = await supabase
      .from("organization_units")
      .delete()
      .eq("id", data.id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return { ok: true };
  });

/** Create a taxonomy entry that is private to the caller's organization. */
export const createPrivateTaxonomyEntryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        table: taxonomyTableSchema,
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(400).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { requireOrgManager, slugify } = await import("@/lib/organization.server");
    const supabase = context.supabase as any;
    const { organizationId } = await requireOrgManager(supabase, context.userId);
    const { data: row, error } = await supabase
      .from(data.table)
      .insert({
        organization_id: organizationId,
        name: data.name,
        slug: slugify(data.name),
        description: data.description ?? null,
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return { id: (row as any)?.id ?? null };
  });

export const deletePrivateTaxonomyEntryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ table: taxonomyTableSchema, id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { requireOrgManager } = await import("@/lib/organization.server");
    const supabase = context.supabase as any;
    const { organizationId } = await requireOrgManager(supabase, context.userId);
    const { error } = await supabase
      .from(data.table)
      .delete()
      .eq("id", data.id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    return { ok: true };
  });
