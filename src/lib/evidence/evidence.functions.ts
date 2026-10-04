/**
 * Evidence server functions — thin wrappers only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EVIDENCE_STATUSES, EVIDENCE_SUBJECT_TYPES } from "./model";

export const listEvidenceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        subjectType: z.enum(EVIDENCE_SUBJECT_TYPES),
        subjectId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { listEvidenceForSubject } = await import("./evidence.server");
    return listEvidenceForSubject(context.supabase, data.subjectType, data.subjectId);
  });

export const createEvidenceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.record(z.string(), z.unknown()).parse(d))
  .handler(async ({ data, context }) => {
    const { createEvidenceItem } = await import("./evidence.server");
    return createEvidenceItem(context.supabase, context.userId, data);
  });

export const setEvidenceStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(EVIDENCE_STATUSES),
        statusNote: z.string().trim().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { setEvidenceStatus } = await import("./evidence.server");
    return setEvidenceStatus(
      context.supabase,
      context.userId,
      data.id,
      data.status,
      data.statusNote,
    );
  });

export const createEvidenceItemSignedUrlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ evidenceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { issueEvidenceItemSignedUrl } = await import("./evidence.server");
    return issueEvidenceItemSignedUrl(context.supabase, context.userId, data.evidenceId);
  });

export const listEvidenceActivityFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        subjectId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { listEvidenceActivity } = await import("./evidence.server");
    return (await listEvidenceActivity(context.supabase, data)) as any[];
  });
