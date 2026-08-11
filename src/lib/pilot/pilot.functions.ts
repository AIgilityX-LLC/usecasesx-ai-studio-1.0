import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PILOT_STATUSES } from "@/lib/pilot/pilot.model";

const CheckpointInput = z.object({
  checkpoint: z.enum(["welcome", "scoring", "final"]),
  journeyStage: z.string().trim().max(40).nullable().optional(),
  contextRoute: z.string().trim().max(300).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  effortRating: z.number().int().min(1).max(5).nullable().optional(),
  valueRating: z.number().int().min(1).max(5).nullable().optional(),
  willingness: z
    .enum(["would_not_pay", "team_budget", "department_budget", "enterprise_budget", "unsure"])
    .nullable()
    .optional(),
  advisoryInterest: z.boolean().default(false),
  blocked: z.boolean().default(false),
  comment: z.string().trim().max(2000).nullable().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

const InviteInput = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().max(120).nullable().optional(),
  organization: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const PauseInput = z.object({
  paused: z.boolean(),
  reason: z.string().trim().max(300).nullable().optional(),
});

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(PILOT_STATUSES),
  notes: z.string().trim().max(500).nullable().optional(),
});

/** Participant view: own invitation, measured mission progress, own answers. */
export const getMyPilotFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolvePilotForUser, listMyCheckpoints } = await import("@/lib/pilot/pilot.server");
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;
    const [{ invitation, progress }, checkpoints] = await Promise.all([
      resolvePilotForUser(context.supabase, context.userId, email),
      listMyCheckpoints(context.supabase, context.userId),
    ]);
    return { invitation, progress, checkpoints };
  });

export const submitPilotCheckpointFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CheckpointInput.parse(d))
  .handler(async ({ data, context }) => {
    const { insertCheckpointResponse } = await import("@/lib/pilot/pilot.server");
    const { data: own } = await context.supabase
      .from("pilot_invitations")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const record = await insertCheckpointResponse(context.supabase, {
      userId: context.userId,
      pilotId: (own as { id?: string } | null)?.id ?? null,
      checkpoint: data.checkpoint,
      journeyStage: data.journeyStage ?? null,
      contextRoute: data.contextRoute ?? null,
      rating: data.rating ?? null,
      effortRating: data.effortRating ?? null,
      valueRating: data.valueRating ?? null,
      willingness: data.willingness ?? null,
      advisoryInterest: data.advisoryInterest,
      blocked: data.blocked,
      comment: data.comment ?? null,
      workspaceId: data.workspaceId ?? null,
      organizationId: data.organizationId ?? null,
    });
    const { writeProductEvent } = await import("@/lib/telemetry/recorder.server");
    await writeProductEvent(
      {
        supabase: context.supabase,
        userId: context.userId,
        tenant: {
          workspaceId: data.workspaceId ?? null,
          organizationId: data.organizationId ?? null,
        },
      },
      {
        event: "pilot.checkpoint_answered",
        entity: { type: "pilot_checkpoint_responses", id: record.id },
        // Structured signal only — the free-text comment never enters telemetry.
        properties: { checkpoint: data.checkpoint, blocked: data.blocked },
      },
    );
    return record;
  });

/* --------------------------------------------------------------- admin */

async function assertPlatformAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  const { data: isAdmin, error } = await supabase.rpc("is_admin_tier", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Platform administrator access is required.");
}

export const getPilotCohortFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings, buildCohortView } = await import("@/lib/pilot/pilot.server");
    const settings = await getPilotSettings(context.supabase);
    const { rows, checkpoints } = await buildCohortView(context.supabase, settings.cohort);
    return { settings, rows, checkpoints };
  });

export const invitePilotParticipantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings, createInvitation, listInvitations } = await import(
      "@/lib/pilot/pilot.server"
    );
    const settings = await getPilotSettings(context.supabase);
    if (settings.invitationsPaused) {
      throw new Error(
        settings.pauseReason
          ? `New pilot invitations are paused: ${settings.pauseReason}`
          : "New pilot invitations are paused.",
      );
    }
    const existing = await listInvitations(context.supabase, settings.cohort);
    const active = existing.filter((i) => i.status !== "revoked");
    if (active.length >= settings.seatTarget) {
      throw new Error(
        `The cohort is full (${active.length}/${settings.seatTarget} seats). Revoke a seat or raise the target first.`,
      );
    }
    const invitation = await createInvitation(context.supabase, {
      cohort: settings.cohort,
      email: data.email,
      fullName: data.fullName ?? null,
      organization: data.organization ?? null,
      notes: data.notes ?? null,
      actorId: context.userId,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "membership.invited",
        entity: { type: "pilot_invitations", id: invitation.id },
        next: { cohort: invitation.cohort, status: invitation.status },
        severity: "notice",
      },
    );
    return invitation;
  });

export const setPilotInvitationStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { setInvitationStatus } = await import("@/lib/pilot/pilot.server");
    const invitation = await setInvitationStatus(context.supabase, {
      id: data.id,
      status: data.status,
      notes: data.notes ?? undefined,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "pilot_invitations", id: invitation.id },
        next: { status: invitation.status },
        severity: "notice",
      },
    );
    return invitation;
  });

/** P0 incident control: stops any new pilot invitation from being issued. */
export const setPilotInvitationsPausedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PauseInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { setInvitationsPaused } = await import("@/lib/pilot/pilot.server");
    const settings = await setInvitationsPaused(context.supabase, {
      paused: data.paused,
      reason: data.reason ?? null,
      actorId: context.userId,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "pilot_settings", id: settings.cohort },
        next: { invitationsPaused: settings.invitationsPaused },
        severity: settings.invitationsPaused ? "warning" : "notice",
      },
    );
    return settings;
  });
