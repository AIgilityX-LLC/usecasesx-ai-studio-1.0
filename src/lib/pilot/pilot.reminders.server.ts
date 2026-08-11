/**
 * Pilot reminders (server-only).
 *
 * Reminders are derived from measured mission progress and answered
 * checkpoints, then written idempotently: the table has a unique index over
 * (user, kind, step/checkpoint) for open reminders, so re-running a reminder
 * sweep never duplicates a nudge. Participants read and dismiss their own
 * reminders through RLS; creation runs on the service client because the table
 * grants no INSERT to signed-in users.
 */

import { buildReminderDrafts, computeMissionProgress, type PilotReminder } from "./pilot.model";
import { countMissionEventsForUsers, listInvitations } from "./pilot.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReminder(row: any): PilotReminder {
  return {
    id: String(row.id),
    kind: row.kind === "checkpoint" ? "checkpoint" : "mission_step",
    missionStep: row.mission_step ?? null,
    checkpoint: row.checkpoint ?? null,
    title: String(row.title),
    body: String(row.body),
    targetRoute: row.target_route ?? null,
    readAt: row.read_at ?? null,
    dismissedAt: row.dismissed_at ?? null,
    createdAt: String(row.created_at),
  };
}

export async function listMyReminders(supabase: Client, userId: string): Promise<PilotReminder[]> {
  const { data, error } = await supabase
    .from("pilot_reminders")
    .select("*")
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReminder);
}

export async function dismissReminder(
  supabase: Client,
  input: { id: string; userId: string },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("pilot_reminders")
    .update({ dismissed_at: now, read_at: now } as never)
    .eq("id", input.id)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
}

export type ReminderSweepResult = {
  participantsConsidered: number;
  remindersCreated: number;
  alreadyPending: number;
};

/**
 * Creates the pending-step and unanswered-checkpoint reminders for every
 * registered participant in the cohort. Idempotent by construction.
 */
export async function sweepCohortReminders(
  supabase: Client,
  input: { cohort: string; actorId: string },
): Promise<ReminderSweepResult> {
  const invitations = (await listInvitations(supabase, input.cohort)).filter(
    (invitation) => invitation.userId && invitation.status !== "revoked",
  );
  const userIds = invitations.map((invitation) => invitation.userId as string);
  if (userIds.length === 0) {
    return { participantsConsidered: 0, remindersCreated: 0, alreadyPending: 0 };
  }

  const eventsByUser = await countMissionEventsForUsers(supabase, userIds);

  const { data: answers, error: answersError } = await supabase
    .from("pilot_checkpoint_responses")
    .select("user_id, checkpoint")
    .in("user_id", userIds)
    .limit(2000);
  if (answersError) throw new Error(answersError.message);

  const answeredByUser: Record<string, string[]> = {};
  for (const raw of answers ?? []) {
    const row = raw as { user_id: string | null; checkpoint: string };
    if (!row.user_id) continue;
    (answeredByUser[row.user_id] ??= []).push(row.checkpoint);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: open, error: openError } = await supabaseAdmin
    .from("pilot_reminders")
    .select("user_id, kind, mission_step, checkpoint")
    .in("user_id", userIds)
    .is("dismissed_at", null)
    .limit(2000);
  if (openError) throw new Error(openError.message);

  const openKeys = new Set(
    (open ?? []).map((raw) => {
      const row = raw as {
        user_id: string;
        kind: string;
        mission_step: string | null;
        checkpoint: string | null;
      };
      return `${row.user_id}|${row.kind}|${row.mission_step ?? row.checkpoint ?? ""}`;
    }),
  );

  const pending: Record<string, unknown>[] = [];
  let alreadyPending = 0;

  for (const invitation of invitations) {
    const userId = invitation.userId as string;
    const progress = computeMissionProgress(eventsByUser[userId] ?? {});
    for (const draft of buildReminderDrafts(progress, answeredByUser[userId] ?? [])) {
      const key = `${userId}|${draft.kind}|${draft.missionStep ?? draft.checkpoint ?? ""}`;
      if (openKeys.has(key)) {
        alreadyPending += 1;
        continue;
      }
      openKeys.add(key);
      pending.push({
        invitation_id: invitation.id,
        user_id: userId,
        kind: draft.kind,
        mission_step: draft.missionStep,
        checkpoint: draft.checkpoint,
        title: draft.title,
        body: draft.body,
        target_route: draft.targetRoute,
        actor_id: input.actorId,
      });
    }
  }

  if (pending.length > 0) {
    const { error } = await supabaseAdmin.from("pilot_reminders").insert(pending as never);
    if (error) throw new Error(error.message);
  }

  return {
    participantsConsidered: invitations.length,
    remindersCreated: pending.length,
    alreadyPending,
  };
}
