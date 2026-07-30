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
        note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { resolveScorecard, insertResult, useCaseTenancy } = await import(
      "@/lib/scoring.server"
    );
    const { calculateScore, pruneResponses } = await import("@/lib/scoring/model");
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const useCase = await useCaseTenancy(supabase, data.id);
    if (!useCase) throw new Error("We could not find that use case.");

    const scorecard = await resolveScorecard(
      supabase,
      (useCase.workspace_id as string | null) ?? null,
    );
    const responses = pruneResponses(scorecard.definition, data.responses);
    const result = calculateScore(scorecard.definition, responses);

    const stored = await insertResult(supabase, {
      useCaseId: data.id,
      scorecardId: scorecard.id,
      responses,
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
