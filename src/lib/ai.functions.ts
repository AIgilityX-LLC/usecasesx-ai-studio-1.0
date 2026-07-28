/**
 * AI server functions — thin wrappers only (AGENTS.md §3).
 *
 * Each wrapper validates input, then delegates to `AIService`, which owns
 * entitlement re-checks, fair use, prompts, schemas, retries and usage logging.
 * All are authenticated: `LOVABLE_API_KEY` never leaves the server.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROVIDER_ALIASES } from "@/lib/ai/models";

const alias = z.enum(PROVIDER_ALIASES).nullish();
const entity = z.object({ type: z.string().min(1), id: z.string().uuid() }).nullish();

const enrichInput = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(6000),
  industry: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(200).optional(),
  providerAlias: alias,
  entity,
});

const draftInput = z.object({
  organization: z.string().trim().min(1).max(200),
  industry: z.string().trim().max(120).optional(),
  objective: z.string().trim().min(1).max(2000),
  context: z.string().trim().max(4000).optional(),
  providerAlias: alias,
  entity,
});

const capabilitiesInput = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(6000),
  dataAvailable: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  providerAlias: alias,
  entity,
});

const explainScoreInput = z.object({
  title: z.string().trim().min(1).max(300),
  totalScore: z.number().min(0).max(100),
  dimensions: z.record(z.string(), z.number().min(0).max(10)),
  providerAlias: alias,
  entity,
});

const similarInput = z.object({
  reference: z.object({
    title: z.string().trim().min(1).max(300),
    summary: z.string().trim().min(1).max(2000),
  }),
  candidates: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(200),
        title: z.string().trim().min(1).max(300),
        summary: z.string().trim().max(600).optional(),
      }),
    )
    .min(1)
    .max(60),
  providerAlias: alias,
  entity,
});

const summaryInput = z.object({
  portfolioName: z.string().trim().min(1).max(200),
  objective: z.string().trim().max(1000).optional(),
  useCases: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(300),
        priority: z.string().trim().max(40).optional(),
        score: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1)
    .max(80),
  providerAlias: alias,
  entity,
});

export const enrichOpportunityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => enrichInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.enrichOpportunity(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

export const draftUseCaseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => draftInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.draftUseCase(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

export const recommendCapabilitiesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => capabilitiesInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.recommendCapabilities(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

export const explainScoreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => explainScoreInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.explainScore(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

export const findSimilarUseCasesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => similarInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.findSimilarUseCases(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

export const generateExecutiveSummaryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => summaryInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.generateExecutiveSummary(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });
