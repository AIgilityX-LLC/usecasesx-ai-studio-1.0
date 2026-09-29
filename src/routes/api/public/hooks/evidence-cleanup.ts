/**
 * Scheduled cleanup of orphaned benefit evidence uploads.
 *
 * Called by the platform scheduler (pg_cron) with the `CRON_HOOK_SECRET`
 * shared secret in the `Authorization: Bearer …` header. Deletes stored
 * objects in the private evidence bucket that no benefit references any
 * more, outside the grace period.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isAuthorizedCron, unauthorized } from "@/lib/cron-auth.server";

const bodySchema = z.object({ dryRun: z.boolean().optional() }).default({});

export const Route = createFileRoute("/api/public/hooks/evidence-cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCron(request)) return unauthorized();
        const { assertOptionalWebhookReplay } = await import("@/lib/cron-auth.server");
        const replay = assertOptionalWebhookReplay(request);
        if (replay) return replay;

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
