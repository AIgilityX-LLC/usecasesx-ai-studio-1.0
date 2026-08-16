/**
 * Scheduled confirmation-email delivery alert sweep.
 *
 * Called by the platform scheduler with the `CRON_HOOK_SECRET` shared secret.
 * Recomputes delivery health for the sender domain and notifies the operations
 * destination when the failure, suppression or retry-exhaustion thresholds are
 * crossed. Read-only apart from the notification itself.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isAuthorizedCron, unauthorized } from "@/lib/cron-auth.server";

const bodySchema = z
  .object({
    windowHours: z.number().int().min(1).max(720).optional(),
    dryRun: z.boolean().optional(),
  })
  .default({});

export const Route = createFileRoute("/api/public/hooks/email-delivery-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCron(request)) return unauthorized();

        let parsed: { windowHours?: number; dryRun?: boolean } = {};
        try {
          parsed = bodySchema.parse((await request.json()) ?? {});
        } catch {
          parsed = {};
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { buildDeliveryHealthReport, dispatchDeliveryAlerts } = await import(
            "@/lib/leads/email-health.server"
          );
          const report = await buildDeliveryHealthReport(supabaseAdmin, {
            windowHours: parsed.windowHours,
          });
          const dispatch = parsed.dryRun
            ? { notified: false, channel: "log" as const, alerts: report.alerts.length }
            : await dispatchDeliveryAlerts(report);
          return Response.json({ ok: true, summary: report.summary, dispatch });
        } catch (error) {
          console.error("[email-delivery-alerts] sweep failed", error);
          return Response.json({ ok: false, error: "Alert sweep failed" }, { status: 500 });
        }
      },
    },
  },
});
