/**
 * Workshop server functions — thin wrappers only (AGENTS.md §3).
 * Every function is authenticated; RLS scopes each row to the workshop's
 * participants and facilitators.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  VOTE_CRITERIA,
  VOTE_MAX,
  VOTE_MIN,
  WORKSHOP_ITEM_STATUSES,
  WORKSHOP_STAGES,
  WORKSHOP_STATUSES,
  itemSchema,
  participantSchema,
  workshopSetupSchema,
} from "@/lib/workshops";

const idSchema = z.object({ id: z.string().uuid() });

export const listWorkshopsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listWorkshops } = await import("@/lib/workshops.server");
    return listWorkshops(context.supabase);
  });

export const getWorkshopBoardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { getBoard } = await import("@/lib/workshops.server");
    return getBoard(context.supabase, data.id, context.userId);
  });

export const createWorkshopFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => workshopSetupSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { resolveWorkspaceId } = await import("@/lib/opportunities.server");
    const { displayNameFor, toWorkshop } = await import("@/lib/workshops.server");
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const workspaceId = await resolveWorkspaceId(supabase);
    const { data: row, error } = await supabase
      .from("workshops")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        title: data.title,
        client_name: data.clientName || null,
        objective: data.objective || null,
        business_functions: data.businessFunctions,
        starts_on: data.startsOn || null,
        ends_on: data.endsOn || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const workshop = toWorkshop(row);

    await supabase.from("workshop_participants").insert({
      workshop_id: workshop.id,
      user_id: userId,
      display_name: await displayNameFor(supabase, userId),
      role: "facilitator",
    });

    const ctx = {
      supabase,
      userId,
      tenant: { organizationId: workshop.organizationId, workspaceId: workshop.workspaceId },
    };
    await writeAuditEvent(ctx, {
      event: AUDIT_EVENTS.entityCreated,
      entity: { type: "workshop", id: workshop.id },
      next: { title: workshop.title, client: workshop.clientName },
    });
    await writeProductEvent(ctx, {
      event: PRODUCT_EVENTS.workshopStarted,
      entity: { type: "workshop", id: workshop.id },
    });
    return workshop;
  });

export const updateWorkshopFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        setup: workshopSetupSchema.partial().optional(),
        stage: z.enum(WORKSHOP_STAGES).optional(),
        status: z.enum(WORKSHOP_STATUSES).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator, toWorkshop } = await import("@/lib/workshops.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    await assertFacilitator(supabase, data.id, userId);

    const patch: Record<string, unknown> = {};
    if (data.setup) {
      const s = data.setup;
      if (s.title !== undefined) patch.title = s.title;
      if (s.clientName !== undefined) patch.client_name = s.clientName || null;
      if (s.objective !== undefined) patch.objective = s.objective || null;
      if (s.businessFunctions !== undefined) patch.business_functions = s.businessFunctions;
      if (s.startsOn !== undefined) patch.starts_on = s.startsOn || null;
      if (s.endsOn !== undefined) patch.ends_on = s.endsOn || null;
    }
    if (data.stage) patch.stage = data.stage;
    if (data.status) patch.status = data.status;

    const { data: row, error } = await supabase
      .from("workshops")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const workshop = toWorkshop(row);
    await writeAuditEvent(
      {
        supabase,
        userId,
        tenant: { organizationId: workshop.organizationId, workspaceId: workshop.workspaceId },
      },
      {
        event: AUDIT_EVENTS.entityUpdated,
        entity: { type: "workshop", id: workshop.id },
        next: { stage: workshop.stage, status: workshop.status },
      },
    );
    return workshop;
  });

export const addParticipantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ workshopId: z.string().uuid(), participant: participantSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator, toParticipant } = await import("@/lib/workshops.server");
    await assertFacilitator(supabase, data.workshopId, userId);

    let linkedUserId: string | null = null;
    if (data.participant.email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", data.participant.email)
        .maybeSingle();
      linkedUserId = (profile?.user_id as string | null) ?? null;
    }

    const { data: row, error } = await supabase
      .from("workshop_participants")
      .insert({
        workshop_id: data.workshopId,
        user_id: linkedUserId,
        display_name: data.participant.displayName,
        email: data.participant.email || null,
        role: data.participant.role,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toParticipant(row);
  });

export const removeParticipantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertFacilitator } = await import("@/lib/workshops.server");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    const { error } = await context.supabase.from("workshop_participants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitWorkshopItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workshopId: z.string().uuid(),
        item: itemSchema,
        sourceItemId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { displayNameFor, insertItem } = await import("@/lib/workshops.server");
    const { data: me } = await supabase
      .from("workshop_participants")
      .select("display_name, role")
      .eq("workshop_id", data.workshopId)
      .eq("user_id", userId)
      .maybeSingle();
    if (me?.role === "observer") throw new Error("Observers cannot submit to this workshop.");
    return insertItem(supabase, {
      workshopId: data.workshopId,
      kind: data.item.kind,
      title: data.item.title,
      detail: data.item.detail ?? "",
      businessFunction: data.item.businessFunction ?? "",
      userId,
      userName: (me?.display_name as string) || (await displayNameFor(supabase, userId)),
      sourceItemId: data.sourceItemId ?? null,
    });
  });

/** Author edit while unreviewed, or facilitator curation. RLS decides which. */
export const updateWorkshopItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(3).max(200).optional(),
        detail: z.string().trim().max(4000).optional(),
        businessFunction: z.string().trim().max(120).optional(),
        status: z.enum(WORKSHOP_ITEM_STATUSES).optional(),
        mergedIntoId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { toItem } = await import("@/lib/workshops.server");
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.detail !== undefined) patch.detail = data.detail || null;
    if (data.businessFunction !== undefined)
      patch.business_function = data.businessFunction || null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.mergedIntoId !== undefined) patch.merged_into_id = data.mergedIntoId ?? null;

    const { data: row, error } = await context.supabase
      .from("workshop_items")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toItem(row);
  });

/** Safe merge: the duplicate is kept as a merged record pointing at the survivor. */
export const mergeWorkshopItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workshopId: z.string().uuid(),
        sourceId: z.string().uuid(),
        targetId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.sourceId === data.targetId) throw new Error("Choose a different item to merge into.");
    const { supabase, userId } = context;
    const { assertFacilitator } = await import("@/lib/workshops.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    await assertFacilitator(supabase, data.workshopId, userId);

    const { error } = await supabase
      .from("workshop_items")
      .update({ status: "merged", merged_into_id: data.targetId })
      .eq("id", data.sourceId)
      .eq("workshop_id", data.workshopId);
    if (error) throw new Error(error.message);

    await writeAuditEvent(
      { supabase, userId, tenant: { organizationId: null, workspaceId: null } },
      {
        event: AUDIT_EVENTS.entityUpdated,
        entity: { type: "workshop_item", id: data.sourceId },
        next: { status: "merged", merged_into_id: data.targetId },
      },
    );
    return { ok: true };
  });

export const castWorkshopVoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workshopId: z.string().uuid(),
        itemId: z.string().uuid(),
        criterion: z.enum(VOTE_CRITERIA),
        score: z.number().int().min(VOTE_MIN).max(VOTE_MAX),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("workshop_participants")
      .select("role")
      .eq("workshop_id", data.workshopId)
      .eq("user_id", userId)
      .maybeSingle();
    if (me?.role === "observer") throw new Error("Observers cannot vote in this workshop.");

    const { error } = await supabase.from("workshop_votes").upsert(
      {
        workshop_id: data.workshopId,
        item_id: data.itemId,
        voter_id: userId,
        criterion: data.criterion,
        score: data.score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id,voter_id,criterion" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Shortlisted item → opportunity record and/or Studio draft, lineage preserved. */
export const convertWorkshopItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ workshopId: z.string().uuid(), itemIds: z.array(z.string().uuid()).min(1).max(50) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator, convertItem, getBoard } = await import("@/lib/workshops.server");
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");
    await assertFacilitator(supabase, data.workshopId, userId);

    const board = await getBoard(supabase, data.workshopId, userId);
    if (!board) throw new Error("Workshop not found.");
    const tenant = {
      organizationId: board.workshop.organizationId,
      workspaceId: board.workshop.workspaceId,
    };

    const converted = [];
    for (const id of data.itemIds) {
      const item = board.items.find((i) => i.id === id);
      if (!item) continue;
      if (item.kind !== "opportunity" && item.kind !== "use_case") continue;
      const result = await convertItem(supabase, board.workshop, item, userId);
      converted.push(result);
      await writeAuditEvent(
        { supabase, userId, tenant },
        {
          event: AUDIT_EVENTS.entityCreated,
          entity: { type: "workshop_item.conversion", id: result.id },
          next: {
            workshop_id: data.workshopId,
            opportunity_id: result.opportunityId,
            use_case_id: result.useCaseId,
          },
        },
      );
      await writeProductEvent(
        { supabase, userId, tenant },
        {
          event: PRODUCT_EVENTS.opportunityConverted,
          entity: { type: "workshop_item", id: result.id },
          properties: { kind: result.kind, workshopId: data.workshopId },
        },
      );
    }
    return converted;
  });

export const generateWorkshopOutcomeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator, composeOutcome } = await import("@/lib/workshops.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    await assertFacilitator(supabase, data.workshopId, userId);
    const summary = await composeOutcome(supabase, data.workshopId, userId);
    await writeAuditEvent(
      { supabase, userId, tenant: { organizationId: null, workspaceId: null } },
      {
        event: AUDIT_EVENTS.reportGenerated,
        entity: { type: "workshop_outcome", id: data.workshopId },
        next: { counts: summary.counts },
      },
    );
    return summary;
  });
