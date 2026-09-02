import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PILOT_STATUSES } from "@/lib/pilot/pilot.model";
import { CANONICAL_ORIGIN } from "@/lib/ops/production-config";
import { PilotOnboardingSchema } from "@/lib/pilot/pilot.onboarding";

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
  missionStep: z.string().trim().max(40).nullable().optional(),
  useCaseIds: z.array(z.string().uuid()).max(20).default([]),
  portfolioId: z.string().uuid().nullable().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

const DispatchInput = z.object({
  invitationIds: z.array(z.string().uuid()).max(50).optional(),
  resend: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

const ClaimInput = z.object({ token: z.string().trim().min(16).max(200) });

const InviteInput = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().max(120).nullable().optional(),
  organization: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

/**
 * Bulk enrolment: a paste of work emails, or a parsed CSV roster carrying a
 * name, organisation and note per seat. Both shapes are capped at 25 seats.
 */
const BulkInviteInput = z
  .object({
    emails: z.array(z.string().trim().email().max(255)).max(25).default([]),
    participants: z
      .array(
        z.object({
          email: z.string().trim().email().max(255),
          fullName: z.string().trim().max(120).nullable().optional(),
          organization: z.string().trim().max(160).nullable().optional(),
          notes: z.string().trim().max(500).nullable().optional(),
        }),
      )
      .max(25)
      .default([]),
    organization: z.string().trim().max(160).nullable().optional(),
    /** Seeded seats are labelled so they can be excluded from evidence. */
    source: z.enum(["manual", "import", "seed"]).default("manual"),
  })
  .refine((value) => value.emails.length + value.participants.length > 0, {
    message: "Provide at least one email address.",
  })
  .refine((value) => value.emails.length + value.participants.length <= 25, {
    message: "A single enrolment may provision at most 25 seats.",
  });

const WaiverInput = z.object({
  reason: z.string().trim().min(20).max(1000),
  approverName: z.string().trim().min(2).max(120),
  approverRole: z.string().trim().min(2).max(120),
  /** ISO date-time; omit for an open-ended waiver that must be revoked by hand. */
  expiresAt: z.string().trim().datetime().nullable().optional(),
});

const RevokeWaiverInput = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().max(500).nullable().optional(),
});

const GapEmailInput = z.object({ dryRun: z.boolean().default(false) });

const PauseInput = z.object({
  paused: z.boolean(),
  reason: z.string().trim().max(300).nullable().optional(),
});

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(PILOT_STATUSES),
  notes: z.string().trim().max(500).nullable().optional(),
  reason: z.string().trim().max(500).nullable().optional(),
});

const ReminderIdInput = z.object({ id: z.string().uuid() });

const TriageInput = z.object({ windowDays: z.number().int().min(7).max(90).default(30) });

/** Participant view: own invitation, measured mission progress, own answers. */
export const getMyPilotFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolvePilotForUser, listMyCheckpoints, collectMissionReferences } =
      await import("@/lib/pilot/pilot.server");
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;
    const { listMyReminders } = await import("@/lib/pilot/pilot.reminders.server");
    const [{ invitation, progress }, checkpoints, reminders, references] = await Promise.all([
      resolvePilotForUser(context.supabase, context.userId, email),
      listMyCheckpoints(context.supabase, context.userId),
      listMyReminders(context.supabase, context.userId),
      collectMissionReferences(context.supabase, context.userId),
    ]);
    return { invitation, progress, checkpoints, reminders, references };
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
      missionStep: data.missionStep ?? null,
      useCaseIds: data.useCaseIds,
      portfolioId: data.portfolioId ?? null,
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
    const { listPilotAudit } = await import("@/lib/pilot/pilot.audit.server");
    const settings = await getPilotSettings(context.supabase);
    const { listCohortOnboarding } = await import("@/lib/pilot/pilot.onboarding.server");
    const [{ rows, checkpoints, emailByUserId }, audit, onboarding] = await Promise.all([
      buildCohortView(context.supabase, settings.cohort),
      listPilotAudit(context.supabase, settings.cohort),
      listCohortOnboarding(context.supabase, settings.cohort),
    ]);
    return { settings, rows, checkpoints, emailByUserId, audit, onboarding };
  });

/** Read-only stabilisation view: classified pilot evidence + freeze verdict. */
export const getPilotTriageFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TriageInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { buildPilotTriageReport } = await import("@/lib/pilot/pilot.triage.server");
    return buildPilotTriageReport(context.supabase, { windowDays: data.windowDays });
  });

export const invitePilotParticipantFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings, createInvitation, listInvitations } =
      await import("@/lib/pilot/pilot.server");
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

/** Sends (or re-sends) invitation messages and returns the claim links. */
export const dispatchPilotInvitesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DispatchInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings } = await import("@/lib/pilot/pilot.server");
    const { dispatchPilotInvitations } = await import("@/lib/pilot/pilot.invites.server");
    const settings = await getPilotSettings(context.supabase);
    let origin = CANONICAL_ORIGIN;
    try {
      origin = new URL(getRequest().url).origin;
    } catch {
      origin = CANONICAL_ORIGIN;
    }
    return dispatchPilotInvitations(context.supabase, {
      cohort: settings.cohort,
      origin,
      invitationIds: data.invitationIds,
      resend: data.resend,
      dryRun: data.dryRun,
      actorId: context.userId,
    });
  });

/** Claims a seat from an invitation link for the signed-in account. */
export const claimPilotInvitationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClaimInput.parse(d))
  .handler(async ({ data, context }) => {
    const { claimInvitationByToken } = await import("@/lib/pilot/pilot.invites.server");
    return claimInvitationByToken({ token: data.token, userId: context.userId });
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
      reason: data.reason ?? null,
      actorId: context.userId,
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

/** Enrol a cohort in one action; each seat is audited exactly as a single invite. */
export const invitePilotCohortFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkInviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings, createInvitation, listInvitations } =
      await import("@/lib/pilot/pilot.server");
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    const settings = await getPilotSettings(context.supabase);
    if (settings.invitationsPaused) {
      throw new Error(
        settings.pauseReason
          ? `New pilot invitations are paused: ${settings.pauseReason}`
          : "New pilot invitations are paused.",
      );
    }
    const existing = await listInvitations(context.supabase, settings.cohort);
    const taken = new Set(
      existing.filter((i) => i.status !== "revoked").map((i) => i.email.toLowerCase()),
    );
    const created: string[] = [];
    const skipped: { email: string; reason: string }[] = [];

    // One code path for both input shapes: pasted emails become bare seats.
    const roster = [
      ...data.participants.map((participant) => ({
        email: participant.email.toLowerCase(),
        fullName: participant.fullName ?? null,
        organization: participant.organization ?? data.organization ?? null,
        notes: participant.notes ?? null,
      })),
      ...data.emails.map((email) => ({
        email: email.toLowerCase(),
        fullName: null,
        organization: data.organization ?? null,
        notes: null,
      })),
    ];

    for (const entry of roster) {
      const email = entry.email;
      if (taken.has(email)) {
        skipped.push({ email, reason: "Already holds a seat in this cohort." });
        continue;
      }
      if (taken.size >= settings.seatTarget) {
        skipped.push({
          email,
          reason: `Cohort full (${taken.size}/${settings.seatTarget} seats).`,
        });
        continue;
      }
      try {
        const invitation = await createInvitation(context.supabase, {
          cohort: settings.cohort,
          email,
          fullName: entry.fullName,
          organization: entry.organization,
          notes: entry.notes,
          source: data.source,
          actorId: context.userId,
        });
        taken.add(email);
        created.push(email);
        await writeAuditEvent(
          { supabase: context.supabase, userId: context.userId },
          {
            event: "membership.invited",
            entity: { type: "pilot_invitations", id: invitation.id },
            next: { cohort: invitation.cohort, status: invitation.status },
            severity: "notice",
          },
        );
      } catch (error) {
        skipped.push({
          email,
          reason: error instanceof Error ? error.message : "Invitation failed.",
        });
      }
    }

    return { created, skipped, seatsUsed: taken.size, seatTarget: settings.seatTarget };
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

/** Participant dismisses one of their own reminders. */
export const dismissPilotReminderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReminderIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { dismissReminder } = await import("@/lib/pilot/pilot.reminders.server");
    await dismissReminder(context.supabase, { id: data.id, userId: context.userId });
    return { dismissed: true };
  });

/** Admin sweep: reminds participants of pending steps and unanswered checkpoints. */
export const sendPilotRemindersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings } = await import("@/lib/pilot/pilot.server");
    const { sweepCohortReminders } = await import("@/lib/pilot/pilot.reminders.server");
    const settings = await getPilotSettings(context.supabase);
    const result = await sweepCohortReminders(context.supabase, {
      cohort: settings.cohort,
      actorId: context.userId,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "pilot_reminders", id: settings.cohort },
        next: { remindersCreated: result.remindersCreated },
        severity: "notice",
      },
    );
    return result;
  });

/* ---------------------------------------------------------- governance */

/** Waivers, recorded verdicts and the reminder dispatch ledger for the cohort. */
export const getPilotGovernanceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings } = await import("@/lib/pilot/pilot.server");
    const { listWaivers, listVerdictSnapshots, listReminderDispatches } =
      await import("@/lib/pilot/pilot.governance.server");
    const settings = await getPilotSettings(context.supabase);
    const [waivers, snapshots, dispatches] = await Promise.all([
      listWaivers(context.supabase, settings.cohort),
      listVerdictSnapshots(context.supabase, settings.cohort),
      listReminderDispatches(context.supabase, settings.cohort),
    ]);
    return { cohort: settings.cohort, waivers, snapshots, dispatches };
  });

/**
 * Records a named launch waiver for the evidence shortfall. A waiver never
 * clears a P0 finding — that rule is enforced when the verdict is applied.
 */
export const grantLaunchWaiverFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => WaiverInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { getPilotSettings } = await import("@/lib/pilot/pilot.server");
    const { grantWaiver } = await import("@/lib/pilot/pilot.governance.server");
    const settings = await getPilotSettings(context.supabase);
    const waiver = await grantWaiver(context.supabase, {
      cohort: settings.cohort,
      scope: "pilot_evidence",
      reason: data.reason,
      approverName: data.approverName,
      approverRole: data.approverRole,
      expiresAt: data.expiresAt ?? null,
      actorId: context.userId,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "pilot_rc_waivers", id: waiver.id },
        next: { scope: waiver.scope, approver: waiver.approverName },
        severity: "warning",
      },
    );
    return waiver;
  });

export const revokeLaunchWaiverFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RevokeWaiverInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { revokeWaiver } = await import("@/lib/pilot/pilot.governance.server");
    const waiver = await revokeWaiver(context.supabase, {
      id: data.id,
      reason: data.reason ?? null,
      actorId: context.userId,
    });
    const { writeAuditEvent } = await import("@/lib/telemetry/recorder.server");
    await writeAuditEvent(
      { supabase: context.supabase, userId: context.userId },
      {
        event: "admin.action",
        entity: { type: "pilot_rc_waivers", id: waiver.id },
        next: { revoked: true },
        severity: "notice",
      },
    );
    return waiver;
  });

/**
 * Freezes the current verdict into the evidence timeline. The counts are
 * measured server-side from the triage report — never taken from the client.
 */
export const recordPilotVerdictFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { buildPilotTriageReport } = await import("@/lib/pilot/pilot.triage.server");
    const { listWaivers, recordVerdictSnapshot } =
      await import("@/lib/pilot/pilot.governance.server");
    const { activeWaiver, applyLaunchWaiver } = await import("@/lib/pilot/pilot.governance");
    const report = await buildPilotTriageReport(context.supabase, { windowDays: 30 });
    const waivers = await listWaivers(context.supabase, report.cohort);
    const waiver = activeWaiver(waivers);
    const applied = applyLaunchWaiver(report.freeze, waiver);
    return recordVerdictSnapshot(context.supabase, {
      cohort: report.cohort,
      verdict: applied.verdict,
      headline: applied.headline,
      freezeRecommended: applied.freezeRecommended,
      reasons: applied.reasons,
      invited: report.evidence.cohort.invited,
      registered: report.evidence.cohort.registered,
      checkpointAnswers: report.evidence.cohort.checkpointResponses,
      p0Count: report.freeze.counts.p0,
      p1Count: report.freeze.counts.p1,
      evidenceGapState: report.evidenceGap.state,
      waiverId: applied.waived ? (waiver?.id ?? null) : null,
      actorId: context.userId,
    });
  });

/** Manual run of the evidence-gap nudge pass the scheduler also performs. */
export const runEvidenceGapEmailsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GapEmailInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { buildPilotTriageReport } = await import("@/lib/pilot/pilot.triage.server");
    const { dispatchEvidenceGapEmails } = await import("@/lib/pilot/pilot.gap-emails.server");
    const report = await buildPilotTriageReport(context.supabase, { windowDays: 30 });
    return dispatchEvidenceGapEmails(context.supabase, {
      cohort: report.cohort,
      gap: report.evidenceGap,
      dryRun: data.dryRun,
    });
  });

/* ------------------------------------------------------- onboarding intake */

/** The caller's own pilot intake, plus the seat it belongs to. */
export const getMyPilotOnboardingFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getPilotSettings, resolvePilotForUser } = await import("@/lib/pilot/pilot.server");
    const { getMyOnboarding } = await import("@/lib/pilot/pilot.onboarding.server");
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;
    const settings = await getPilotSettings(context.supabase);
    const [{ invitation }, profile] = await Promise.all([
      resolvePilotForUser(context.supabase, context.userId, email),
      getMyOnboarding(context.supabase, context.userId, settings.cohort),
    ]);
    return { cohort: settings.cohort, invitation, profile };
  });

/** Saves the intake and activates the seat. Re-submitting updates in place. */
export const savePilotOnboardingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PilotOnboardingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { getPilotSettings, resolvePilotForUser } = await import("@/lib/pilot/pilot.server");
    const { saveOnboarding } = await import("@/lib/pilot/pilot.onboarding.server");
    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;
    const settings = await getPilotSettings(context.supabase);
    const { invitation } = await resolvePilotForUser(context.supabase, context.userId, email);
    return saveOnboarding(context.supabase, {
      userId: context.userId,
      cohort: settings.cohort,
      invitationId: invitation?.id ?? null,
      values: data,
    });
  });

/* --------------------------------------------------------- participant portal */

/**
 * Everything a participant's own portal needs in one round trip: their seat,
 * their intake, the use cases they own and every checkpoint answer they gave.
 */
export const getMyPilotPortalFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getPilotSettings, resolvePilotForUser, listMyCheckpoints } = await import(
      "@/lib/pilot/pilot.server"
    );
    const { getMyOnboarding } = await import("@/lib/pilot/pilot.onboarding.server");
    const { listMyPilotUseCases } = await import("@/lib/pilot/pilot.portal.server");

    const email =
      (context.claims as { email?: string } | undefined)?.email ??
      (await context.supabase.auth.getUser()).data?.user?.email ??
      null;

    const settings = await getPilotSettings(context.supabase);
    const [{ invitation, progress }, profile, checkpoints, useCases] = await Promise.all([
      resolvePilotForUser(context.supabase, context.userId, email),
      getMyOnboarding(context.supabase, context.userId, settings.cohort),
      listMyCheckpoints(context.supabase, context.userId),
      listMyPilotUseCases(context.supabase, context.userId),
    ]);

    return { cohort: settings.cohort, email, invitation, progress, profile, checkpoints, useCases };
  });
