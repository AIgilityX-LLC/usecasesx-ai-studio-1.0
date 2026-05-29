import { createFileRoute } from "@tanstack/react-router";
import { MOCK_USE_CASES } from "@/lib/usecasex.mock";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/usecasex/use-cases/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const uc = MOCK_USE_CASES.find((u) => u.slug === params.slug || u.id === params.slug);
        if (!uc) {
          return Response.json({ error: "Not found" }, { status: 404, headers: CORS });
        }
        const related = MOCK_USE_CASES
          .filter((u) => u.slug !== uc.slug && (u.industry.slug === uc.industry.slug || u.tags.some((t) => uc.tags.includes(t))))
          .slice(0, 4)
          .map((u) => ({ id: u.id, slug: u.slug, title: u.title, industry: u.industry }));
        return Response.json({ data: uc, related }, { headers: { ...CORS, "Cache-Control": "public, max-age=300" } });
      },
    },
  },
});
