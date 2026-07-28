import { createFileRoute } from "@tanstack/react-router";
import { MOCK_TAX, MOCK_USE_CASES } from "@/lib/usecasex.mock";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/usecasex/taxonomy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const counts = {
          total: MOCK_USE_CASES.length,
          bySector: MOCK_USE_CASES.reduce<Record<string, number>>((a, c) => {
            a[c.sector] = (a[c.sector] ?? 0) + 1;
            return a;
          }, {}),
          byMaturity: MOCK_USE_CASES.reduce<Record<string, number>>((a, c) => {
            a[c.maturity] = (a[c.maturity] ?? 0) + 1;
            return a;
          }, {}),
          byImpact: MOCK_USE_CASES.reduce<Record<string, number>>((a, c) => {
            a[c.valuePotential] = (a[c.valuePotential] ?? 0) + 1;
            return a;
          }, {}),
        };

        // Merge published DB taxonomy on top of mock-derived facets
        const [dbSectors, dbTags, dbMaturity, meta] = await Promise.all([
          supabaseAdmin
            .from("taxonomy_sectors")
            .select("slug, name, description, sort_order")
            .eq("is_published", true)
            .order("sort_order"),
          supabaseAdmin
            .from("taxonomy_tags")
            .select("slug, name, description, sort_order")
            .eq("is_published", true)
            .order("sort_order"),
          supabaseAdmin
            .from("taxonomy_maturity_levels")
            .select("slug, name, description, sort_order")
            .eq("is_published", true)
            .order("sort_order"),
          supabaseAdmin
            .from("taxonomy_meta")
            .select("version, published_at")
            .eq("id", 1)
            .maybeSingle(),
        ]);

        const mergeBySlug = <T extends { slug: string }>(base: T[], extra: T[]) => {
          const map = new Map<string, T>();
          for (const b of base) map.set(b.slug, b);
          for (const e of extra) map.set(e.slug, { ...map.get(e.slug), ...e });
          return Array.from(map.values());
        };

        const mockMaturity = [
          { slug: "Beginner", name: "Beginner" },
          { slug: "Intermediate", name: "Intermediate" },
          { slug: "Advanced", name: "Advanced" },
        ];

        return Response.json(
          {
            sectors: mergeBySlug(MOCK_TAX.sectors as any, (dbSectors.data ?? []) as any),
            industries: MOCK_TAX.industries,
            capabilities: MOCK_TAX.capabilities,
            businessFunctions: MOCK_TAX.businessFunctions,
            objectives: MOCK_TAX.objectives,
            tags: mergeBySlug(MOCK_TAX.tags as any, (dbTags.data ?? []) as any),
            maturity: mergeBySlug(mockMaturity as any, (dbMaturity.data ?? []) as any),
            impact: [
              { slug: "Low", name: "Low" },
              { slug: "Medium", name: "Medium" },
              { slug: "High", name: "High" },
            ],
            counts,
            version: meta.data?.version ?? 1,
            published_at: meta.data?.published_at ?? null,
          },
          { headers: { ...CORS, "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
