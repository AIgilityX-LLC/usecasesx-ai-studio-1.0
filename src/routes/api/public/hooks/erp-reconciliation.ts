/**
 * Scheduled ERP reconciliation endpoint.
 *
 * Called by the platform scheduler (pg_cron). Authenticated with the project
 * publishable key in the `apikey` header — the handler refuses anything else
 * before touching data.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z
  .object({ limit: z.number().int().min(1).max(2000).optional() })
  .default({});

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/erp-reconciliation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        if (!key || !expected || key !== expected) return unauthorized();

        let parsed: { limit?: number } = {};
        try {
          const raw: unknown = await request.json();
          parsed = bodySchema.parse(raw ?? {});
        } catch {
          parsed = {};
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { reconcileBenefits } = await import("@/lib/value/erp-reconciliation.server");

        try {
          const summary = await reconcileBenefits(supabaseAdmin, {
            ...(parsed.limit ? { limit: parsed.limit } : {}),
          });
          return Response.json({ ok: true, summary });
        } catch (error) {
          console.error("[erp-reconciliation] run failed", error);
          return Response.json({ ok: false, error: "Reconciliation failed" }, { status: 500 });
        }
      },
    },
  },
});
