/**
 * Studio compatibility layer.
 *
 * The Studio surface keeps its existing call shape; the implementation now
 * delegates to the centralized, authenticated AI boundary (`src/lib/ai`).
 * Provider selection is an alias, not a vendor SDK — swapping providers is a
 * change in `src/lib/ai/models.ts` only.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROVIDER_ALIASES, resolveModel } from "@/lib/ai/models";
import type { DraftUseCaseOutput } from "@/lib/ai/schemas";
import type { AiProvenance } from "@/lib/ai/types";
import { studioBriefSchema } from "@/lib/ai/engines";

export const STUDIO_PROVIDERS = PROVIDER_ALIASES;
export type StudioProvider = (typeof STUDIO_PROVIDERS)[number];

/** Draft shape rendered by the Studio. Mirrors the validated AI schema. */
export type StudioDraft = DraftUseCaseOutput;

const Input = z.object({
  provider: z.enum(STUDIO_PROVIDERS).default("gemini"),
  organization: z.string().trim().min(1).max(200),
  industry: z.string().trim().max(120).optional().default(""),
  objective: z.string().trim().min(1).max(2000),
  context: z.string().trim().max(4000).optional().default(""),
  /** Admin-configured research engine. Falls back to the alias when absent. */
  engineSlug: z.string().trim().min(2).max(48).optional().nullable(),
  brief: studioBriefSchema.optional().nullable(),
});

export const draftUseCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const result = await AIService.draftUseCase(
      {
        supabase: context.supabase,
        userId: context.userId,
        providerAlias: data.provider,
        engineSlug: data.engineSlug ?? null,
      },
      {
        organization: data.organization,
        industry: data.industry || undefined,
        objective: data.objective,
        context: data.context || undefined,
        brief: data.brief ?? null,
      },
    );

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error,
        errorKind: result.errorKind,
        draft: null,
        fairUse: result.fairUse,
        provenance: null as AiProvenance | null,
      };
    }

    return {
      ok: true as const,
      error: null,
      errorKind: null,
      draft: result.data,
      fairUse: result.fairUse,
      provenance: result.provenance,
      meta: {
        provider: data.provider,
        engineSlug: data.engineSlug ?? null,
        model: result.provenance.model,
      },
    };
  });

/** Exposed so callers can label a draft without duplicating the registry. */
export function studioModelFor(provider: StudioProvider): string {
  return resolveModel("balanced", provider);
}
