/**
 * Report export server functions — thin wrappers only (AGENTS.md §3).
 *
 * Every download path calls this before a file is produced, so a hidden button
 * is never the control that stops an unauthorized export.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXPORT_FORMATS } from "@/lib/reports/report-access";

const input = z.object({
  format: z.enum(EXPORT_FORMATS),
  workspaceId: z.string().uuid().nullish(),
});

export const authorizeReportExportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { authorizeExport } = await import("@/lib/reports/report-access.server");
    return authorizeExport(context.supabase, context.userId, data.format, data.workspaceId ?? null);
  });
