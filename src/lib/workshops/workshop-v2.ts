/**
 * Workshop V2 helpers — clusters, anonymity, dot voting, decision log (FR-12).
 * Pure module.
 */

import { similarity, SIMILARITY_HINT_THRESHOLD, type WorkshopItem } from "@/lib/workshops";

export type AgendaItem = {
  id: string;
  title: string;
  minutes?: number;
  notes?: string;
};

export type WorkshopTeam = {
  id: string;
  name: string;
  memberNames: string[];
};

export type ChallengeStatement = {
  id: string;
  text: string;
};

export type Timebox = {
  id: string;
  label: string;
  minutes: number;
  stage?: string;
};

export type ClusterProposalDraft = {
  proposedLabel: string;
  summary: string;
  itemIds: string[];
  reason: string;
};

/**
 * Deterministic AI-style cluster proposals from title similarity.
 * Facilitator must confirm before any merge.
 */
export function proposeClusters(
  items: Array<Pick<WorkshopItem, "id" | "title" | "status" | "kind">>,
  threshold = SIMILARITY_HINT_THRESHOLD,
): ClusterProposalDraft[] {
  const live = items.filter(
    (i) =>
      (i.kind === "pain_point" || i.kind === "opportunity" || i.kind === "use_case") &&
      i.status !== "merged" &&
      i.status !== "rejected",
  );
  const used = new Set<string>();
  const proposals: ClusterProposalDraft[] = [];

  for (let i = 0; i < live.length; i++) {
    const a = live[i]!;
    if (used.has(a.id)) continue;
    const group = [a];
    for (let j = i + 1; j < live.length; j++) {
      const b = live[j]!;
      if (used.has(b.id)) continue;
      if (similarity(a.title, b.title) >= threshold) group.push(b);
    }
    if (group.length < 2) continue;
    for (const g of group) used.add(g.id);
    const label = group[0]!.title.slice(0, 80);
    proposals.push({
      proposedLabel: label,
      summary: `Suggested merge of ${group.length} similar items.`,
      itemIds: group.map((g) => g.id),
      reason: `Title similarity ≥ ${threshold.toFixed(2)} (Jaccard on keywords).`,
    });
  }
  return proposals.slice(0, 12);
}

/** Redact submitter identity when anonymous ideation is enabled. */
export function displaySubmitterName(
  allowAnonymous: boolean,
  submittedByName: string,
  isFacilitatorView: boolean,
): string {
  if (!allowAnonymous || isFacilitatorView) return submittedByName || "Participant";
  return "Anonymous";
}

/** Dot-vote tally: count of votes with criterion `dots` (score ignored beyond presence). */
export function tallyDots(
  votes: Array<{ itemId: string; criterion: string; voterId: string }>,
): Map<string, number> {
  const byItem = new Map<string, Set<string>>();
  for (const v of votes) {
    if (v.criterion !== "dots") continue;
    const set = byItem.get(v.itemId) ?? new Set<string>();
    set.add(v.voterId);
    byItem.set(v.itemId, set);
  }
  const out = new Map<string, number>();
  for (const [itemId, voters] of byItem) out.set(itemId, voters.size);
  return out;
}

export type DecisionLogEntry = {
  at: string;
  action: string;
  actor: string;
  detail: string;
};

/**
 * Build a decision log from parked/shortlisted/merged/converted items.
 * Deterministic; no invented decisions.
 */
export function buildDecisionLog(
  items: Array<
    Pick<
      WorkshopItem,
      "title" | "status" | "convertedAt" | "opportunityId" | "useCaseId" | "updatedAt"
    >
  >,
): DecisionLogEntry[] {
  const entries: DecisionLogEntry[] = [];
  for (const item of items) {
    if (item.status === "shortlisted") {
      entries.push({
        at: item.updatedAt,
        action: "shortlisted",
        actor: "Facilitator",
        detail: item.title,
      });
    }
    if (item.status === "rejected") {
      entries.push({
        at: item.updatedAt,
        action: "parked",
        actor: "Facilitator",
        detail: item.title,
      });
    }
    if (item.status === "merged") {
      entries.push({
        at: item.updatedAt,
        action: "merged",
        actor: "Facilitator",
        detail: item.title,
      });
    }
    if (item.opportunityId || item.useCaseId) {
      entries.push({
        at: item.convertedAt ?? item.updatedAt,
        action: "converted",
        actor: "Facilitator",
        detail: item.title,
      });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

export function executiveSummarySentence(input: {
  title: string;
  participantCount: number;
  shortlistCount: number;
  convertedCount: number;
  objective: string;
}): string {
  const objective = input.objective.trim() || "the stated workshop objective";
  return (
    `${input.title} convened ${input.participantCount} participant(s) against ${objective}. ` +
    `${input.shortlistCount} item(s) were shortlisted and ${input.convertedCount} converted to owned records.`
  );
}
