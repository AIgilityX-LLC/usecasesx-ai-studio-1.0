import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}

const SELECT = `id, value_potential, complexity, risk_level, time_to_value, maturity, published_at,
  use_case_industries ( industries ( slug, name ) ),
  use_case_capabilities ( ai_capabilities ( slug, name ) ),
  use_case_business_functions ( business_functions ( slug, name ) ),
  use_case_business_objectives ( business_objectives ( slug, name ) )` as string;

export type CountItem = { slug: string; name: string; count: number };
export type RankItem = { label: string; count: number };
export type IndustryValueCell = {
  industry: string;
  slug: string;
  total: number;
  high: number;
  medium: number;
  low: number;
};

export type InsightsPayload = {
  totals: {
    useCases: number;
    industries: number;
    capabilities: number;
    businessFunctions: number;
    objectives: number;
  };
  topCapabilities: CountItem[];
  topBusinessFunctions: CountItem[];
  byIndustry: CountItem[];
  topObjectives: CountItem[];
  valuePotential: RankItem[];
  complexity: RankItem[];
  riskLevel: RankItem[];
  timeToValue: RankItem[];
  industryValue: IndustryValueCell[];
  recentCount: number;
};

function tally(map: Map<string, CountItem>, slug?: string | null, name?: string | null) {
  if (!slug) return;
  const key = slug;
  const cur = map.get(key);
  if (cur) cur.count += 1;
  else map.set(key, { slug, name: name ?? slug, count: 1 });
}

function rank(map: Map<string, number>, order: string[]): RankItem[] {
  return order
    .filter((k) => map.has(k))
    .map((k) => ({ label: k, count: map.get(k) ?? 0 }))
    .concat(
      [...map.entries()]
        .filter(([k]) => !order.includes(k))
        .map(([label, count]) => ({ label, count })),
    );
}

export const getInsights = createServerFn({ method: "GET" }).handler(
  async (): Promise<InsightsPayload> => {
    const sb = publicClient();

    const [rowsRes, indCount, capCount, bfnCount, objCount] = await Promise.all([
      sb.from("use_cases").select(SELECT).eq("status", "published").limit(2000),
      sb.from("industries").select("id", { count: "exact", head: true }),
      sb.from("ai_capabilities").select("id", { count: "exact", head: true }),
      sb.from("business_functions").select("id", { count: "exact", head: true }),
      sb.from("business_objectives").select("id", { count: "exact", head: true }),
    ]);

    if (rowsRes.error) throw new Error(rowsRes.error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (rowsRes.data ?? []) as any[];

    const caps = new Map<string, CountItem>();
    const bfns = new Map<string, CountItem>();
    const inds = new Map<string, CountItem>();
    const objs = new Map<string, CountItem>();
    const valueMap = new Map<string, number>();
    const complexityMap = new Map<string, number>();
    const riskMap = new Map<string, number>();
    const ttvMap = new Map<string, number>();
    const industryValue = new Map<string, IndustryValueCell>();

    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    let recentCount = 0;

    const bump = (m: Map<string, number>, k?: string | null) => {
      if (!k) return;
      m.set(k, (m.get(k) ?? 0) + 1);
    };

    for (const r of rows) {
      (r.use_case_capabilities ?? []).forEach((x: any) =>
        tally(caps, x.ai_capabilities?.slug, x.ai_capabilities?.name),
      );
      (r.use_case_business_functions ?? []).forEach((x: any) =>
        tally(bfns, x.business_functions?.slug, x.business_functions?.name),
      );
      (r.use_case_industries ?? []).forEach((x: any) =>
        tally(inds, x.industries?.slug, x.industries?.name),
      );
      (r.use_case_business_objectives ?? []).forEach((x: any) =>
        tally(objs, x.business_objectives?.slug, x.business_objectives?.name),
      );

      bump(valueMap, r.value_potential);
      bump(complexityMap, r.complexity);
      bump(riskMap, r.risk_level);
      bump(ttvMap, r.time_to_value);

      if (r.published_at && new Date(r.published_at).getTime() >= ninetyDaysAgo) recentCount += 1;

      const v = (r.value_potential ?? "").toLowerCase();
      (r.use_case_industries ?? []).forEach((x: any) => {
        const slug = x.industries?.slug;
        if (!slug) return;
        const cell = industryValue.get(slug) ?? {
          industry: x.industries?.name ?? slug,
          slug,
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
        cell.total += 1;
        if (v.includes("high") || v.includes("critical")) cell.high += 1;
        else if (v.includes("medium")) cell.medium += 1;
        else cell.low += 1;
        industryValue.set(slug, cell);
      });
    }

    const sortDesc = (a: CountItem, b: CountItem) => b.count - a.count;

    return {
      totals: {
        useCases: rows.length,
        industries: indCount.count ?? inds.size,
        capabilities: capCount.count ?? caps.size,
        businessFunctions: bfnCount.count ?? bfns.size,
        objectives: objCount.count ?? objs.size,
      },
      topCapabilities: [...caps.values()].sort(sortDesc).slice(0, 12),
      topBusinessFunctions: [...bfns.values()].sort(sortDesc).slice(0, 12),
      byIndustry: [...inds.values()].sort(sortDesc),
      topObjectives: [...objs.values()].sort(sortDesc).slice(0, 10),
      valuePotential: rank(valueMap, ["Critical", "High", "Medium", "Low"]),
      complexity: rank(complexityMap, ["Low", "Medium", "High"]),
      riskLevel: rank(riskMap, ["Low", "Medium", "High", "Critical"]),
      timeToValue: rank(ttvMap, ["Short", "Medium", "Long"]),
      industryValue: [...industryValue.values()].sort((a, b) => b.total - a.total),
      recentCount,
    };
  },
);
