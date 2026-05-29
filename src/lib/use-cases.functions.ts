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
  govFunctions: z.array(z.string()).optional().default([]),
  businessFunctions: z.array(z.string()).optional().default([]),
  maturity: z.array(z.string()).optional().default([]),
  sort: z.enum(["recent", "impact", "maturity"]).optional().default("recent"),
});

export const listUseCases = createServerFn({ method: "GET" })
  .inputValidator((d) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();

    let query = sb
      .from("use_cases")
      .select(
        `id, slug, title, summary, organization, organization_type, region, maturity, maturity_score, impact_score, published_at,
         use_case_industries ( industries ( slug, name ) ),
         use_case_capabilities ( ai_capabilities ( slug, name ) ),
         use_case_gov_functions ( gov_functions ( slug, name ) ),
         use_case_business_functions ( business_functions ( slug, name ) )`,
      )
      .eq("status", "published");

    if (data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      query = query.or(
        `title.ilike.${term},summary.ilike.${term},organization.ilike.${term}`,
      );
    }
    if (data.maturity.length) query = query.in("maturity", data.maturity as Array<"concept" | "prototype" | "pilot" | "production" | "scaled">);

    if (data.sort === "impact")
      query = query.order("impact_score", { ascending: false, nullsFirst: false });
    else if (data.sort === "maturity")
      query = query.order("maturity_score", { ascending: false, nullsFirst: false });
    else query = query.order("published_at", { ascending: false, nullsFirst: false });

    const { data: rows, error } = await query.limit(60);
    if (error) throw new Error(error.message);

    // Facet filters applied in-memory (join tables don't filter via select).
    const filtered = (rows ?? []).filter((r) => {
      const inds = r.use_case_industries?.map((x) => x.industries?.slug).filter(Boolean) ?? [];
      const caps = r.use_case_capabilities?.map((x) => x.ai_capabilities?.slug).filter(Boolean) ?? [];
      const govs = r.use_case_gov_functions?.map((x) => x.gov_functions?.slug).filter(Boolean) ?? [];
      const bfns = r.use_case_business_functions?.map((x) => x.business_functions?.slug).filter(Boolean) ?? [];
      if (data.industries.length && !data.industries.some((s) => inds.includes(s))) return false;
      if (data.capabilities.length && !data.capabilities.some((s) => caps.includes(s))) return false;
      if (data.govFunctions.length && !data.govFunctions.some((s) => govs.includes(s))) return false;
      if (data.businessFunctions.length && !data.businessFunctions.some((s) => bfns.includes(s))) return false;
      return true;
    });

    return { cases: filtered, total: filtered.length };
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
         use_case_gov_functions ( gov_functions ( slug, name ) ),
         use_case_business_functions ( business_functions ( slug, name ) ),
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
  const [ind, cap, gov, bfn] = await Promise.all([
    sb.from("industries").select("slug,name").order("name"),
    sb.from("ai_capabilities").select("slug,name").order("name"),
    sb.from("gov_functions").select("slug,name").order("name"),
    sb.from("business_functions").select("slug,name").order("name"),
  ]);
  return {
    industries: ind.data ?? [],
    capabilities: cap.data ?? [],
    govFunctions: gov.data ?? [],
    businessFunctions: bfn.data ?? [],
  };
});
