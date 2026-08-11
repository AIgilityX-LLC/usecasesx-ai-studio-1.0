/**
 * Report export server functions — thin wrappers only (AGENTS.md §3).
 *
 * Every download path calls this before a file is produced, so a hidden button
 * is never the control that stops an unauthorized export. Each verdict is
 * appended to the export/download audit trail, and repeated refusals engage a
 * short cooldown (the retry shield) instead of re-running authorization per click.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXPORT_FORMATS } from "@/lib/reports/report-access";

const input = z.object({
  format: z.enum(EXPORT_FORMATS),
  workspaceId: z.string().uuid().nullish(),
  /** Report kind or artefact name, recorded on the audit trail. */
  subject: z.string().trim().max(160).nullish(),
});

export const authorizeReportExportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { authorizeExport } = await import("@/lib/reports/report-access.server");
    const obs = await import("@/lib/observability/observability.server");

    const shield = await obs.exportRetryShield(context.supabase, context.userId);
    if (shield.blocked) {
      await obs.recordExportEvent(context.supabase, context.userId, {
        outcome: "throttled",
        format: data.format,
        workspaceId: data.workspaceId ?? null,
        subject: data.subject ?? null,
        reason: `Cooldown after ${shield.failures} refused attempts`,
      });
      return {
        allowed: false as const,
        reason: shield.reason,
        retryAfterSeconds: shield.retryAfterSeconds,
      };
    }

    const verdict = await authorizeExport(
      context.supabase,
      context.userId,
      data.format,
      data.workspaceId ?? null,
    );

    await obs.recordExportEvent(context.supabase, context.userId, {
      outcome: verdict.allowed ? "downloaded" : "denied",
      format: data.format,
      workspaceId: verdict.allowed ? verdict.workspaceId : (data.workspaceId ?? null),
      subject: data.subject ?? null,
      reason: verdict.allowed ? null : verdict.reason,
      role: verdict.allowed ? verdict.role : null,
    });

    return verdict;
  });
