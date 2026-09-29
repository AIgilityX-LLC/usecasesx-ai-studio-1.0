/**
 * Scoring — server functions (thin wrappers only, AGENTS.md §3).
 *
 * Scores are always recalculated server-side from the submitted responses:
 * the client never supplies a score. Results are append-only, so history stays
 * attributable after a definition changes.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ id: z.string().uuid() });

const responsesInput = z.record(z.string().min(1), z.number().int().min(0).max(10));

/** Human-authored justification per criterion. Never influences the maths. */
const evidenceInput = z.record(z.string().min(1), z.string().trim().max(2000));

const assessmentsInput = z
  .record(
    z.string().min(1),
    z.object({
      rationale: z.string().trim().max(2000).optional(),
      confidence: z.enum(["high", "medium", "low"]).optional(),
      evidence: z.string().trim().max(2000).optional(),
      assessorId: z.string().uuid().nullable().optional(),
      assessedAt: z.string().nullable().optional(),
    }),
  )
  .optional();

/** Definition + prior results for one use case. */
export const getScorecardStateFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { resolveScorecard, listResults, useCaseTenancy } = await import("@/lib/scoring.server");
    const useCase = await useCaseTenancy(context.supabase, data.id);
    if (!useCase) return null;

    const scorecard = await resolveScorecard(
      context.supabase,
      (useCase.workspace_id as string | null) ?? null,
    );
    const results = await listResults(context.supabase, data.id);

    return {
      useCase: { id: useCase.id as string, title: (useCase.title as string) ?? "" },
      scorecardId: scorecard.id,
      definition: scorecard.definition,
      results,
    };
  });

/** Record a new immutable scoring result. Recalculated server-side. */
export const recordScoreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        responses: responsesInput,
        evidence: evidenceInput.optional(),
        assessments: assessmentsInput,
        note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { resolveScorecard, insertResult, useCaseTenancy } = await import("@/lib/scoring.server");
    const { calculateScore, pruneResponses, pruneAssessments } = await import(
      "@/lib/scoring/model"
    );
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const useCase = await useCaseTenancy(supabase, data.id);
    if (!useCase) throw new Error("We could not find that use case.");

    const scorecard = await resolveScorecard(
      supabase,
      (useCase.workspace_id as string | null) ?? null,
    );
    const responses = pruneResponses(scorecard.definition, data.responses);
    const evidence = data.evidence ?? {};
    const now = new Date().toISOString();
    const assessments = pruneAssessments(scorecard.definition, {
      ...(data.assessments ?? {}),
      ...Object.fromEntries(
        Object.entries(evidence).map(([criterionId, text]) => [
          criterionId,
          {
            ...(data.assessments?.[criterionId] ?? {}),
            evidence: text,
            assessorId: data.assessments?.[criterionId]?.assessorId ?? userId,
            assessedAt: data.assessments?.[criterionId]?.assessedAt ?? now,
          },
        ]),
      ),
    });
    const result = calculateScore(scorecard.definition, responses, { assessments });

    const stored = await insertResult(supabase, {
      useCaseId: data.id,
      scorecardId: scorecard.id,
      responses,
      evidence,
      assessments,
      result,
      note: data.note ?? null,
      createdBy: userId,
    });

    const ctx = {
      supabase,
      userId,
      tenant: {
        organizationId: (useCase.organization_id as string | null) ?? null,
        workspaceId: (useCase.workspace_id as string | null) ?? null,
      },
    };
    await writeAuditEvent(ctx, {
      event: AUDIT_EVENTS.entityCreated,
      entity: { type: "scorecard_result", id: stored.id },
      next: {
        useCaseId: data.id,
        scorecard: `${result.scorecardSlug}@${result.scorecardVersion}`,
        composite: result.composite,
        riskAdjusted: result.riskAdjusted,
        recommendation: result.recommendation?.id ?? null,
        evidenceCompleteness: result.evidenceCompleteness,
      },
    });
    await writeProductEvent(ctx, {
      event: PRODUCT_EVENTS.useCaseScored,
      entity: { type: "use_case", id: data.id },
      properties: {
        composite: result.composite,
        completeness: result.completeness,
        confidence: result.confidence,
        incomplete: result.incomplete,
      },
    });

    return { stored, result };
  });

/**
 * Latest recorded score per use case, for list, board and portfolio surfaces.
 * Ids the caller cannot see are simply absent from the map.
 */
export const getLatestScoresFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ useCaseIds: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { latestScoresFor } = await import("@/lib/scoring.server");
    return latestScoresFor(context.supabase, [...new Set(data.useCaseIds)]);
  });

/**
 * Ask AI what evidence would support the unanswered (or all) criteria.
 * The output schema has no numeric field, so a suggestion can never move a
 * score — a human still answers every criterion.
 */
export const suggestScoreEvidenceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        criterionIds: z.array(z.string().min(1)).min(1).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { resolveScorecard, useCaseTenancy, useCaseNarrative } =
      await import("@/lib/scoring.server");
    const { AIService } = await import("@/lib/ai/service.server");

    const useCase = await useCaseTenancy(context.supabase, data.id);
    if (!useCase) throw new Error("We could not find that use case.");

    const scorecard = await resolveScorecard(
      context.supabase,
      (useCase.workspace_id as string | null) ?? null,
    );
    const wanted = new Set(data.criterionIds);
    const criteria = scorecard.definition.dimensions.flatMap((dim) =>
      dim.criteria
        .filter((c) => wanted.has(c.id))
        .map((c) => ({ id: c.id, label: c.label, dimension: dim.label, help: c.help })),
    );
    if (criteria.length === 0) throw new Error("No matching criteria to support.");

    return AIService.suggestScoreEvidence(
      {
        supabase: context.supabase,
        userId: context.userId,
        entity: { type: "use_case", id: data.id },
      },
      {
        title: (useCase.title as string) ?? "Untitled use case",
        context: useCaseNarrative(useCase),
        criteria,
      },
    );
  });

/** Clone the active scorecard into a workspace draft (admin). */
export const cloneScorecardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        useCaseId: z.string().uuid(),
        name: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { resolveScorecard, useCaseTenancy, cloneScorecardToWorkspace } =
      await import("@/lib/scoring.server");
    const useCase = await useCaseTenancy(context.supabase, data.useCaseId);
    if (!useCase?.workspace_id) throw new Error("Use case workspace is required to clone.");
    const scorecard = await resolveScorecard(
      context.supabase,
      useCase.workspace_id as string,
    );
    return cloneScorecardToWorkspace(context.supabase, {
      sourceScorecardId: scorecard.id,
      workspaceId: useCase.workspace_id as string,
      organizationId: (useCase.organization_id as string | null) ?? null,
      userId: context.userId,
      name: data.name,
    });
  });

/** Publish a workspace draft scorecard (immutable thereafter). */
export const publishScorecardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        scorecardId: z.string().uuid(),
        workspaceId: z.string().uuid(),
        makeDefault: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { publishScorecard } = await import("@/lib/scoring.server");
    return publishScorecard(context.supabase, {
      scorecardId: data.scorecardId,
      workspaceId: data.workspaceId,
      makeDefault: data.makeDefault ?? true,
    });
  });
