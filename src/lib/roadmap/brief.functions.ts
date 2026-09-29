/**
 * Thin server functions — implementation briefs (V2-14).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { briefDraftSchema } from "./implementation-brief";

export const listImplementationBriefsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ useCaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listBriefsForUseCase } = await import("./brief.server");
    return listBriefsForUseCase(context.supabase, data.useCaseId);
  });

export const getOrCreateImplementationBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        useCaseId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        portfolioId: z.string().uuid().nullable().optional(),
        title: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getOrCreateDraftBrief } = await import("./brief.server");
    return getOrCreateDraftBrief(context.supabase, {
      useCaseId: data.useCaseId,
      workspaceId: data.workspaceId,
      userId: context.userId,
      portfolioId: data.portfolioId,
      title: data.title,
    });
  });

export const saveImplementationBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        briefId: z.string().uuid(),
        draft: briefDraftSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { saveBriefDraft } = await import("./brief.server");
    return saveBriefDraft(context.supabase, data.briefId, data.draft);
  });

export const publishImplementationBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ briefId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { publishBrief } = await import("./brief.server");
    return publishBrief(context.supabase, data.briefId);
  });
