/**
 * AI Use Case Discovery & Value Design Workshop — pure domain model.
 *
 * No React, no Supabase, no `import.meta`. Safe to import from server
 * functions, browser components and tests alike.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ stages */

export const WORKSHOP_STAGES = [
  "context",
  "pain_points",
  "capture",
  "generation",
  "scoring",
  "shortlist",
  "portfolio",
  "outcomes",
] as const;
export type WorkshopStage = (typeof WORKSHOP_STAGES)[number];

export const STAGE_META: Record<WorkshopStage, { label: string; description: string }> = {
  context: {
    label: "Context",
    description: "Objective, functions in scope and the participants in the room.",
  },
  pain_points: {
    label: "Pain points",
    description: "Collect what is going wrong today, in the participants' own words.",
  },
  capture: {
    label: "Opportunity capture",
    description: "Turn raw pain points into named business opportunities.",
  },
  generation: {
    label: "Use case generation",
    description: "Propose candidate AI use cases against the captured opportunities.",
  },
  scoring: {
    label: "Voting & scoring",
    description: "Every participant scores value, feasibility and urgency once per item.",
  },
  shortlist: {
    label: "Shortlist",
    description: "Facilitator confirms the shortlist from the ranked longlist.",
  },
  portfolio: {
    label: "Portfolio",
    description: "Convert shortlisted items into opportunities and Studio drafts.",
  },
  outcomes: {
    label: "Outcomes",
    description: "Generate the outcome summary the client leaves the room with.",
  },
};

export function stageIndex(stage: WorkshopStage): number {
  return WORKSHOP_STAGES.indexOf(stage);
}

export function nextStage(stage: WorkshopStage): WorkshopStage | null {
  const i = stageIndex(stage);
  return i >= 0 && i < WORKSHOP_STAGES.length - 1
    ? (WORKSHOP_STAGES[i + 1] as WorkshopStage)
    : null;
}

/* ------------------------------------------------------------------ status */

export const WORKSHOP_STATUSES = ["draft", "live", "closed"] as const;
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

export const WORKSHOP_STATUS_LABEL: Record<WorkshopStatus, string> = {
  draft: "Preparing",
  live: "In session",
  closed: "Closed",
};

/* ------------------------------------------------------------------- items */

export const WORKSHOP_ITEM_KINDS = ["context", "pain_point", "opportunity", "use_case"] as const;
export type WorkshopItemKind = (typeof WORKSHOP_ITEM_KINDS)[number];

export const ITEM_KIND_LABEL: Record<WorkshopItemKind, string> = {
  context: "Context note",
  pain_point: "Pain point",
  opportunity: "Opportunity",
  use_case: "Use case",
};

/** Stage that owns each item kind, so submissions cannot arrive out of order. */
export const KIND_STAGE: Record<WorkshopItemKind, WorkshopStage> = {
  context: "context",
  pain_point: "pain_points",
  opportunity: "capture",
  use_case: "generation",
};

export const WORKSHOP_ITEM_STATUSES = [
  "submitted",
  "accepted",
  "shortlisted",
  "merged",
  "rejected",
] as const;
export type WorkshopItemStatus = (typeof WORKSHOP_ITEM_STATUSES)[number];

export const ITEM_STATUS_LABEL: Record<WorkshopItemStatus, string> = {
  submitted: "Submitted",
  accepted: "Accepted",
  shortlisted: "Shortlisted",
  merged: "Merged",
  rejected: "Parked",
};

/** Items that were merged away or parked never count towards a result. */
export function isCountable(status: WorkshopItemStatus): boolean {
  return status !== "merged" && status !== "rejected";
}

/* ------------------------------------------------------------------- votes */

export const VOTE_CRITERIA = ["value", "feasibility", "urgency"] as const;
export type VoteCriterion = (typeof VOTE_CRITERIA)[number];

/** Dot-voting uses a dedicated criterion; ignored by weighted scoreItems. */
export const DOT_VOTE_CRITERION = "dots" as const;
export type AnyVoteCriterion = VoteCriterion | typeof DOT_VOTE_CRITERION;

export const CRITERION_LABEL: Record<VoteCriterion, string> = {
  value: "Business value",
  feasibility: "Feasibility",
  urgency: "Urgency",
};

export const VOTE_MIN = 1;
export const VOTE_MAX = 5;

/** Weighting used to rank the longlist. Deliberately transparent and fixed. */
export const CRITERION_WEIGHT: Record<VoteCriterion, number> = {
  value: 0.5,
  feasibility: 0.3,
  urgency: 0.2,
};

export type VoteRecord = {
  itemId: string;
  voterId: string;
  criterion: string;
  score: number;
};

export type ItemScore = {
  itemId: string;
  /** Mean score per criterion, undefined when nobody scored it. */
  averages: Partial<Record<VoteCriterion, number>>;
  /** Weighted composite on the same 1–5 scale, or null when unscored. */
  composite: number | null;
  voters: number;
  votes: number;
};

/**
 * Rule-bound aggregation: one score per voter per criterion (later votes for
 * the same triple must be upserted, never appended), unscored criteria are
 * excluded from the composite rather than treated as zero, and the composite
 * is only produced when at least one criterion has a score.
 */
export function scoreItems(votes: VoteRecord[]): Map<string, ItemScore> {
  const byItem = new Map<
    string,
    { sums: Map<VoteCriterion, { total: number; n: number }>; voters: Set<string>; votes: number }
  >();

  for (const vote of votes) {
    if (!VOTE_CRITERIA.includes(vote.criterion)) continue;
    if (!Number.isFinite(vote.score)) continue;
    const clamped = Math.min(VOTE_MAX, Math.max(VOTE_MIN, vote.score));
    const entry = byItem.get(vote.itemId) ?? {
      sums: new Map<VoteCriterion, { total: number; n: number }>(),
      voters: new Set<string>(),
      votes: 0,
    };
    const bucket = entry.sums.get(vote.criterion) ?? { total: 0, n: 0 };
    bucket.total += clamped;
    bucket.n += 1;
    entry.sums.set(vote.criterion, bucket);
    entry.voters.add(vote.voterId);
    entry.votes += 1;
    byItem.set(vote.itemId, entry);
  }

  const result = new Map<string, ItemScore>();
  for (const [itemId, entry] of byItem) {
    const averages: Partial<Record<VoteCriterion, number>> = {};
    let weighted = 0;
    let weight = 0;
    for (const criterion of VOTE_CRITERIA) {
      const bucket = entry.sums.get(criterion);
      if (!bucket || bucket.n === 0) continue;
      const avg = bucket.total / bucket.n;
      averages[criterion] = avg;
      weighted += avg * CRITERION_WEIGHT[criterion];
      weight += CRITERION_WEIGHT[criterion];
    }
    result.set(itemId, {
      itemId,
      averages,
      composite: weight > 0 ? weighted / weight : null,
      voters: entry.voters.size,
      votes: entry.votes,
    });
  }
  return result;
}

/* ------------------------------------------------------- outcome buckets */

export type OutcomeBucket = "quick_win" | "strategic_bet" | "incremental" | "reconsider";

export const BUCKET_LABEL: Record<OutcomeBucket, string> = {
  quick_win: "Quick win",
  strategic_bet: "Strategic bet",
  incremental: "Incremental",
  reconsider: "Reconsider",
};

const HIGH = 3.5;

/**
 * Two-axis classification used by the outcome summary. Items without both a
 * value and a feasibility average are not classified at all — no invented
 * position on the matrix.
 */
export function classify(score: ItemScore | undefined): OutcomeBucket | null {
  const value = score?.averages.value;
  const feasibility = score?.averages.feasibility;
  if (value == null || feasibility == null) return null;
  if (value >= HIGH && feasibility >= HIGH) return "quick_win";
  if (value >= HIGH && feasibility < HIGH) return "strategic_bet";
  if (value < HIGH && feasibility >= HIGH) return "incremental";
  return "reconsider";
}

/* --------------------------------------------------------- similarity hint */

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "our",
  "are",
  "not",
  "can",
  "how",
  "using",
  "use",
  "ai",
]);

export function keywordsOf(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
    ),
  ).slice(0, 8);
}

/** Jaccard overlap on keywords — cheap, deterministic, explainable. */
export function similarity(a: string, b: string): number {
  const left = new Set(keywordsOf(a));
  const right = new Set(keywordsOf(b));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

export const SIMILARITY_HINT_THRESHOLD = 0.34;

/** Non-blocking duplicate hints. Never prevents a submission. */
export function similarityHints<T extends { id: string; title: string; status: string }>(
  title: string,
  candidates: T[],
  excludeId?: string | null,
): Array<{ item: T; score: number }> {
  return candidates
    .filter((c) => c.id !== excludeId && isCountable(c.status as WorkshopItemStatus))
    .map((item) => ({ item, score: similarity(title, item.title) }))
    .filter((hit) => hit.score >= SIMILARITY_HINT_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/* ------------------------------------------------------------------ schemas */

export const workshopSetupSchema = z.object({
  title: z.string().trim().min(3, "Give the session a name").max(160),
  clientName: z.string().trim().max(160).optional().default(""),
  objective: z.string().trim().max(2000).optional().default(""),
  businessFunctions: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  startsOn: z.string().trim().max(10).nullable().optional(),
  endsOn: z.string().trim().max(10).nullable().optional(),
});
export type WorkshopSetup = z.infer<typeof workshopSetupSchema>;

export const participantSchema = z.object({
  displayName: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  role: z.enum(["facilitator", "participant", "observer"]).default("participant"),
});
export type ParticipantInput = z.infer<typeof participantSchema>;

export const itemSchema = z.object({
  kind: z.enum(WORKSHOP_ITEM_KINDS),
  title: z.string().trim().min(3, "Describe it in a few words").max(200),
  detail: z.string().trim().max(4000).optional().default(""),
  businessFunction: z.string().trim().max(120).optional().default(""),
});
export type WorkshopItemInput = z.infer<typeof itemSchema>;

/* -------------------------------------------------------------- view types */

export type WorkshopParticipant = {
  id: string;
  workshopId: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  role: "facilitator" | "participant" | "observer";
  createdAt: string;
};

export type WorkshopItem = {
  id: string;
  workshopId: string;
  kind: WorkshopItemKind;
  title: string;
  detail: string;
  businessFunction: string;
  submittedBy: string | null;
  submittedByName: string;
  status: WorkshopItemStatus;
  mergedIntoId: string | null;
  sourceItemId: string | null;
  opportunityId: string | null;
  useCaseId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Workshop = {
  id: string;
  organizationId: string | null;
  workspaceId: string;
  createdBy: string;
  title: string;
  clientName: string;
  objective: string;
  businessFunctions: string[];
  startsOn: string | null;
  endsOn: string | null;
  stage: WorkshopStage;
  status: WorkshopStatus;
  agenda: Array<{ id: string; title: string; minutes?: number; notes?: string }>;
  teams: Array<{ id: string; name: string; memberNames: string[] }>;
  challengeStatements: Array<{ id: string; text: string }>;
  timeboxes: Array<{ id: string; label: string; minutes: number; stage?: string }>;
  allowAnonymous: boolean;
  votingMode: "score" | "dot";
  createdAt: string;
  updatedAt: string;
};

export type WorkshopBoard = {
  workshop: Workshop;
  participants: WorkshopParticipant[];
  items: WorkshopItem[];
  votes: VoteRecord[];
  outcome: { summary: OutcomeSummary; generatedAt: string } | null;
  /** Caller's rights, resolved server-side against RLS-visible rows. */
  viewer: { userId: string; isFacilitator: boolean; canSubmit: boolean; canVote: boolean };
};

/* ------------------------------------------------------------ outcome model */

export type OutcomeRow = {
  itemId: string;
  title: string;
  kind: WorkshopItemKind;
  businessFunction: string;
  composite: number | null;
  bucket: OutcomeBucket | null;
  voters: number;
  converted: boolean;
};

export type OutcomeSummary = {
  generatedAt: string;
  workshopTitle: string;
  clientName: string;
  objective: string;
  executiveSummary: string;
  decisionLog: Array<{ at: string; action: string; actor: string; detail: string }>;
  counts: {
    participants: number;
    painPoints: number;
    opportunities: number;
    useCases: number;
    shortlisted: number;
    converted: number;
  };
  /** Opportunity Map: demand per business function per kind. */
  map: Array<{
    businessFunction: string;
    painPoints: number;
    opportunities: number;
    useCases: number;
  }>;
  longlist: OutcomeRow[];
  shortlist: OutcomeRow[];
  quickWins: OutcomeRow[];
  strategicBets: OutcomeRow[];
  /** Functions that produced pain points but no candidate use case. */
  gaps: string[];
  roadmap: Array<{ horizon: "Now" | "Next" | "Later"; items: string[] }>;
  nextSteps: string[];
};

const UNASSIGNED = "Unassigned";

/**
 * Deterministic outcome summary built only from recorded rows. Nothing is
 * invented: unscored items simply carry a null composite and no bucket.
 */
export function buildOutcomeSummary(input: {
  workshop: Pick<Workshop, "title" | "clientName" | "objective">;
  participants: Array<Pick<WorkshopParticipant, "id">>;
  items: WorkshopItem[];
  votes: VoteRecord[];
  now?: Date;
}): OutcomeSummary {
  const { workshop, participants, items, votes } = input;
  const live = items.filter((i) => isCountable(i.status));
  const scores = scoreItems(votes);

  const toRow = (item: WorkshopItem): OutcomeRow => {
    const score = scores.get(item.id);
    return {
      itemId: item.id,
      title: item.title,
      kind: item.kind,
      businessFunction: item.businessFunction || UNASSIGNED,
      composite: score?.composite ?? null,
      bucket: classify(score),
      voters: score?.voters ?? 0,
      converted: Boolean(item.opportunityId || item.useCaseId),
    };
  };

  const candidates = live.filter((i) => i.kind === "opportunity" || i.kind === "use_case");
  const longlist = candidates
    .map(toRow)
    .sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1) || a.title.localeCompare(b.title));
  const shortlist = live
    .filter((i) => i.status === "shortlisted")
    .map(toRow)
    .sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1));

  const functions = new Map<
    string,
    { businessFunction: string; painPoints: number; opportunities: number; useCases: number }
  >();
  for (const item of live) {
    if (item.kind === "context") continue;
    const key = item.businessFunction || UNASSIGNED;
    const row = functions.get(key) ?? {
      businessFunction: key,
      painPoints: 0,
      opportunities: 0,
      useCases: 0,
    };
    if (item.kind === "pain_point") row.painPoints += 1;
    if (item.kind === "opportunity") row.opportunities += 1;
    if (item.kind === "use_case") row.useCases += 1;
    functions.set(key, row);
  }
  const map = Array.from(functions.values()).sort((a, b) =>
    a.businessFunction.localeCompare(b.businessFunction),
  );

  const gaps = map
    .filter((row) => row.painPoints > 0 && row.useCases === 0 && row.opportunities === 0)
    .map((row) => row.businessFunction);

  const ranked = shortlist.length > 0 ? shortlist : longlist.slice(0, 9);
  const roadmap: OutcomeSummary["roadmap"] = [
    { horizon: "Now", items: ranked.slice(0, 3).map((r) => r.title) },
    { horizon: "Next", items: ranked.slice(3, 6).map((r) => r.title) },
    { horizon: "Later", items: ranked.slice(6, 9).map((r) => r.title) },
  ];

  const converted = live.filter((i) => i.opportunityId || i.useCaseId).length;

  const nextSteps: string[] = [];
  if (shortlist.length === 0)
    nextSteps.push("Confirm the shortlist from the ranked longlist with the sponsor.");
  if (converted < shortlist.length)
    nextSteps.push("Convert the remaining shortlisted items into Studio drafts.");
  nextSteps.push("Assign a business owner and a baseline measure to each shortlisted item.");
  nextSteps.push("Score the shortlist in the Studio scorecard and review it in the portfolio.");
  if (gaps.length > 0) nextSteps.push(`Revisit functions with unmet demand: ${gaps.join(", ")}.`);

  const objectiveText = workshop.objective.trim() || "the stated workshop objective";
  const executiveSummary =
    `${workshop.title} convened ${participants.length} participant(s) against ${objectiveText}. ` +
    `${shortlist.length} item(s) were shortlisted and ${converted} converted to owned records.`;

  const decisionLog: OutcomeSummary["decisionLog"] = [];
  for (const item of items) {
    if (item.status === "shortlisted") {
      decisionLog.push({
        at: item.updatedAt,
        action: "shortlisted",
        actor: "Facilitator",
        detail: item.title,
      });
    }
    if (item.status === "rejected") {
      decisionLog.push({
        at: item.updatedAt,
        action: "parked",
        actor: "Facilitator",
        detail: item.title,
      });
    }
    if (item.status === "merged") {
      decisionLog.push({
        at: item.updatedAt,
        action: "merged",
        actor: "Facilitator",
        detail: item.title,
      });
    }
    if (item.opportunityId || item.useCaseId) {
      decisionLog.push({
        at: item.convertedAt ?? item.updatedAt,
        action: "converted",
        actor: "Facilitator",
        detail: item.title,
      });
    }
  }
  decisionLog.sort((a, b) => b.at.localeCompare(a.at));

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    workshopTitle: workshop.title,
    clientName: workshop.clientName,
    objective: workshop.objective,
    executiveSummary,
    decisionLog,
    counts: {
      participants: participants.length,
      painPoints: live.filter((i) => i.kind === "pain_point").length,
      opportunities: live.filter((i) => i.kind === "opportunity").length,
      useCases: live.filter((i) => i.kind === "use_case").length,
      shortlisted: shortlist.length,
      converted,
    },
    map,
    longlist,
    shortlist,
    quickWins: longlist.filter((r) => r.bucket === "quick_win"),
    strategicBets: longlist.filter((r) => r.bucket === "strategic_bet"),
    gaps,
    roadmap,
    nextSteps,
  };
}
