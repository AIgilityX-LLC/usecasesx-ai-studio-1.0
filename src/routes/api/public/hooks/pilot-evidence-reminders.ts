/**
 * Scheduled evidence-gap reminder sweep.
 *
 * Called by the platform scheduler (pg_cron) with the `CRON_HOOK_SECRET`
 * shared secret in the `Authorization: Bearer …` header. Re-evaluates the
 * pilot evidence-gap watchdog and, when the window has elapsed, nudges the
 * participants whose action is missing — in-app first, then by email once a
 * sender domain is verified. Idempotent per watchdog window.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isAuthorizedCron, unauthorized } from "@/lib/cron-auth.server";

const bodySchema = z
  .object({
    dryRun: z.boolean().optional(),
    windowDays: z.number().int().min(1).max(90).optional(),
  })
  .default({});

export const Route = createFileRoute("/api/public/hooks/pilot-evidence-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedCron(request)) return unauthorized();

        let parsed: { dryRun?: boolean; windowDays?: number } = {};
        try {
          const raw: unknown = await request.json();
          parsed = bodySchema.parse(raw ?? {});
        } catch {
          parsed = {};
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          const { buildPilotTriageReport } = await import("@/lib/pilot/pilot.triage.server");
          const { sweepCohortReminders } = await import("@/lib/pilot/pilot.reminders.server");
          const { dispatchEvidenceGapEmails } = await import("@/lib/pilot/pilot.gap-emails.server");

          const report = await buildPilotTriageReport(supabaseAdmin, {
            windowDays: parsed.windowDays ?? 30,
          });

          const inApp = await sweepCohortReminders(supabaseAdmin, {
            cohort: report.cohort,
            actorId: "00000000-0000-0000-0000-000000000000",
          }).catch((error: unknown) => {
            console.error("[pilot-evidence-reminders] in-app sweep failed", error);
            return null;
          });

          const emails = await dispatchEvidenceGapEmails(supabaseAdmin, {
            cohort: report.cohort,
            gap: report.evidenceGap,
            dryRun: parsed.dryRun ?? false,
          });

          return Response.json({
            ok: true,
            cohort: report.cohort,
            evidenceGap: {
              state: report.evidenceGap.state,
              triggered: report.evidenceGap.triggered,
              daysOpen: report.evidenceGap.daysOpen,
            },
            inApp,
            emails,
          });
        } catch (error) {
          console.error("[pilot-evidence-reminders] run failed", error);
          return Response.json({ ok: false, error: "Reminder sweep failed" }, { status: 500 });
        }
      },
    },
  },
});
