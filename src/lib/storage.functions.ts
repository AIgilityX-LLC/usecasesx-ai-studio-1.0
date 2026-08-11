/**
 * Storage server functions — thin wrappers only (AGENTS.md §3).
 *
 * Signed URLs are never minted in the browser: the handler re-checks the
 * caller's access to the parent record before issuing a short-lived URL.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createEvidenceSignedUrlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().trim().min(3).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const { issueEvidenceSignedUrl } = await import("@/lib/storage/storage-access.server");
    return issueEvidenceSignedUrl(context.supabase, context.userId, data.path);
  });
