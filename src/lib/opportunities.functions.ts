/**
 * Opportunity capture — server functions (thin wrappers only, AGENTS.md §3).
 *
 * Capture records the *business problem* before any AI solution is proposed.
 * All functions are authenticated and workspace-scoped; RLS enforces isolation.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  ALLOWED_TRANSITIONS,
  OPPORTUNITY_STATUSES,
  opportunityDraftSchema,
} from "@/lib/opportunities";

const idSchema = z.object({ id: z.string().uuid() });

export const listOpportunitiesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        status: z.enum([...OPPORTUNITY_STATUSES, "all"]).optional(),
        search: z.string().trim().max(200).optional(),
      })
      .default({})
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { listOpportunities } = await import("@/lib/opportunities.server");
    return listOpportunities(context.supabase, data);
  });

export const getOpportunityFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { getOpportunity } = await import("@/lib/opportunities.server");
    return getOpportunity(context.supabase, data.id);
  });

/** Non-blocking duplicate hint while typing a title. */
export const findSimilarOpportunitiesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ title: z.string().trim().max(300), excludeId: z.string().uuid().nullish() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { findSimilar } = await import("@/lib/opportunities.server");
    return findSimilar(context.supabase, data.title, data.excludeId ?? null);
  });

/** Create or update. Used by both autosave and explicit save. */
export const saveOpportunityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().nullish(),
        sourceUseCaseId: z.string().uuid().nullish(),
        draft: opportunityDraftSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { resolveWorkspaceId, toColumns, toOpportunity } = await import(
      "@/lib/opportunities.server"
    );
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const columns = toColumns(data.draft);

    if (data.id) {
      const { data: row, error } = await supabase
        .from("opportunities")
        .update(columns)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      const saved = toOpportunity(row);
      const ctx = {
        supabase,
        userId,
        tenant: { organizationId: saved.organizationId, workspaceId: saved.workspaceId },
      };
      await writeAuditEvent(ctx, {
        event: AUDIT_EVENTS.entityUpdated,
        entity: { type: "opportunity", id: saved.id },
        next: { title: saved.title, status: saved.status },
      });
      await writeProductEvent(ctx, {
        event: PRODUCT_EVENTS.opportunityUpdated,
        entity: { type: "opportunity", id: saved.id },
        properties: { status: saved.status, source: saved.source },
      });
      return saved;
    }

    const workspaceId = await resolveWorkspaceId(supabase);
    const { data: row, error } = await supabase
      .from("opportunities")
      .insert({
        ...columns,
        workspace_id: workspaceId,
        created_by: userId,
        owner_user_id: userId,
        status: data.draft.status ?? "signal",
        source_use_case_id: data.sourceUseCaseId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const saved = toOpportunity(row);
    const ctx = {
      supabase,
      userId,
      tenant: { organizationId: saved.organizationId, workspaceId: saved.workspaceId },
    };
    await writeAuditEvent(ctx, {
      event: AUDIT_EVENTS.entityCreated,
      entity: { type: "opportunity", id: saved.id },
      next: { title: saved.title, source: saved.source },
    });
    await writeProductEvent(ctx, {
      event: PRODUCT_EVENTS.opportunityCaptured,
      entity: { type: "opportunity", id: saved.id },
      properties: { source: saved.source },
    });
    return saved;
  });

export const setOpportunityStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(OPPORTUNITY_STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getOpportunity, toOpportunity } = await import("@/lib/opportunities.server");
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const current = await getOpportunity(supabase, data.id);
    if (!current) throw new Error("Opportunity not found.");
    if (data.status === "converted") {
      throw new Error("Converted is set by converting the opportunity into a use case.");
    }
    if (!ALLOWED_TRANSITIONS[current.status].includes(data.status)) {
      throw new Error(`Cannot move from ${current.status} to ${data.status}.`);
    }

    const { data: row, error } = await supabase
      .from("opportunities")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const saved = toOpportunity(row);
    const ctx = {
      supabase,
      userId,
      tenant: { organizationId: saved.organizationId, workspaceId: saved.workspaceId },
    };
    await writeAuditEvent(ctx, {
      event: AUDIT_EVENTS.entityUpdated,
      entity: { type: "opportunity", id: saved.id },
      previous: { status: current.status },
      next: { status: saved.status },
    });
    await writeProductEvent(ctx, {
      event: PRODUCT_EVENTS.opportunityStatusChanged,
      entity: { type: "opportunity", id: saved.id },
      properties: { from: current.status, to: saved.status },
    });
    return saved;
  });

/**
 * Persist AI suggestions alongside — never instead of — the author's content.
 * The model output is stored in a separate column so provenance stays clear.
 */
export const recordOpportunityAssistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        suggestions: z.record(z.string(), z.custom<Json>()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { toOpportunity } = await import("@/lib/opportunities.server");
    const { writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const { data: row, error } = await supabase
      .from("opportunities")
      .update({
        ai_assisted: true,
        ai_suggestions: data.suggestions as Json,
        ai_suggested_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const saved = toOpportunity(row);
    await writeProductEvent(
      {
        supabase,
        userId,
        tenant: { organizationId: saved.organizationId, workspaceId: saved.workspaceId },
      },
      {
        event: PRODUCT_EVENTS.opportunityAiAssisted,
        entity: { type: "opportunity", id: saved.id },
      },
    );
    return saved;
  });

/** Convert a qualified problem into a Studio draft, preserving lineage. */
export const convertOpportunityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getOpportunity, ensureCaptureBoard, nextBoardPosition } = await import(
      "@/lib/opportunities.server"
    );
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const opp = await getOpportunity(supabase, data.id);
    if (!opp) throw new Error("Opportunity not found.");

    // Idempotent: re-converting returns the existing draft.
    if (opp.convertedUseCaseId) {
      return { draftId: opp.convertedUseCaseId, reused: true };
    }

    const boardId = await ensureCaptureBoard(supabase, opp.workspaceId, userId);
    const position = await nextBoardPosition(supabase, boardId);

    const { data: draft, error } = await supabase
      .from("ai_use_cases")
      .insert({
        board_id: boardId,
        source_opportunity_id: opp.id,
        source_use_case_id: opp.sourceUseCaseId,
        title: opp.title,
        problem_statement: opp.painPoint || null,
        current_state: opp.baseline || null,
        future_state: opp.desiredOutcome || null,
        beneficiaries: opp.businessFunction || null,
        stakeholders: opp.stakeholders ?? [],
        risks: [],
        status: "idea",
        position,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error || !draft) throw new Error(error?.message ?? "Could not create the use case draft.");

    const { error: updErr } = await supabase
      .from("opportunities")
      .update({
        status: "converted",
        converted_use_case_id: draft.id,
        converted_at: new Date().toISOString(),
      })
      .eq("id", opp.id);
    if (updErr) throw new Error(updErr.message);

    const ctx = {
      supabase,
      userId,
      tenant: { organizationId: opp.organizationId, workspaceId: opp.workspaceId },
    };
    await writeAuditEvent(ctx, {
      event: AUDIT_EVENTS.entityCreated,
      entity: { type: "use_case", id: draft.id as string },
      next: { fromOpportunity: opp.id, title: opp.title },
    });
    await writeProductEvent(ctx, {
      event: PRODUCT_EVENTS.opportunityConverted,
      entity: { type: "opportunity", id: opp.id },
      properties: { useCaseId: draft.id, source: opp.source, aiAssisted: opp.aiAssisted },
    });

    return { draftId: draft.id as string, reused: false };
  });

export const deleteOpportunityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("opportunities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
