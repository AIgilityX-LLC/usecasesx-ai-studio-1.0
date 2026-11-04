/**
 * Cohort progress reader (server-only).
 *
 * Measures other people's workspaces, so it runs with the service client and
 * must only be called after the caller is verified as a platform admin.
 */

import type { CohortMemberInput } from "./pilot.tracking";
import type { PilotMilestoneKey } from "./pilot.milestones";

type InvitationRow = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  organization: string | null;
  status: string;
  invited_at: string;
  registered_at: string | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  sector: string | null;
  role_title: string | null;
};

/** Small batches keep the per-member counting queries from flooding the API. */
const BATCH = 5;

export async function listCohortProgress(cohort: string): Promise<CohortMemberInput[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getMyProgressSummary } = await import("./pilot.milestones.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;

  const { data: invites, error } = await db
    .from("pilot_invitations")
    .select("id, user_id, email, full_name, organization, status, invited_at, registered_at")
    .eq("cohort", cohort)
    .neq("status", "revoked")
    .order("invited_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);

  const seats = (invites ?? []) as InvitationRow[];
  const userIds = Array.from(
    new Set(seats.map((s) => s.user_id).filter((id): id is string => Boolean(id))),
  );

  const profileByUser = new Map<string, ProfileRow>();
  const approvalsByUser = new Map<string, Partial<Record<PilotMilestoneKey, string>>>();
  if (userIds.length > 0) {
    const [profiles, approvals] = await Promise.all([
      db
        .from("pilot_onboarding_profiles")
        .select("user_id, full_name, organization, sector, role_title")
        .in("user_id", userIds),
      db
        .from("pilot_milestone_approvals")
        .select("user_id, milestone_key, status")
        .eq("cohort", cohort)
        .in("user_id", userIds),
    ]);
    for (const p of (profiles.data ?? []) as ProfileRow[]) profileByUser.set(p.user_id, p);
    for (const a of (approvals.data ?? []) as {
      user_id: string;
      milestone_key: PilotMilestoneKey;
      status: string;
    }[]) {
      const entry = approvalsByUser.get(a.user_id) ?? {};
      entry[a.milestone_key] = a.status;
      approvalsByUser.set(a.user_id, entry);
    }
  }

  const progressByUser = new Map<string, Awaited<ReturnType<typeof getMyProgressSummary>>>();
  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((id) => getMyProgressSummary(db, id)));
    batch.forEach((id, j) => progressByUser.set(id, results[j]!));
  }

  return seats.map((s) => {
    const profile = s.user_id ? profileByUser.get(s.user_id) : undefined;
    return {
      invitationId: s.id,
      userId: s.user_id,
      email: s.email,
      fullName: profile?.full_name ?? s.full_name,
      organization: profile?.organization ?? s.organization,
      sector: profile?.sector ?? null,
      roleTitle: profile?.role_title ?? null,
      seatStatus: s.status,
      invitedAt: s.invited_at,
      joinedAt: s.registered_at,
      progress: s.user_id ? (progressByUser.get(s.user_id) ?? null) : null,
      approvals: s.user_id ? (approvalsByUser.get(s.user_id) ?? {}) : {},
    };
  });
}
