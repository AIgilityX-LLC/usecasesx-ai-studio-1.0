/**
 * FR-10 implementation brief — versioned delivery handoff artifact.
 * Pure module: no React, no Supabase.
 */

import { z } from "zod";

export const BRIEF_STATUSES = ["draft", "published"] as const;
export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export const BRIEF_FIELD_KEYS = [
  "outcomes",
  "scope",
  "assumptions",
  "architecture",
  "dataNeeds",
  "humanControls",
  "measures",
  "acceptanceCriteria",
] as const;
export type BriefFieldKey = (typeof BRIEF_FIELD_KEYS)[number];

export const BRIEF_FIELD_LABEL: Record<BriefFieldKey, string> = {
  outcomes: "Outcomes",
  scope: "Scope",
  assumptions: "Assumptions",
  architecture: "Architecture considerations",
  dataNeeds: "Data needs",
  humanControls: "Human controls",
  measures: "Measures",
  acceptanceCriteria: "Acceptance criteria",
};

export type HandoffLink = { label: string; url: string };

export type ImplementationBriefDraft = {
  title: string;
  outcomes: string;
  scope: string;
  assumptions: string;
  architecture: string;
  dataNeeds: string;
  humanControls: string;
  measures: string;
  acceptanceCriteria: string;
  handoffLinks: HandoffLink[];
  recordVersion?: string | null;
  scoringVersion?: string | null;
};

export type ImplementationBrief = ImplementationBriefDraft & {
  id: string;
  useCaseId: string;
  portfolioId: string | null;
  workspaceId: string;
  version: number;
  status: BriefStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function emptyBriefDraft(title = "Implementation brief"): ImplementationBriefDraft {
  return {
    title,
    outcomes: "",
    scope: "",
    assumptions: "",
    architecture: "",
    dataNeeds: "",
    humanControls: "",
    measures: "",
    acceptanceCriteria: "",
    handoffLinks: [],
    recordVersion: null,
    scoringVersion: null,
  };
}

const handoffLinkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2000),
});

export const briefDraftSchema = z.object({
  title: z.string().trim().min(3).max(200),
  outcomes: z.string().trim().max(8000),
  scope: z.string().trim().max(8000),
  assumptions: z.string().trim().max(8000),
  architecture: z.string().trim().max(8000),
  dataNeeds: z.string().trim().max(8000),
  humanControls: z.string().trim().max(8000),
  measures: z.string().trim().max(8000),
  acceptanceCriteria: z.string().trim().max(8000),
  handoffLinks: z.array(handoffLinkSchema).max(20).default([]),
  recordVersion: z.string().trim().max(80).nullish(),
  scoringVersion: z.string().trim().max(80).nullish(),
});

/** Completeness for UI — never blocks save of drafts. */
export function briefCompleteness(draft: ImplementationBriefDraft): {
  filled: number;
  total: number;
  missing: BriefFieldKey[];
} {
  const missing: BriefFieldKey[] = [];
  for (const key of BRIEF_FIELD_KEYS) {
    if (!draft[key]?.trim()) missing.push(key);
  }
  return {
    filled: BRIEF_FIELD_KEYS.length - missing.length,
    total: BRIEF_FIELD_KEYS.length,
    missing,
  };
}

export const ROADMAP_STATUSES = [
  "planned",
  "in_progress",
  "blocked",
  "at_risk",
  "complete",
  "deferred",
] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  blocked: "Blocked",
  at_risk: "At risk",
  complete: "Complete",
  deferred: "Deferred",
};
