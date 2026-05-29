import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const ListInput = z.object({
  q: z.string().optional().default(""),
  industries: z.array(z.string()).optional().default([]),
  capabilities: z.array(z.string()).optional().default([]),
  businessFunctions: z.array(z.string()).optional().default([]),
  objectives: z.array(z.string()).optional().default([]),
  maturity: z.array(z.string()).optional().default([]),
  valuePotential: z.array(z.string()).optional().default([]),
  complexity: z.array(z.string()).optional().default([]),
  riskLevel: z.array(z.string()).optional().default([]),
  timeToValue: z.array(z.string()).optional().default([]),
  sort: z.enum(["recent", "impact", "maturity", "featured"]).optional().default("recent"),
  featuredOnly: z.boolean().optional().default(false),
  landingOnly: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(120).optional().default(60),
});

const SELECT = `id, slug, title, summary, organization, organization_type, region,
  maturity, maturity_level, maturity_score, impact_score,
  value_potential, complexity, risk_level, time_to_value,
  is_featured, show_on_landing, display_order, published_at,
  use_case_industries ( industries ( slug, name ) ),
  use_case_capabilities ( ai_capabilities ( slug, name ) ),
  use_case_business_functions ( business_functions ( slug, name ) ),
  use_case_business_objectives ( business_objectives ( slug, name ) )` as string;

export const listUseCases = createServerFn({ method: "GET" })
  .inputValidator((d) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();

    let query = sb.from("use_cases").select(SELECT).eq("status", "published");

    if (data.featuredOnly) query = query.eq("is_featured", true);
    if (data.landingOnly) query = query.eq("show_on_landing", true);
    if (data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      query = query.or(
        `title.ilike.${term},summary.ilike.${term},organization.ilike.${term},business_problem.ilike.${term}`,
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

    if (data.sort === "impact")
      query = query.order("impact_score", { ascending: false, nullsFirst: false });
    else if (data.sort === "maturity")
      query = query.order("maturity_score", { ascending: false, nullsFirst: false });
    else if (data.sort === "featured")
      query = query.order("display_order", { ascending: true });
    else query = query.order("published_at", { ascending: false, nullsFirst: false });
    query = query.order("id", { ascending: true });

    const { data: rows, error } = await query.limit(data.limit);
    if (error) throw new Error(error.message);

    const filtered = (rows ?? []).filter((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;
      const inds: string[] = r.use_case_industries?.map((x: any) => x.industries?.slug).filter(Boolean) ?? [];
      const caps: string[] = r.use_case_capabilities?.map((x: any) => x.ai_capabilities?.slug).filter(Boolean) ?? [];
      const bfns: string[] = r.use_case_business_functions?.map((x: any) => x.business_functions?.slug).filter(Boolean) ?? [];
      const objs: string[] = r.use_case_business_objectives?.map((x: any) => x.business_objectives?.slug).filter(Boolean) ?? [];
      if (data.industries.length && !data.industries.some((s) => inds.includes(s))) return false;
      if (data.capabilities.length && !data.capabilities.some((s) => caps.includes(s))) return false;
      if (data.businessFunctions.length && !data.businessFunctions.some((s) => bfns.includes(s)))
        return false;
      if (data.objectives.length && !data.objectives.some((s) => objs.includes(s))) return false;
      return true;
    });

    return { cases: filtered as Array<Record<string, any>>, total: filtered.length };
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
  const [ind, cap, bfn, obj] = await Promise.all([
    sb.from("industries").select("slug,name").order("name"),
    sb.from("ai_capabilities").select("slug,name").order("name"),
    sb.from("business_functions").select("slug,name").order("name"),
    sb.from("business_objectives").select("slug,name").order("name"),
  ]);
  return {
    industries: ind.data ?? [],
    capabilities: cap.data ?? [],
    businessFunctions: bfn.data ?? [],
    objectives: obj.data ?? [],
  };
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
