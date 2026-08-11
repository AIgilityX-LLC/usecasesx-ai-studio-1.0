import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

const ListInput = z.object({
  q: z.string().optional().default(""),
  industries: z.array(z.string()).optional().default([]),
  capabilities: z.array(z.string()).optional().default([]),
  businessFunctions: z.array(z.string()).optional().default([]),
  objectives: z.array(z.string()).optional().default([]),
  processes: z.array(z.string()).optional().default([]),
  /** ISO country codes (see `countries.code`). */
  countries: z.array(z.string()).optional().default([]),
  /** Public-sector government function slugs (see `gov_functions.slug`). */
  govFunctions: z.array(z.string()).optional().default([]),
  maturity: z.array(z.string()).optional().default([]),
  valuePotential: z.array(z.string()).optional().default([]),
  complexity: z.array(z.string()).optional().default([]),
  riskLevel: z.array(z.string()).optional().default([]),
  timeToValue: z.array(z.string()).optional().default([]),
  deploymentModel: z.array(z.string()).optional().default([]),
  securityClassification: z.array(z.string()).optional().default([]),
  /** Provenance labels (see `validate_use_case_provenance`). */
  provenance: z.array(z.string()).optional().default([]),
  /** Quality gate status. Published content is always `quality_passed`. */
  qualityStatus: z.array(z.string()).optional().default([]),
  sort: z.enum(["recent", "impact", "maturity", "featured"]).optional().default("recent"),
  featuredOnly: z.boolean().optional().default(false),
  landingOnly: z.boolean().optional().default(false),
  /** Page size. `limit` is kept as the legacy alias used by existing callers. */
  limit: z.number().int().min(1).max(120).optional().default(60),
  page: z.number().int().min(1).max(500).optional().default(1),
});

const SELECT = `id, slug, title, summary, organization, organization_type, region,
  maturity, maturity_level, maturity_score, impact_score,
  value_potential, complexity, risk_level, time_to_value, visibility,
  deployment_model, security_classification, cost_range,
  is_featured, show_on_landing, display_order, published_at,
  provenance, provenance_note, quality_status, quality_checked_at,
  use_case_industries ( industries ( slug, name ) ),
  use_case_capabilities ( ai_capabilities ( slug, name ) ),
  use_case_business_functions ( business_functions ( slug, name ) ),
  use_case_business_objectives ( business_objectives ( slug, name ) ),
  use_case_countries ( countries ( code, name, region ) ),
  use_case_gov_functions ( gov_functions ( slug, name ) )` as string;

/** Link tables that map a use case to a taxonomy term, keyed by facet name. */
const TAXONOMY_JOINS = {
  industries: { table: "use_case_industries", ref: "industries", key: "slug" },
  capabilities: { table: "use_case_capabilities", ref: "ai_capabilities", key: "slug" },
  businessFunctions: {
    table: "use_case_business_functions",
    ref: "business_functions",
    key: "slug",
  },
  objectives: { table: "use_case_business_objectives", ref: "business_objectives", key: "slug" },
  processes: { table: "use_case_processes", ref: "taxonomy_processes", key: "slug" },
  countries: { table: "use_case_countries", ref: "countries", key: "code" },
  govFunctions: { table: "use_case_gov_functions", ref: "gov_functions", key: "slug" },
} as const;

type TaxonomyFacet = keyof typeof TAXONOMY_JOINS;

/**
 * Resolve the set of use-case ids carrying ANY of `slugs` for one facet.
 * Runs against RLS-protected public link tables, so unpublished or private
 * rows can never leak into the id set.
 */
async function idsForFacet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  facet: TaxonomyFacet,
  slugs: string[],
): Promise<string[]> {
  const join = TAXONOMY_JOINS[facet];
  const { data, error } = await sb
    .from(join.table)
    .select(`use_case_id, ${join.ref}!inner(${join.key})`)
    .in(`${join.ref}.${join.key}`, slugs);
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Array.from(new Set((data ?? []).map((r: any) => r.use_case_id as string)));
}

export const listUseCases = createServerFn({ method: "GET" })
  .inputValidator((d) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();

    // 1. Intersect taxonomy facets into a concrete id set so counting and
    //    pagination stay deterministic and happen in the database.
    const facetSelections: Array<[TaxonomyFacet, string[]]> = (
      Object.keys(TAXONOMY_JOINS) as TaxonomyFacet[]
    )
      .map((facet) => [facet, data[facet] ?? []] as [TaxonomyFacet, string[]])
      .filter(([, slugs]) => slugs.length > 0);

    let idFilter: string[] | null = null;
    for (const [facet, slugs] of facetSelections) {
      const ids = await idsForFacet(sb, facet, slugs);
      idFilter = idFilter === null ? ids : idFilter.filter((id) => ids.includes(id));
      if (idFilter.length === 0) break;
    }

    const pageSize = data.limit;
    const page = data.page;

    if (idFilter !== null && idFilter.length === 0) {
      return { cases: [], total: 0, page, pageSize, hasMore: false };
    }

    let query = sb.from("use_cases").select(SELECT, { count: "exact" }).eq("status", "published");

    if (idFilter !== null) query = query.in("id", idFilter);
    if (data.featuredOnly) query = query.eq("is_featured", true);
    if (data.landingOnly) query = query.eq("show_on_landing", true);
    if (data.q.trim()) {
      // Escape PostgREST `or()` delimiters so a stray comma or parenthesis in a
      // user query cannot alter the filter expression.
      const term = `%${data.q.trim().replace(/[(),*]/g, " ")}%`;
      query = query.or(
        `title.ilike.${term},summary.ilike.${term},organization.ilike.${term},business_problem.ilike.${term},ai_solution_concept.ilike.${term},deployment_model.ilike.${term},security_classification.ilike.${term}`,
      );
    }
    if (data.maturity.length)
      query = query.in(
        "maturity",
        data.maturity as Array<"concept" | "prototype" | "pilot" | "production" | "scaled">,
      );
    if (data.valuePotential.length) query = query.in("value_potential", data.valuePotential);
    if (data.complexity.length) query = query.in("complexity", data.complexity);
    if (data.riskLevel.length) query = query.in("risk_level", data.riskLevel);
    if (data.timeToValue.length) query = query.in("time_to_value", data.timeToValue);
    if (data.deploymentModel.length) query = query.in("deployment_model", data.deploymentModel);
    if (data.securityClassification.length)
      query = query.in("security_classification", data.securityClassification);
    if (data.provenance.length) query = query.in("provenance", data.provenance);
    if (data.qualityStatus.length) query = query.in("quality_status", data.qualityStatus);
    if (data.sort === "impact")
      query = query.order("impact_score", { ascending: false, nullsFirst: false });
    else if (data.sort === "maturity")
      query = query.order("maturity_score", { ascending: false, nullsFirst: false });
    else if (data.sort === "featured") query = query.order("display_order", { ascending: true });
    else query = query.order("published_at", { ascending: false, nullsFirst: false });
    // Stable tiebreaker keeps pagination deterministic across requests.
    query = query.order("id", { ascending: true });

    const from = (page - 1) * pageSize;
    const { data: rows, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    const total = count ?? (rows ?? []).length;
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cases: (rows ?? []) as Array<Record<string, any>>,
      total,
      page,
      pageSize,
      hasMore: from + (rows ?? []).length < total,
    };
  });

/**
 * Facet options that actually exist on published public content, with real
 * counts. Used to build curated collections and to hide facets that would
 * always return zero results.
 */
export const listRepositoryFacets = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();

  async function countsFor(facet: TaxonomyFacet) {
    const join = TAXONOMY_JOINS[facet];
    const { data, error } = await sb
      .from(join.table)
      .select(`use_case_id, ${join.ref}!inner(${join.key}, name), use_cases!inner(visibility)`)
      .in("use_cases.visibility", ["free_lite", "both"]);
    if (error) throw new Error(error.message);

    const bySlug = new Map<string, { slug: string; name: string; count: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const ref = row[join.ref];
      const slug = ref?.[join.key] as string | undefined;
      if (!slug) continue;
      const entry = bySlug.get(slug) ?? {
        slug,
        name: ref.name ?? slug,
        count: 0,
      };
      entry.count += 1;
      bySlug.set(slug, entry);
    }
    return Array.from(bySlug.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }

  const [industries, capabilities, businessFunctions, objectives, processes, countries, govFunctions] =
    await Promise.all([
      countsFor("industries"),
      countsFor("capabilities"),
      countsFor("businessFunctions"),
      countsFor("objectives"),
      countsFor("processes"),
      countsFor("countries"),
      countsFor("govFunctions"),
    ]);

  return {
    industries,
    capabilities,
    businessFunctions,
    objectives,
    processes,
    countries,
    govFunctions,
  };
});

export const getUseCase = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("use_cases")
      .select(
        `*,
         use_case_industries ( industries ( slug, name ) ),
         use_case_capabilities ( ai_capabilities ( slug, name ) ),
         use_case_business_functions ( business_functions ( slug, name ) ),
         use_case_business_objectives ( business_objectives ( slug, name ) ),
         use_case_countries ( countries ( code, name, region ) ),
         use_case_gov_functions ( gov_functions ( slug, name ) ),
         use_case_metrics ( id, label, value, unit, sort_order ),
         use_case_links ( id, label, url, kind )`,
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Use case not found");
    return row;
  });

export const listTaxonomies = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [ind, cap, bfn, obj, ctry, gov] = await Promise.all([
    sb.from("industries").select("slug,name").order("name"),
    sb.from("ai_capabilities").select("slug,name").order("name"),
    sb.from("business_functions").select("slug,name").order("name"),
    sb.from("business_objectives").select("slug,name").order("name"),
    sb.from("countries").select("code,name,region").order("name"),
    sb.from("gov_functions").select("slug,name").order("name"),
  ]);
  return {
    industries: ind.data ?? [],
    capabilities: cap.data ?? [],
    businessFunctions: bfn.data ?? [],
    objectives: obj.data ?? [],
    countries: (ctry.data ?? []).map((c) => ({
      slug: c.code,
      name: c.name,
      region: c.region ?? null,
    })),
    govFunctions: gov.data ?? [],
  };
});

export const listPlatformModules = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("platform_modules")
    .select("slug,name,category,description,external_url,sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// --- Lead capture ---------------------------------------------------------
const LeadInput = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().max(200).optional().nullable(),
  role: z.string().max(200).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  interestArea: z.string().max(200).optional().nullable(),
  sourceUseCase: z.string().uuid().optional().nullable(),
  sourcePage: z.string().max(500).optional().nullable(),
  cta: z.string().max(100).optional().nullable(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d) => LeadInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { error } = await sb.from("lead_captures").insert({
      full_name: data.fullName,
      email: data.email,
      company: data.company ?? null,
      role: data.role ?? null,
      country: data.country ?? null,
      industry: data.industry ?? null,
      interest_area: data.interestArea ?? null,
      source_use_case: data.sourceUseCase ?? null,
      source_page: data.sourcePage ?? null,
      cta: data.cta ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- CTA event log --------------------------------------------------------
const CtaInput = z.object({
  cta: z.string().min(1).max(100),
  useCaseId: z.string().uuid().optional().nullable(),
  targetPlatform: z.string().max(100).optional().nullable(),
  targetRoute: z.string().max(500).optional().nullable(),
  sourcePage: z.string().max(500).optional().nullable(),
});

export const logCtaEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => CtaInput.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { error } = await sb.from("cta_events").insert({
      cta: data.cta,
      use_case_id: data.useCaseId ?? null,
      target_platform: data.targetPlatform ?? null,
      target_route: data.targetRoute ?? null,
      source_page: data.sourcePage ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
