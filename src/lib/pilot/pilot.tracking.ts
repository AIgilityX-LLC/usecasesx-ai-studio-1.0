/**
 * Pilot tracking — client-safe read model for two admin views:
 *
 * 1. Lead tracking: how many applications arrive, how many are approved, and
 *    which sectors and roles they come from.
 * 2. Cohort progress: where each seat holder stands on the six pilot steps.
 *
 * Pure functions only, so the numbers on screen are unit-tested.
 */

import type { PilotApplication } from "./pilot.applications";
import {
  PILOT_MILESTONES,
  isEvidenced,
  resolveMilestoneStatus,
  type PilotMilestoneKey,
  type PilotMilestoneStatus,
  type PilotProgressSummary,
} from "./pilot.milestones";

/* ------------------------------------------------------------ lead tracking */

export const NOT_GIVEN = "Not given";

export const ROLE_LEVELS = [
  "Executive / C-suite",
  "Head / Director",
  "Manager / Lead",
  "Consultant / Advisor",
  "Specialist / Analyst",
  "Other role",
] as const;
export type RoleLevel = (typeof ROLE_LEVELS)[number] | typeof NOT_GIVEN;

/** Role titles are free text; group them into levels a reviewer can compare. */
export function roleLevel(roleTitle: string | null | undefined): RoleLevel {
  const t = (roleTitle ?? "").trim().toLowerCase();
  if (!t) return NOT_GIVEN;
  if (
    /\b(ceo|cto|cio|cdo|cfo|coo|caio|cmo|chief|founder|co-founder|president|managing director|partner)\b/.test(
      t,
    )
  )
    return "Executive / C-suite";
  if (/\b(head|director|vp|vice president|svp|evp|gm|general manager)\b/.test(t))
    return "Head / Director";
  if (/\b(consultant|advisor|adviser|trainer|coach|freelance)\b/.test(t))
    return "Consultant / Advisor";
  if (/\b(manager|lead|leader|principal|owner)\b/.test(t)) return "Manager / Lead";
  if (/\b(analyst|engineer|scientist|specialist|architect|developer|officer|associate)\b/.test(t))
    return "Specialist / Analyst";
  return "Other role";
}

/** Same sector typed differently ("banking", " Banking ") counts once. */
export function sectorLabel(sector: string | null | undefined): string {
  const t = (sector ?? "").trim().replace(/\s+/g, " ");
  if (!t) return NOT_GIVEN;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type BreakdownRow = { label: string; total: number; approved: number };

function breakdown(
  rows: readonly PilotApplication[],
  keyOf: (row: PilotApplication) => string,
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const row of rows) {
    const label = keyOf(row);
    const key = label.toLowerCase();
    const entry = map.get(key) ?? { label, total: 0, approved: 0 };
    entry.total += 1;
    if (row.status === "approved") entry.approved += 1;
    map.set(key, entry);
  }
  // Largest first; "Not given" always last so real answers lead.
  return [...map.values()].sort((a, b) => {
    if (a.label === NOT_GIVEN) return 1;
    if (b.label === NOT_GIVEN) return -1;
    return b.total - a.total || a.label.localeCompare(b.label);
  });
}

export type WeeklyLeads = { weekStart: string; total: number; approved: number };

/** Monday 00:00 UTC of the week containing `date`, as YYYY-MM-DD. */
export function weekStartUtc(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

export type LeadTracking = {
  total: number;
  awaitingReview: number;
  approved: number;
  declined: number;
  merged: number;
  /** Approved ÷ decided (approved + declined + merged); null until any decision. */
  approvalRate: number | null;
  last7Days: number;
  last30Days: number;
  bySector: BreakdownRow[];
  byRole: BreakdownRow[];
  weekly: WeeklyLeads[];
};

export function buildLeadTracking(
  rows: readonly PilotApplication[],
  now: Date = new Date(),
  weeks = 8,
): LeadTracking {
  const approved = rows.filter((r) => r.status === "approved").length;
  const declined = rows.filter((r) => r.status === "declined").length;
  const merged = rows.filter((r) => r.status === "merged").length;
  const decided = approved + declined + merged;
  const day = 24 * 60 * 60 * 1000;
  const age = (r: PilotApplication) => now.getTime() - new Date(r.createdAt).getTime();

  const weekly: WeeklyLeads[] = [];
  const thisWeek = new Date(`${weekStartUtc(now)}T00:00:00Z`);
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(thisWeek.getTime() - i * 7 * day);
    weekly.push({ weekStart: start.toISOString().slice(0, 10), total: 0, approved: 0 });
  }
  const byWeek = new Map(weekly.map((w) => [w.weekStart, w]));
  for (const r of rows) {
    const bucket = byWeek.get(weekStartUtc(new Date(r.createdAt)));
    if (!bucket) continue;
    bucket.total += 1;
    if (r.status === "approved") bucket.approved += 1;
  }

  return {
    total: rows.length,
    awaitingReview: rows.filter((r) => r.status === "requested").length,
    approved,
    declined,
    merged,
    approvalRate: decided === 0 ? null : Math.round((approved / decided) * 100),
    last7Days: rows.filter((r) => age(r) <= 7 * day).length,
    last30Days: rows.filter((r) => age(r) <= 30 * day).length,
    bySector: breakdown(rows, (r) => sectorLabel(r.sector)),
    byRole: breakdown(rows, (r) => roleLevel(r.roleTitle)),
    weekly,
  };
}

/* --------------------------------------------------------- cohort progress */

/** One seat in the cohort, as read on the server (DTO, serialisable). */
export type CohortMemberInput = {
  invitationId: string;
  userId: string | null;
  email: string;
  fullName: string | null;
  organization: string | null;
  sector: string | null;
  roleTitle: string | null;
  seatStatus: string;
  invitedAt: string;
  joinedAt: string | null;
  progress: PilotProgressSummary | null;
  approvals: Partial<Record<PilotMilestoneKey, string>>;
};

export type CohortStep = { key: PilotMilestoneKey; status: PilotMilestoneStatus };

export type CohortMemberProgress = CohortMemberInput & {
  joined: boolean;
  steps: CohortStep[];
  /** Steps with evidence (ready, submitted, changes requested or approved). */
  stepsDone: number;
  stepsApproved: number;
  /** Share of steps with evidence, 0–100. */
  percent: number;
  /** First step that is not yet approved; null when every step is approved. */
  nextStep: PilotMilestoneKey | null;
  awaitingApproval: number;
};

export function buildMemberProgress(member: CohortMemberInput): CohortMemberProgress {
  const joined = Boolean(member.userId);
  const steps: CohortStep[] = PILOT_MILESTONES.map((m) => ({
    key: m.key,
    status:
      joined && member.progress
        ? resolveMilestoneStatus(isEvidenced(m.key, member.progress), member.approvals[m.key])
        : "locked",
  }));
  const stepsDone = steps.filter((s) => s.status !== "locked").length;
  const stepsApproved = steps.filter((s) => s.status === "approved").length;
  return {
    ...member,
    joined,
    steps,
    stepsDone,
    stepsApproved,
    percent: Math.round((stepsDone / steps.length) * 100),
    nextStep: steps.find((s) => s.status !== "approved")?.key ?? null,
    awaitingApproval: steps.filter((s) => s.status === "submitted").length,
  };
}

export type CohortStepFunnel = {
  key: PilotMilestoneKey;
  label: string;
  reached: number;
  approved: number;
};

export type CohortProgressSummary = {
  seats: number;
  joined: number;
  notJoined: number;
  /** Joined members with every step evidenced. */
  finished: number;
  /** Mean evidenced share across joined members, 0–100; null with nobody joined. */
  averagePercent: number | null;
  awaitingApproval: number;
  funnel: CohortStepFunnel[];
};

export function summarizeCohortProgress(
  members: readonly CohortMemberProgress[],
): CohortProgressSummary {
  const joined = members.filter((m) => m.joined);
  return {
    seats: members.length,
    joined: joined.length,
    notJoined: members.length - joined.length,
    finished: joined.filter((m) => m.stepsDone === PILOT_MILESTONES.length).length,
    averagePercent:
      joined.length === 0
        ? null
        : Math.round(joined.reduce((sum, m) => sum + m.percent, 0) / joined.length),
    awaitingApproval: members.reduce((sum, m) => sum + m.awaitingApproval, 0),
    funnel: PILOT_MILESTONES.map((def, i) => ({
      key: def.key,
      label: def.label,
      reached: joined.filter((m) => m.steps[i]!.status !== "locked").length,
      approved: joined.filter((m) => m.steps[i]!.status === "approved").length,
    })),
  };
}

/** Least progressed first, so the people who need a nudge sit at the top. */
export function sortByNeedsAttention(
  members: readonly CohortMemberProgress[],
): CohortMemberProgress[] {
  return [...members].sort((a, b) => {
    if (a.awaitingApproval !== b.awaitingApproval) return b.awaitingApproval - a.awaitingApproval;
    if (a.joined !== b.joined) return a.joined ? -1 : 1;
    return a.percent - b.percent || (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
  });
}
