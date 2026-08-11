/**
 * Server-only pilot persistence.
 *
 * Reads run through the caller's RLS-scoped client: a participant can only see
 * their own invitation, mission events and checkpoint answers; a platform admin
 * sees the cohort. Only two operations need the service client — linking a
 * registered account to its invitation and moving the invitation status — both
 * of which write to the pilot tables alone and never touch tenant content.
 */

import {
  PILOT_MISSION,
  computeMissionProgress,
  type MissionProgress,
  type PilotCheckpointResponse,
  type PilotCohortRow,
  type PilotInvitation,
  type PilotStatus,
} from "./pilot.model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const MISSION_EVENTS = PILOT_MISSION.map((s) => s.event);
const EVENT_SCAN_LIMIT = 2000;
const COHORT_LIMIT = 200;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvitation(row: any): PilotInvitation {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    email: String(row.email),
    fullName: row.full_name ?? null,
    organization: row.organization ?? null,
    status: (row.status ?? "invited") as PilotStatus,
    userId: row.user_id ?? null,
    notes: row.notes ?? null,
    invitedAt: String(row.invited_at ?? row.created_at),
    registeredAt: row.registered_at ?? null,
    activatedAt: row.activated_at ?? null,
    completedAt: row.completed_at ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCheckpoint(row: any): PilotCheckpointResponse {
  return {
    id: String(row.id),
    checkpoint: String(row.checkpoint),
    journeyStage: row.journey_stage ?? null,
    contextRoute: row.context_route ?? null,
    rating: row.rating ?? null,
    effortRating: row.effort_rating ?? null,
    valueRating: row.value_rating ?? null,
    willingness: row.willingness ?? null,
    advisoryInterest: Boolean(row.advisory_interest),
    blocked: Boolean(row.blocked),
    comment: row.comment ?? null,
    createdAt: String(row.created_at),
    userId: row.user_id ?? null,
    missionStep: row.mission_step ?? null,
    useCaseIds: Array.isArray(row.use_case_ids) ? row.use_case_ids.map(String) : [],
    portfolioId: row.portfolio_id ?? null,
  };
}

/* ------------------------------------------------------------- settings */

export type PilotSettings = {
  cohort: string;
  invitationsPaused: boolean;
  pauseReason: string | null;
  pausedAt: string | null;
  seatTarget: number;
};

export async function getPilotSettings(supabase: Client): Promise<PilotSettings> {
  const { data, error } = await supabase
    .from("pilot_settings")
    .select("cohort, invitations_paused, pause_reason, paused_at, seat_target")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    cohort: String(data?.cohort ?? "founding-pilot-2026-08"),
    invitationsPaused: Boolean(data?.invitations_paused),
    pauseReason: data?.pause_reason ?? null,
    pausedAt: data?.paused_at ?? null,
    seatTarget: Number(data?.seat_target ?? 25),
  };
}

export async function setInvitationsPaused(
  supabase: Client,
  input: { paused: boolean; reason: string | null; actorId: string },
): Promise<PilotSettings> {
  const { error } = await supabase
    .from("pilot_settings")
    .update({
      invitations_paused: input.paused,
      pause_reason: input.paused ? input.reason : null,
      paused_by: input.paused ? input.actorId : null,
      paused_at: input.paused ? new Date().toISOString() : null,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);
  const settings = await getPilotSettings(supabase);
  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: settings.cohort,
    action: input.paused ? "invitations.paused" : "invitations.resumed",
    reason: input.reason,
    actorId: input.actorId,
  });
  return settings;
}

/* ---------------------------------------------------------- invitations */

export async function createInvitation(
  supabase: Client,
  input: {
    cohort: string;
    email: string;
    fullName: string | null;
    organization: string | null;
    notes: string | null;
    actorId: string;
  },
): Promise<PilotInvitation> {
  const { data, error } = await supabase
    .from("pilot_invitations")
    .insert({
      cohort: input.cohort,
      email: input.email.toLowerCase(),
      full_name: input.fullName,
      organization: input.organization,
      notes: input.notes,
      invited_by: input.actorId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const invitation = mapInvitation(data);
  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: invitation.cohort,
    invitationId: invitation.id,
    subjectEmail: invitation.email,
    action: "invitation.created",
    toStatus: invitation.status,
    reason: input.notes,
    actorId: input.actorId,
  });
  return invitation;
}

export async function setInvitationStatus(
  supabase: Client,
  input: {
    id: string;
    status: PilotStatus;
    notes?: string | null;
    reason?: string | null;
    actorId?: string | null;
  },
): Promise<PilotInvitation> {
  const { data: before } = await supabase
    .from("pilot_invitations")
    .select("status")
    .eq("id", input.id)
    .maybeSingle();
  const fromStatus = (before as { status?: string } | null)?.status ?? null;
  const patch: Record<string, unknown> = { status: input.status };
  if (input.notes !== undefined) patch["notes"] = input.notes;
  if (input.status === "completed") patch["completed_at"] = new Date().toISOString();
  const { data, error } = await supabase
    .from("pilot_invitations")
    .update(patch as never)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const invitation = mapInvitation(data);
  const { writePilotAudit } = await import("./pilot.audit.server");
  await writePilotAudit({
    cohort: invitation.cohort,
    invitationId: invitation.id,
    subjectEmail: invitation.email,
    subjectUserId: invitation.userId,
    action: input.status === "revoked" ? "invitation.revoked" : "invitation.status_changed",
    fromStatus,
    toStatus: invitation.status,
    reason: input.reason ?? input.notes ?? null,
    actorId: input.actorId ?? null,
  });
  return invitation;
}

export async function listInvitations(
  supabase: Client,
  cohort: string,
): Promise<PilotInvitation[]> {
  const { data, error } = await supabase
    .from("pilot_invitations")
    .select("*")
    .eq("cohort", cohort)
    .order("invited_at", { ascending: false })
    .limit(COHORT_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapInvitation);
}

/* ------------------------------------------------------------- mission */

/** Counts the caller's own mission evidence. Bounded scan, no fabrication. */
export async function countMissionEvents(
  supabase: Client,
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("product_events")
    .select("event_name, user_id")
    .eq("user_id", userId)
    .in("event_name", MISSION_EVENTS)
    .limit(EVENT_SCAN_LIMIT);
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const name = String((row as { event_name: string }).event_name);
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

/** Cohort-wide counts in one bounded read (cohort is ≤ 25 people). */
export async function countMissionEventsForUsers(
  supabase: Client,
  userIds: string[],
): Promise<Record<string, Record<string, number>>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase
    .from("product_events")
    .select("event_name, user_id")
    .in("user_id", userIds)
    .in("event_name", MISSION_EVENTS)
    .limit(EVENT_SCAN_LIMIT * 5);
  if (error) throw new Error(error.message);
  const byUser: Record<string, Record<string, number>> = {};
  for (const raw of data ?? []) {
    const row = raw as { event_name: string; user_id: string | null };
    if (!row.user_id) continue;
    const bucket = (byUser[row.user_id] ??= {});
    bucket[row.event_name] = (bucket[row.event_name] ?? 0) + 1;
  }
  return byUser;
}

/* ---------------------------------------------------------- checkpoints */

export async function listMyCheckpoints(
  supabase: Client,
  userId: string,
): Promise<PilotCheckpointResponse[]> {
  const { data, error } = await supabase
    .from("pilot_checkpoint_responses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCheckpoint);
}

export async function listCohortCheckpoints(
  supabase: Client,
  cohort: string,
): Promise<PilotCheckpointResponse[]> {
  const { data, error } = await supabase
    .from("pilot_checkpoint_responses")
    .select("*, pilot_invitations!inner(cohort)")
    .eq("pilot_invitations.cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCheckpoint);
}

export async function insertCheckpointResponse(
  supabase: Client,
  input: {
    userId: string;
    pilotId: string | null;
    checkpoint: string;
    journeyStage: string | null;
    contextRoute: string | null;
    rating: number | null;
    effortRating: number | null;
    valueRating: number | null;
    willingness: string | null;
    advisoryInterest: boolean;
    blocked: boolean;
    comment: string | null;
    missionStep: string | null;
    useCaseIds: string[];
    portfolioId: string | null;
    workspaceId: string | null;
    organizationId: string | null;
  },
): Promise<PilotCheckpointResponse> {
  const { data, error } = await supabase
    .from("pilot_checkpoint_responses")
    .insert({
      user_id: input.userId,
      pilot_id: input.pilotId,
      checkpoint: input.checkpoint,
      journey_stage: input.journeyStage,
      context_route: input.contextRoute,
      rating: input.rating,
      effort_rating: input.effortRating,
      value_rating: input.valueRating,
      willingness: input.willingness,
      advisory_interest: input.advisoryInterest,
      blocked: input.blocked,
      comment: input.comment,
      mission_step: input.missionStep,
      use_case_ids: input.useCaseIds,
      portfolio_id: input.portfolioId,
      workspace_id: input.workspaceId,
      organization_id: input.organizationId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCheckpoint(data);
}

/* ------------------------------------------------- participant lifecycle */

/**
 * Resolves the caller's invitation and keeps its lifecycle stamps current.
 *
 * Linking and status stamps are pilot-programme bookkeeping the participant is
 * not allowed to write, so they run on the service client — scoped to
 * `pilot_invitations` only, and only for the caller's own email/id.
 */
export async function resolvePilotForUser(
  supabase: Client,
  userId: string,
  email: string | null,
): Promise<{ invitation: PilotInvitation | null; progress: MissionProgress }> {
  const counts = await countMissionEvents(supabase, userId);
  const progress = computeMissionProgress(counts);

  const { data: own } = await supabase
    .from("pilot_invitations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let row = own ? mapInvitation(own) : null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (!row && email) {
    const { data: match } = await supabaseAdmin
      .from("pilot_invitations")
      .select("*")
      .ilike("email", email)
      .is("user_id", null)
      .neq("status", "revoked")
      .maybeSingle();
    if (match) {
      const { data: linked } = await supabaseAdmin
        .from("pilot_invitations")
        .update({
          user_id: userId,
          status: "registered",
          registered_at: new Date().toISOString(),
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("id", (match as any).id)
        .select("*")
        .maybeSingle();
      row = linked ? mapInvitation(linked) : mapInvitation(match);
      const { writePilotAudit } = await import("./pilot.audit.server");
      await writePilotAudit({
        cohort: row.cohort,
        invitationId: row.id,
        subjectEmail: row.email,
        subjectUserId: userId,
        action: "invitation.linked",
        fromStatus: "invited",
        toStatus: "registered",
        actorId: userId,
        actorKind: "participant",
      });
    }
  }

  if (!row) return { invitation: null, progress };

  // Idempotent lifecycle stamps derived from measured activity.
  const patch: Record<string, unknown> = {};
  if (progress.activated && !row.activatedAt) {
    patch["activated_at"] = new Date().toISOString();
    if (row.status === "invited" || row.status === "registered") patch["status"] = "activated";
  }
  if (progress.complete && !row.completedAt) {
    patch["completed_at"] = new Date().toISOString();
    if (row.status !== "revoked") patch["status"] = "completed";
  }
  if (Object.keys(patch).length > 0) {
    const { data: updated } = await supabaseAdmin
      .from("pilot_invitations")
      .update(patch as never)
      .eq("id", row.id)
      .select("*")
      .maybeSingle();
    if (updated) row = mapInvitation(updated);
  }

  return { invitation: row, progress };
}

/* ------------------------------------------------------- admin cohort view */

export async function buildCohortView(
  supabase: Client,
  cohort: string,
): Promise<{
  rows: PilotCohortRow[];
  checkpoints: PilotCheckpointResponse[];
  emailByUserId: Record<string, string>;
}> {
  const invitations = await listInvitations(supabase, cohort);
  const userIds = invitations.map((i) => i.userId).filter((id): id is string => Boolean(id));
  const [eventsByUser, checkpoints] = await Promise.all([
    countMissionEventsForUsers(supabase, userIds),
    listCohortCheckpoints(supabase, cohort),
  ]);

  const rows: PilotCohortRow[] = invitations.map((invitation) => {
    const mine = checkpoints.filter((c) => c.userId && c.userId === invitation.userId);
    return {
      ...invitation,
      progress: computeMissionProgress(
        invitation.userId ? (eventsByUser[invitation.userId] ?? {}) : {},
      ),
      checkpointCount: mine.length,
      advisoryInterest: mine.some((c) => c.advisoryInterest),
      blockersReported: mine.filter((c) => c.blocked).length,
    };
  });

  const emailByUserId: Record<string, string> = {};
  for (const invitation of invitations) {
    if (invitation.userId) emailByUserId[invitation.userId] = invitation.email;
  }

  return { rows, checkpoints, emailByUserId };
}
