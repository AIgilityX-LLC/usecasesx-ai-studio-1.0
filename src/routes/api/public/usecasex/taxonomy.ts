import { createFileRoute } from "@tanstack/react-router";
import { MOCK_TAX, MOCK_USE_CASES } from "@/lib/usecasex.mock";

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
          bySector: MOCK_USE_CASES.reduce<Record<string, number>>((a, c) => { a[c.sector] = (a[c.sector] ?? 0) + 1; return a; }, {}),
          byMaturity: MOCK_USE_CASES.reduce<Record<string, number>>((a, c) => { a[c.maturity] = (a[c.maturity] ?? 0) + 1; return a; }, {}),
          byImpact: MOCK_USE_CASES.reduce<Record<string, number>>((a, c) => { a[c.valuePotential] = (a[c.valuePotential] ?? 0) + 1; return a; }, {}),
        };
        return Response.json(
          {
            sectors: MOCK_TAX.sectors,
            industries: MOCK_TAX.industries,
            capabilities: MOCK_TAX.capabilities,
            businessFunctions: MOCK_TAX.businessFunctions,
            objectives: MOCK_TAX.objectives,
            tags: MOCK_TAX.tags,
            maturity: [{ slug: "Beginner", name: "Beginner" }, { slug: "Intermediate", name: "Intermediate" }, { slug: "Advanced", name: "Advanced" }],
            impact: [{ slug: "Low", name: "Low" }, { slug: "Medium", name: "Medium" }, { slug: "High", name: "High" }],
            counts,
          },
          { headers: { ...CORS, "Cache-Control": "public, max-age=300" } },
        );
      },
    },
  },
});
