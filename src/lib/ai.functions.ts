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
import { aiFeedbackInputSchema } from "@/lib/ai/feedback";
import { AI_TASKS } from "@/lib/ai/prompts";

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

const rewriteInput = z.object({
  text: z.string().trim().min(1).max(8000),
  intent: z.string().trim().max(400).optional(),
  providerAlias: alias,
  entity,
});

export const rewriteTextFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rewriteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.rewriteText(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

const classifyInput = z.object({
  text: z.string().trim().min(1).max(6000),
  allowedLabels: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  providerAlias: alias,
  entity,
});

export const classifyContentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => classifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.classifyContent(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

const findGapsInput = z.object({
  title: z.string().trim().min(1).max(300),
  record: z.string().trim().min(1).max(8000),
  providerAlias: alias,
  entity,
});

export const findGapsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => findGapsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.findGaps(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

const questionsInput = z.object({
  topic: z.string().trim().min(1).max(300),
  context: z.string().trim().max(4000).optional(),
  providerAlias: alias,
  entity,
});

export const generateQuestionsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => questionsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.generateQuestions(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

const summarizeEvidenceInput = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        title: z.string().trim().min(1).max(200),
        excerpt: z.string().trim().max(1000),
      }),
    )
    .min(1)
    .max(40),
  providerAlias: alias,
  entity,
});

export const summarizeEvidenceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => summarizeEvidenceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.summarizeEvidence(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

const draftBriefInput = z.object({
  title: z.string().trim().min(1).max(300),
  confirmedFields: z.string().trim().min(1).max(8000),
  providerAlias: alias,
  entity,
});

export const draftBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => draftBriefInput.parse(d))
  .handler(async ({ data, context }) => {
    const { AIService } = await import("@/lib/ai/service.server");
    const { providerAlias, entity: ent, ...input } = data;
    return AIService.draftBrief(
      { supabase: context.supabase, userId: context.userId, providerAlias, entity: ent },
      input,
    );
  });

export const recordAiFeedbackFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => aiFeedbackInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { resolveSubject } = await import("@/lib/authz.server");
    const subject = await resolveSubject(context.supabase, context.userId);
    const { error } = await context.supabase.from("ai_suggestion_feedback").insert({
      user_id: context.userId,
      organization_id: subject.organizationId,
      workspace_id: subject.workspaceId,
      task: data.task,
      action: data.action,
      prompt_version: data.promptVersion,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      correlation_id: data.correlationId ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Catalogue of registered AI tasks (client-safe metadata only). */
export const listAiCatalogueFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { PROMPT_REGISTRY, FR14_PURPOSE_OPS } = await import("@/lib/ai/prompts");
    const { AI_EVAL_DATASET_VERSION } = await import("@/lib/ai/eval/dataset");
    const { TRAINING_POLICY, AI_CONFIDENCE_CAVEAT } = await import("@/lib/ai/feedback");
    return {
      tasks: AI_TASKS.map((task) => ({
        task,
        version: PROMPT_REGISTRY[task].version,
        tier: PROMPT_REGISTRY[task].tier,
        timeoutMs: PROMPT_REGISTRY[task].timeoutMs,
      })),
      purposeOps: FR14_PURPOSE_OPS,
      evalDatasetVersion: AI_EVAL_DATASET_VERSION,
      trainingPolicy: TRAINING_POLICY,
      confidenceCaveat: AI_CONFIDENCE_CAVEAT,
    };
  });
