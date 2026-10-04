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

/* ------------------------------------ Sovereign Public Value Canvas™ */

export const getPublicValueCanvasFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getPublicValueCanvas } = await import("@/lib/workshops.public-value.server");
    // RLS: workshop members read, facilitators write.
    return getPublicValueCanvas(context.supabase, data.workshopId);
  });

export const savePublicValueCanvasFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(async (d) => {
    const { publicValueCanvasInputSchema } = await import("@/lib/workshops.public-value");
    return publicValueCanvasInputSchema.parse(d);
  })
  .handler(async ({ data, context }) => {
    const { savePublicValueCanvas } = await import("@/lib/workshops.public-value.server");
    const { assertFacilitator } = await import("@/lib/workshops.server");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    return savePublicValueCanvas(context.supabase, {
      workshopId: data.workshopId,
      sections: data.sections,
      userId: context.userId,
    });
  });

export const recordPublicValueCanvasVersionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(async (d) => {
    const { publicValueCanvasInputSchema } = await import("@/lib/workshops.public-value");
    return publicValueCanvasInputSchema
      .extend({ note: z.string().trim().max(400).optional() })
      .parse(d);
  })
  .handler(async ({ data, context }) => {
    const { savePublicValueCanvas } = await import("@/lib/workshops.public-value.server");
    const { recordCanvasVersion } = await import("@/lib/workshops.canvas-evidence.server");
    const { assertFacilitator } = await import("@/lib/workshops.server");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    const canvas = await savePublicValueCanvas(context.supabase, {
      workshopId: data.workshopId,
      sections: data.sections,
      userId: context.userId,
    });
    const version = await recordCanvasVersion(context.supabase, {
      workshopId: data.workshopId,
      sections: data.sections,
      note: data.note?.trim() ? data.note.trim() : null,
      userId: context.userId,
    });
    return { canvas, version };
  });

export const listPublicValueCanvasVersionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listCanvasVersions } = await import("@/lib/workshops.canvas-evidence.server");
    return listCanvasVersions(context.supabase, data.workshopId);
  });

export const listCanvasDocumentsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { listCanvasDocuments } = await import("@/lib/workshops.canvas-evidence.server");
    return listCanvasDocuments(context.supabase, data.workshopId);
  });

export const recordCanvasDocumentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workshopId: z.string().uuid(),
        section: z.string().regex(/^[a-z_]{3,40}$/),
        label: z.string().trim().min(1).max(160),
        storagePath: z.string().trim().min(5).max(400),
        mimeType: z.string().trim().min(3).max(160),
        sizeBytes: z
          .number()
          .int()
          .positive()
          .max(15 * 1024 * 1024),
        note: z.string().trim().max(400).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { recordCanvasDocument } = await import("@/lib/workshops.canvas-evidence.server");
    const { isCanvasSection } = await import("@/lib/workshops.canvas-evidence");
    const { assertFacilitator } = await import("@/lib/workshops.server");
    if (!isCanvasSection(data.section)) throw new Error("Unknown canvas section.");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    return recordCanvasDocument(context.supabase, {
      workshopId: data.workshopId,
      section: data.section,
      label: data.label,
      storagePath: data.storagePath,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      note: data.note?.trim() ? data.note.trim() : null,
      userId: context.userId,
    });
  });

export const deleteCanvasDocumentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ workshopId: z.string().uuid(), documentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { deleteCanvasDocument } = await import("@/lib/workshops.canvas-evidence.server");
    const { assertFacilitator } = await import("@/lib/workshops.server");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    return deleteCanvasDocument(context.supabase, {
      workshopId: data.workshopId,
      documentId: data.documentId,
      userId: context.userId,
    });
  });

export const canvasDocumentUrlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().trim().min(5).max(400) }).parse(d))
  .handler(async ({ data, context }) => {
    const { issueCanvasDocumentUrl } = await import("@/lib/workshops.canvas-evidence.server");
    return issueCanvasDocumentUrl(context.supabase, context.userId, data.path);
  });

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
        agenda: z
          .array(
            z.object({
              id: z.string(),
              title: z.string().trim().min(1).max(200),
              minutes: z.number().int().min(1).max(480).optional(),
              notes: z.string().max(1000).optional(),
            }),
          )
          .max(40)
          .optional(),
        teams: z
          .array(
            z.object({
              id: z.string(),
              name: z.string().trim().min(1).max(120),
              memberNames: z.array(z.string().max(120)).max(40),
            }),
          )
          .max(20)
          .optional(),
        challengeStatements: z
          .array(z.object({ id: z.string(), text: z.string().trim().min(3).max(500) }))
          .max(20)
          .optional(),
        timeboxes: z
          .array(
            z.object({
              id: z.string(),
              label: z.string().trim().min(1).max(120),
              minutes: z.number().int().min(1).max(480),
              stage: z.string().max(40).optional(),
            }),
          )
          .max(40)
          .optional(),
        allowAnonymous: z.boolean().optional(),
        votingMode: z.enum(["score", "dot"]).optional(),
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
    if (data.agenda !== undefined) patch.agenda = data.agenda;
    if (data.teams !== undefined) patch.teams = data.teams;
    if (data.challengeStatements !== undefined)
      patch.challenge_statements = data.challengeStatements;
    if (data.timeboxes !== undefined) patch.timeboxes = data.timeboxes;
    if (data.allowAnonymous !== undefined) patch.allow_anonymous = data.allowAnonymous;
    if (data.votingMode !== undefined) patch.voting_mode = data.votingMode;

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
  .inputValidator((d) =>
    z.object({ workshopId: z.string().uuid(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertFacilitator } = await import("@/lib/workshops.server");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    const { error } = await context.supabase
      .from("workshop_participants")
      .delete()
      .eq("id", data.id);
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
        criterion: z.enum([...VOTE_CRITERIA, "dots"] as [string, ...string[]]),
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

    // Dot mode: one sticky vote per voter/item (score forced to 1).
    const criterion = data.criterion;
    const score = criterion === "dots" ? 1 : data.score;

    const { error } = await supabase.from("workshop_votes").upsert(
      {
        workshop_id: data.workshopId,
        item_id: data.itemId,
        voter_id: userId,
        criterion,
        score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id,voter_id,criterion" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const proposeWorkshopClustersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator, getBoard } = await import("@/lib/workshops.server");
    const { proposeClusters } = await import("@/lib/workshops/workshop-v2");
    await assertFacilitator(supabase, data.workshopId, userId);
    const board = await getBoard(supabase, data.workshopId, userId);
    if (!board) throw new Error("Workshop not found.");
    const drafts = proposeClusters(board.items);
    const rows = [];
    for (const draft of drafts) {
      const { data: row, error } = await (supabase as any)
        .from("workshop_cluster_proposals")
        .insert({
          workshop_id: data.workshopId,
          workspace_id: board.workshop.workspaceId,
          proposed_label: draft.proposedLabel,
          summary: draft.summary,
          item_ids: draft.itemIds,
          status: "pending",
          source: "ai",
          reason: draft.reason,
          created_by: userId,
        })
        .select("id, proposed_label, summary, item_ids, status, reason, created_at")
        .single();
      if (error) throw new Error(error.message);
      rows.push(row);
    }
    return rows;
  });

export const listWorkshopClusterProposalsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("workshop_cluster_proposals")
      .select("id, proposed_label, summary, item_ids, status, reason, source, created_at")
      .eq("workshop_id", data.workshopId)
      .is("deleted_at", null)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const decideWorkshopClusterProposalFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workshopId: z.string().uuid(),
        proposalId: z.string().uuid(),
        decision: z.enum(["accepted", "rejected"]),
        finalLabel: z.string().trim().min(1).max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator } = await import("@/lib/workshops.server");
    await assertFacilitator(supabase, data.workshopId, userId);

    const { data: proposal, error: loadError } = await (supabase as any)
      .from("workshop_cluster_proposals")
      .select("id, item_ids, proposed_label, status")
      .eq("id", data.proposalId)
      .eq("workshop_id", data.workshopId)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!proposal || proposal.status !== "pending") throw new Error("Proposal not pending.");

    if (data.decision === "rejected") {
      const { error } = await (supabase as any)
        .from("workshop_cluster_proposals")
        .update({
          status: "rejected",
          confirmed_by: userId,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", data.proposalId);
      if (error) throw new Error(error.message);
      return { ok: true, merged: false };
    }

    const itemIds = (proposal.item_ids as string[]) ?? [];
    if (itemIds.length < 2) throw new Error("Cluster needs at least two items.");
    const [targetId, ...sources] = itemIds;
    const label = data.finalLabel?.trim() || (proposal.proposed_label as string);

    // Facilitator-confirmed merge only — never auto-apply AI labels.
    await supabase
      .from("workshop_items")
      .update({ title: label, updated_at: new Date().toISOString() })
      .eq("id", targetId)
      .eq("workshop_id", data.workshopId);

    for (const sourceId of sources) {
      const { error } = await supabase
        .from("workshop_items")
        .update({
          status: "merged",
          merged_into_id: targetId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sourceId)
        .eq("workshop_id", data.workshopId);
      if (error) throw new Error(error.message);
    }

    const { error: updError } = await (supabase as any)
      .from("workshop_cluster_proposals")
      .update({
        status: "accepted",
        proposed_label: label,
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", data.proposalId);
    if (updError) throw new Error(updError.message);
    return { ok: true, merged: true, targetId, label };
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

/* ------------------------------------------------------- invitations & audit */

export const listWorkshopInvitationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertFacilitator } = await import("@/lib/workshops.server");
    const { listInvitations } = await import("@/lib/workshops.collab.server");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    return listInvitations(context.supabase, data.workshopId);
  });

export const createWorkshopInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workshopId: z.string().uuid(),
        email: z.string().trim().email().max(200).optional().or(z.literal("")),
        displayName: z.string().trim().max(120).optional(),
        role: z.enum(["facilitator", "participant", "observer"]).default("participant"),
        expiresInDays: z.number().int().min(1).max(90).default(30),
        maxUses: z.number().int().min(1).max(200).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator } = await import("@/lib/workshops.server");
    const { createInvitation } = await import("@/lib/workshops.collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    await assertFacilitator(supabase, data.workshopId, userId);

    const invitation = await createInvitation(supabase, {
      workshopId: data.workshopId,
      userId,
      email: data.email ? data.email.toLowerCase() : null,
      displayName: data.displayName || null,
      role: data.role,
      expiresInDays: data.expiresInDays,
      maxUses: data.email ? 1 : data.maxUses,
    });

    await writeAuditEvent(
      { supabase, userId, tenant: { organizationId: null, workspaceId: null } },
      {
        event: AUDIT_EVENTS.entityCreated,
        entity: { type: "workshop_invitation", id: invitation.id },
        // The token itself is never written to the audit stream.
        next: {
          workshop_id: data.workshopId,
          role: invitation.role,
          invited: invitation.email ? "email" : "share_link",
        },
      },
    );
    return invitation;
  });

export const revokeWorkshopInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ workshopId: z.string().uuid(), id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertFacilitator } = await import("@/lib/workshops.server");
    const { revokeInvitation } = await import("@/lib/workshops.collab.server");
    await assertFacilitator(context.supabase, data.workshopId, context.userId);
    await revokeInvitation(context.supabase, data.id);
    return { ok: true };
  });

export const acceptWorkshopInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().trim().min(10).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { acceptInvitation } = await import("@/lib/workshops.collab.server");
    const workshopId = await acceptInvitation(context.supabase, data.token);
    return { workshopId };
  });

export const getWorkshopAuditFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { buildAuditTrail } = await import("@/lib/workshops.collab.server");
    // RLS restricts these rows to workshop members; observers may read them.
    return buildAuditTrail(context.supabase, data.workshopId);
  });

export const publishWorkshopOutcomeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workshopId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertFacilitator, composeOutcome } = await import("@/lib/workshops.server");
    const { publishOutcome } = await import("@/lib/workshops.collab.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");
    await assertFacilitator(supabase, data.workshopId, userId);

    const summary = await composeOutcome(supabase, data.workshopId, userId);
    const published = await publishOutcome(supabase, data.workshopId, userId, summary);

    await writeAuditEvent(
      { supabase, userId, tenant: { organizationId: null, workspaceId: null } },
      {
        event: AUDIT_EVENTS.reportGenerated,
        entity: { type: "workshop_outcome", id: data.workshopId },
        next: {
          portfolio_id: published.portfolioId,
          report_id: published.reportId,
          opportunities: published.opportunityIds.length,
        },
      },
    );
    return { summary, ...published };
  });
