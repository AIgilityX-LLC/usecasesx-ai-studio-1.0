/**
 * Studio wizard — server functions (thin wrappers only, AGENTS.md §3).
 *
 * Every function is authenticated; RLS scopes reads and writes to the caller's
 * workspace. Completion writes an immutable snapshot to `use_case_versions`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import {
  STEP_IDS,
  USE_CASE_VISIBILITIES,
  wizardStepValuesSchema,
  type WizardState,
} from "@/lib/studio-wizard";

const idSchema = z.object({ id: z.string().uuid() });

export const getWizardUseCaseFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { loadUseCase, listVersions } = await import("@/lib/studio-wizard.server");
    const row = await loadUseCase(context.supabase, data.id);
    if (!row) return null;
    const versions = await listVersions(context.supabase, data.id);
    return {
      id: row.id as string,
      title: (row.title as string) ?? "",
      status: (row.status as string) ?? "idea",
      visibility: (row.visibility as string) ?? "workspace",
      version: (row.version as number) ?? 1,
      currentStep: (row.current_step as string | null) ?? STEP_IDS[0],
      completedAt: (row.completed_at as string | null) ?? null,
      updatedAt: (row.updated_at as string) ?? null,
      ownerUserId: (row.owner_user_id as string | null) ?? (row.created_by as string),
      contributors: Array.isArray(row.contributors) ? (row.contributors as string[]) : [],
      sourceOpportunityId: (row.source_opportunity_id as string | null) ?? null,
      sourceUseCaseId: (row.source_use_case_id as string | null) ?? null,
      wizardState: ((row.wizard_state as WizardState) ?? {}) as WizardState,
      versions,
    };
  });

/** Save one step. Never touches other steps, so back navigation is lossless. */
export const saveWizardStepFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        stepId: z.enum(STEP_IDS as [string, ...string[]]),
        values: wizardStepValuesSchema,
        nextStep: z.enum(STEP_IDS as [string, ...string[]]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { loadUseCase, mergeState, mirrorColumns } =
      await import("@/lib/studio-wizard.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS } = await import("@/lib/telemetry/events");

    const row = await loadUseCase(supabase, data.id);
    if (!row) throw new Error("We could not find that use case.");
    if (row.completed_at) {
      // Editing a completed use case reopens it as the next working version.
      // The previous version stays in `use_case_versions`.
    }

    const state = mergeState(row.wizard_state, data.stepId, data.values);
    const patch: Record<string, unknown> = {
      ...mirrorColumns(state),
      wizard_state: state as unknown as Json,
      current_step: data.nextStep ?? data.stepId,
      updated_at: new Date().toISOString(),
    };
    if (row.status === "idea") patch.status = "in_design";
    if (!row.owner_user_id) patch.owner_user_id = userId;

    const contributors: string[] = Array.isArray(row.contributors)
      ? (row.contributors as string[])
      : [];
    if (!contributors.includes(userId)) {
      patch.contributors = [...contributors, userId] as unknown as Json;
    }

    const { data: saved, error } = await supabase
      .from("ai_use_cases")
      .update(patch as never)
      .eq("id", data.id)
      .select("id, title, status, wizard_state, current_step, updated_at")
      .single();
    if (error) throw new Error(error.message);

    await writeAuditEvent(
      {
        supabase,
        userId,
        tenant: {
          organizationId: (row.organization_id as string | null) ?? null,
          workspaceId: (row.workspace_id as string | null) ?? null,
        },
      },
      {
        event: AUDIT_EVENTS.entityUpdated,
        entity: { type: "use_case", id: data.id },
        next: { step: data.stepId },
      },
    );

    return {
      id: saved.id as string,
      wizardState: (saved.wizard_state ?? {}) as WizardState,
      currentStep: (saved.current_step as string) ?? data.stepId,
      status: saved.status as string,
      updatedAt: saved.updated_at as string,
    };
  });

export const setWizardMetaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        visibility: z.enum(USE_CASE_VISIBILITIES).optional(),
        ownerUserId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.visibility) patch.visibility = data.visibility;
    if (data.ownerUserId !== undefined) patch.owner_user_id = data.ownerUserId;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("ai_use_cases")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Final review → completion. Validates server-side and snapshots the version. */
export const completeWizardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { loadUseCase } = await import("@/lib/studio-wizard.server");
    const { validateAll } = await import("@/lib/studio-wizard");
    const { writeAuditEvent, writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    const { AUDIT_EVENTS, PRODUCT_EVENTS } = await import("@/lib/telemetry/events");

    const row = await loadUseCase(supabase, data.id);
    if (!row) throw new Error("We could not find that use case.");

    const state = ((row.wizard_state as WizardState) ?? {}) as WizardState;
    const issues = validateAll(state);
    if (issues.length > 0) {
      return { ok: false as const, issues, version: null };
    }

    const nextVersion = ((row.version as number) ?? 1) + (row.completed_at ? 1 : 0);

    const { error: verErr } = await supabase.from("use_case_versions").insert({
      use_case_id: data.id,
      version: nextVersion,
      snapshot: {
        title: row.title,
        wizard_state: state,
        source_opportunity_id: row.source_opportunity_id ?? null,
        source_use_case_id: row.source_use_case_id ?? null,
      } as unknown as Json,
      note: data.note ?? null,
      created_by: userId,
    });
    if (verErr) throw new Error(verErr.message);

    const { error } = await supabase
      .from("ai_use_cases")
      .update({
        status: "defined",
        version: nextVersion,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const ctx = {
      supabase,
      userId,
      tenant: {
        organizationId: (row.organization_id as string | null) ?? null,
        workspaceId: (row.workspace_id as string | null) ?? null,
      },
    };
    await writeAuditEvent(ctx, {
      event: AUDIT_EVENTS.entityUpdated,
      entity: { type: "use_case", id: data.id },
      next: { status: "defined", version: nextVersion },
    });
    await writeProductEvent(ctx, {
      event: PRODUCT_EVENTS.useCaseCompleted,
      entity: { type: "use_case", id: data.id },
      properties: {
        version: nextVersion,
        fromOpportunity: Boolean(row.source_opportunity_id),
        fromRepository: Boolean(row.source_use_case_id),
      },
    });

    return { ok: true as const, issues: [], version: nextVersion };
  });

/** Blank draft entry point — creates the record the wizard then fills in. */
export const startWizardDraftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().trim().min(3).max(200),
        sourceUseCaseId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { resolveWorkspaceId } = await import("@/lib/opportunities.server");
    const { ensureCaptureBoard, nextBoardPosition } = await import("@/lib/opportunities.server");

    const workspaceId = await resolveWorkspaceId(supabase);
    const boardId = await ensureCaptureBoard(supabase, workspaceId, userId);
    const position = await nextBoardPosition(supabase, boardId);

    const { data: row, error } = await supabase
      .from("ai_use_cases")
      .insert({
        board_id: boardId,
        title: data.title,
        status: "idea",
        position,
        created_by: userId,
        owner_user_id: userId,
        source_use_case_id: data.sourceUseCaseId ?? null,
        wizard_state: { opportunity: { title: data.title } } as unknown as Json,
        current_step: "opportunity",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not create the draft.");
    return { id: row.id as string };
  });
