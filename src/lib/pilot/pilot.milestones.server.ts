/**
 * Milestone progress + approval read/write model.
 *
 * Participant reads run through the caller's own RLS session, so a
 * participant only ever measures their own workspace. Admin reads are
 * authorised by `requirePlatformAdmin` before they get here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PILOT_MILESTONES,
  evidenceCount,
  isEvidenced,
  type PilotMilestoneKey,
  type PilotMilestoneView,
  type PilotProgressSummary,
} from "@/lib/pilot/pilot.milestones";

type Client = SupabaseClient<any, "public", any>;

type ApprovalRow = {
  user_id: string;
  milestone_key: string;
  status: string;
  participant_note: string | null;
  decision_note: string | null;
  decided_by_label: string | null;
  decided_at: string | null;
  submitted_at: string | null;
};

/** Counts every milestone is measured against, for one participant. */
export async function getMyProgressSummary(
  supabase: Client,
  userId: string,
): Promise<PilotProgressSummary> {
  const head = { count: "exact" as const, head: true };

  const [useCases, scores, portfolios, checkpoints, onboarding] = await Promise.all([
    supabase.from("ai_use_cases").select("id", head).eq("created_by", userId),
    supabase.from("scorecard_results").select("id", head).eq("created_by", userId),
    supabase.from("portfolios").select("id").eq("user_id", userId),
    supabase.from("pilot_checkpoint_responses").select("id", head).eq("user_id", userId),
    supabase.from("pilot_onboarding_profiles").select("id").eq("user_id", userId).limit(1),
  ]);

  const portfolioIds = ((portfolios.data ?? []) as { id: string }[]).map((p) => p.id);

  let portfolioItems = 0;
  let roadmapItems = 0;
  if (portfolioIds.length > 0) {
    const { data: items } = await supabase
      .from("portfolio_items")
      .select("use_case_id, target_period, planned_start_date, delivery_stage")
      .in("portfolio_id", portfolioIds);
    const rows = (items ?? []) as {
      target_period: string | null;
      planned_start_date: string | null;
      delivery_stage: string | null;
    }[];
    portfolioItems = rows.length;
    roadmapItems = rows.filter(
      (r) => r.target_period || r.planned_start_date || r.delivery_stage,
    ).length;
  }

  return {
    useCases: useCases.count ?? 0,
    scores: scores.count ?? 0,
    portfolios: portfolioIds.length,
    portfolioItems,
    roadmapItems,
    checkpoints: checkpoints.count ?? 0,
    onboarded: ((onboarding.data ?? []) as unknown[]).length > 0,
  };
}

function toView(
  key: PilotMilestoneKey,
  progress: PilotProgressSummary,
  row: ApprovalRow | undefined,
): PilotMilestoneView {
  const evidenced = isEvidenced(key, progress);
  const status: PilotMilestoneView["status"] =
    row?.status === "approved"
      ? "approved"
      : row?.status === "changes_requested"
        ? "changes_requested"
        : row?.status === "submitted"
          ? "submitted"
          : evidenced
            ? "ready"
            : "locked";

  return {
    key,
    status,
    evidenceCount: evidenceCount(key, progress),
    participantNote: row?.participant_note ?? null,
    decisionNote: row?.decision_note ?? null,
    decidedByLabel: row?.decided_by_label ?? null,
    decidedAt: row?.decided_at ?? null,
    submittedAt: row?.submitted_at ?? null,
  };
}

export async function getMyMilestones(
  supabase: Client,
  userId: string,
  cohort: string,
): Promise<{ progress: PilotProgressSummary; milestones: PilotMilestoneView[] }> {
  const [progress, approvals] = await Promise.all([
    getMyProgressSummary(supabase, userId),
    supabase
      .from("pilot_milestone_approvals")
      .select(
        "user_id, milestone_key, status, participant_note, decision_note, decided_by_label, decided_at, submitted_at",
      )
      .eq("user_id", userId)
      .eq("cohort", cohort),
  ]);

  const byKey = new Map<string, ApprovalRow>();
  for (const row of (approvals.data ?? []) as ApprovalRow[]) byKey.set(row.milestone_key, row);

  return {
    progress,
    milestones: PILOT_MILESTONES.map((m) => toView(m.key, progress, byKey.get(m.key))),
  };
}

/**
 * Submit (or re-submit after changes were requested) one milestone. The
 * measured evidence is stored alongside so an approver reviews the numbers the
 * participant actually had at submission time.
 */
export async function submitMilestone(
  supabase: Client,
  params: { userId: string; cohort: string; key: PilotMilestoneKey; note: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const progress = await getMyProgressSummary(supabase, params.userId);
  if (!isEvidenced(params.key, progress)) {
    return { ok: false, error: "Finish the underlying work before submitting this milestone." };
  }

  const { error } = await supabase.from("pilot_milestone_approvals").upsert(
    {
      user_id: params.userId,
      cohort: params.cohort,
      milestone_key: params.key,
      status: "submitted",
      participant_note: params.note,
      evidence: progress as unknown as Record<string, unknown>,
      submitted_at: new Date().toISOString(),
      decision_note: null,
      decided_at: null,
      decided_by: null,
      decided_by_label: null,
    },
    { onConflict: "user_id,cohort,milestone_key" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type PendingMilestoneApproval = {
  userId: string;
  milestoneKey: string;
  status: string;
  participantNote: string | null;
  submittedAt: string | null;
  evidence: Record<string, string | number | boolean | null>;
  participantName: string | null;
  participantEmail: string | null;
  organization: string | null;
  sector: string | null;
  country: string | null;
};

/** Admin queue: every submitted milestone plus who it belongs to. */
export async function listMilestoneApprovals(
  supabase: Client,
  cohort: string,
  status: "submitted" | "all",
): Promise<PendingMilestoneApproval[]> {
  let query = supabase
    .from("pilot_milestone_approvals")
    .select("user_id, milestone_key, status, participant_note, submitted_at, evidence")
    .eq("cohort", cohort)
    .order("submitted_at", { ascending: false })
    .limit(400);
  if (status === "submitted") query = query.eq("status", "submitted");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as {
    user_id: string;
    milestone_key: string;
    status: string;
    participant_note: string | null;
    submitted_at: string | null;
    evidence: Record<string, string | number | boolean | null> | null;
  }[];
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from("pilot_onboarding_profiles")
    .select("user_id, full_name, organization, sector, country")
    .in("user_id", userIds);

  const byUser = new Map<string, Record<string, string | null>>();
  for (const p of (profiles ?? []) as Record<string, string | null>[]) {
    if (p.user_id) byUser.set(p.user_id, p);
  }

  const { data: invites } = await supabase
    .from("pilot_invitations")
    .select("claimed_by, email")
    .in("claimed_by", userIds);
  const emailByUser = new Map<string, string | null>();
  for (const i of (invites ?? []) as { claimed_by: string | null; email: string | null }[]) {
    if (i.claimed_by) emailByUser.set(i.claimed_by, i.email);
  }

  return rows.map((r) => {
    const profile = byUser.get(r.user_id);
    return {
      userId: r.user_id,
      milestoneKey: r.milestone_key,
      status: r.status,
      participantNote: r.participant_note,
      submittedAt: r.submitted_at,
      evidence: r.evidence ?? {},
      participantName: profile?.full_name ?? null,
      participantEmail: emailByUser.get(r.user_id) ?? null,
      organization: profile?.organization ?? null,
      sector: profile?.sector ?? null,
      country: profile?.country ?? null,
    };
  });
}

/** Admin decision on one milestone. */
export async function decideMilestone(
  supabase: Client,
  params: {
    userId: string;
    cohort: string;
    key: string;
    decision: "approved" | "changes_requested";
    note: string | null;
    reviewerId: string;
    reviewerLabel: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  // SoD: an admin must not approve/reject their own pilot milestone submission.
  if (params.userId === params.reviewerId) {
    return {
      ok: false,
      error: "Segregation of duties: you cannot decide on your own pilot milestone.",
    };
  }

  const { error } = await supabase
    .from("pilot_milestone_approvals")
    .update({
      status: params.decision,
      decision_note: params.note,
      decided_by: params.reviewerId,
      decided_by_label: params.reviewerLabel,
      decided_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId)
    .eq("cohort", params.cohort)
    .eq("milestone_key", params.key);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
