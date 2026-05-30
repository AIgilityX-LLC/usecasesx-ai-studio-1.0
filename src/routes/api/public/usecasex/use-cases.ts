import { createFileRoute } from "@tanstack/react-router";
import { filterAndSortMock, type MockFilters, type SortKey } from "@/lib/usecasex.mock";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const arr = (sp: URLSearchParams, k: string): string[] => {
  const all = sp.getAll(k);
  if (all.length > 1) return all;
  const one = sp.get(k);
  if (!one) return [];
  return one.split(",").map((s) => s.trim()).filter(Boolean);
};

export const Route = createFileRoute("/api/public/usecasex/use-cases")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sp = url.searchParams;
        const page = Math.max(1, Math.min(parseInt(sp.get("page") ?? "1", 10) || 1, 1000));
        const limit = Math.max(1, Math.min(parseInt(sp.get("limit") ?? "20", 10) || 20, 100));
        const sort = (sp.get("sort") ?? undefined) as SortKey | undefined;

        const filters: MockFilters = {
          q: sp.get("q") ?? "",
          industries: arr(sp, "industries").concat(arr(sp, "industry")),
          capabilities: arr(sp, "capabilities"),
          businessFunctions: arr(sp, "businessFunctions"),
          objectives: arr(sp, "objectives"),
          maturity: arr(sp, "maturity"),
          valuePotential: arr(sp, "valuePotential").concat(arr(sp, "impact")),
          complexity: arr(sp, "complexity"),
          riskLevel: arr(sp, "riskLevel"),
          timeToValue: arr(sp, "timeToValue"),
          sectors: arr(sp, "sectors").concat(arr(sp, "sector")),
          tags: arr(sp, "tags"),
          sort,
        };

        const all = filterAndSortMock(filters);
        const start = (page - 1) * limit;
        const items = all.slice(start, start + limit);

        const slugs = items.map((i) => i.slug);
        const aggMap = new Map<string, { avg: number | null; count: number }>();
        if (slugs.length > 0) {
          const { data: aggs } = await supabaseAdmin
            .from("use_case_rating_aggregates")
            .select("use_case_slug, avg_rating, rating_count")
            .in("use_case_slug", slugs);
          for (const a of aggs ?? []) {
            if (!a.use_case_slug) continue;
            aggMap.set(a.use_case_slug, {
              avg: a.avg_rating ? Number(a.avg_rating) : null,
              count: a.rating_count ?? 0,
            });
          }
        }

        const data = items.map((i) => ({
          ...i,
          aggregate_rating: aggMap.get(i.slug) ?? { avg: null, count: 0 },
        }));

        return Response.json(
          {
            data,
            pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) },
            filters,
          },
          { headers: { ...CORS, "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
