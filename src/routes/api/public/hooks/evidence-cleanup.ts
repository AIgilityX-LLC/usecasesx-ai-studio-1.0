/**
 * Scheduled cleanup of orphaned benefit evidence uploads.
 *
 * Called by the platform scheduler (pg_cron) with the project publishable key
 * in the `apikey` header. Deletes stored objects in the private evidence
 * bucket that no benefit references any more, outside the grace period.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({ dryRun: z.boolean().optional() }).default({});

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/evidence-cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"] ?? "";
        if (!key || !expected || key !== expected) return unauthorized();

        let parsed: { dryRun?: boolean } = {};
        try {
          const raw: unknown = await request.json();
          parsed = bodySchema.parse(raw ?? {});
        } catch {
          parsed = {};
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { cleanupOrphanedEvidence } = await import("@/lib/value/evidence-cleanup.server");

        try {
          const summary = await cleanupOrphanedEvidence(supabaseAdmin, {
            dryRun: parsed.dryRun ?? false,
          });
          return Response.json({ ok: true, summary });
        } catch (error) {
          console.error("[evidence-cleanup] run failed", error);
          return Response.json({ ok: false, error: "Cleanup failed" }, { status: 500 });
        }
      },
    },
  },
});
