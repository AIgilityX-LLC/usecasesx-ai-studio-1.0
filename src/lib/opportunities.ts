/**
 * Opportunity capture — client-safe domain model.
 *
 * An *opportunity* records the business problem BEFORE any AI solution is
 * proposed. It is workspace-owned, moves through its own lifecycle, and can be
 * converted into an AI Use Case Studio™ draft while keeping lineage.
 *
 * Types, labels and pure helpers only — no transport, no secrets.
 */

import { z } from "zod";
import { clearDraft, readDraft, writeDraft, type LocalDraft } from "./drafts";

/* ------------------------------------------------------------- lifecycle */

export const OPPORTUNITY_STATUSES = [
  "signal",
  "opportunity",
  "qualified",
  "converted",
  "deferred",
  "archived",
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const STATUS_META: Record<
  OpportunityStatus,
  { label: string; description: string; tone: "neutral" | "info" | "success" | "warning" }
> = {
  signal: {
    label: "Signal",
    description: "Something was noticed. Not yet framed as a business problem.",
    tone: "neutral",
  },
  opportunity: {
    label: "Opportunity",
    description: "The pain point, process and desired outcome are described.",
    tone: "info",
  },
  qualified: {
    label: "Qualified",
    description: "Owner, baseline and evidence make this worth designing for.",
    tone: "success",
  },
  converted: {
    label: "Converted",
    description: "A Studio use case was created from this opportunity.",
    tone: "success",
  },
  deferred: {
    label: "Deferred",
    description: "Valid, but not now. Kept for a later planning cycle.",
    tone: "warning",
  },
  archived: {
    label: "Archived",
    description: "No longer pursued. Retained for the record.",
    tone: "neutral",
  },
};

/** Transitions a user may perform directly. `converted` is set by conversion only. */
export const ALLOWED_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  signal: ["opportunity", "deferred", "archived"],
  opportunity: ["signal", "qualified", "deferred", "archived"],
  qualified: ["opportunity", "deferred", "archived"],
  converted: ["archived"],
  deferred: ["signal", "opportunity", "qualified", "archived"],
  archived: ["signal", "opportunity"],
};

/* --------------------------------------------------------------- sources */

export const OPPORTUNITY_SOURCES = ["scratch", "repository", "workshop", "referral"] as const;
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];

export const SOURCE_LABELS: Record<OpportunitySource, string> = {
  scratch: "From scratch",
  repository: "From the repository",
  workshop: "From a workshop",
  referral: "Suite / advisory referral",
};

export const URGENCIES = ["now", "next", "later", "unknown"] as const;
export type OpportunityUrgency = (typeof URGENCIES)[number];

export const URGENCY_LABELS: Record<OpportunityUrgency, string> = {
  now: "Now — this quarter",
  next: "Next — next 2 quarters",
  later: "Later — beyond 6 months",
  unknown: "Not decided yet",
};

/* ----------------------------------------------------------------- shape */

/** JSON-safe value (server functions must return serializable data). */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export type EvidenceItem = { label: string; url?: string | null; note?: string | null };

export type OpportunityDraft = {
  title: string;
  painPoint: string;
  process: string;
  processId: string | null;
  orgUnitId: string | null;
  businessFunction: string;
  strategicObjective: string;
  strategicThemeId: string | null;
  stakeholders: string[];
  /** Who feels the pain today (roles / teams / citizen groups). */
  affectedUsers: string;
  baseline: string;
  desiredOutcome: string;
  urgency: OpportunityUrgency;
  ownerName: string;
  /** Named executive or business sponsor. */
  sponsorName: string;
  /** Geographic or jurisdiction scope. */
  geography: string;
  /** Policy, budget, timing, technology or regulatory limits. */
  constraints: string;
  evidence: EvidenceItem[];
  status: OpportunityStatus;
  source: OpportunitySource;
  sourceReference: string;
};

/** Capture UX mode — same route and persistence; different disclosure. */
export const INTAKE_MODES = ["quick", "guided"] as const;
export type IntakeMode = (typeof INTAKE_MODES)[number];

export function emptyDraft(overrides: Partial<OpportunityDraft> = {}): OpportunityDraft {
  return {
    title: "",
    painPoint: "",
    process: "",
    processId: null,
    orgUnitId: null,
    businessFunction: "",
    strategicObjective: "",
    strategicThemeId: null,
    stakeholders: [],
    affectedUsers: "",
    baseline: "",
    desiredOutcome: "",
    urgency: "unknown",
    ownerName: "",
    sponsorName: "",
    geography: "",
    constraints: "",
    evidence: [],
    status: "signal",
    source: "scratch",
    sourceReference: "",
    ...overrides,
  };
}

/* ------------------------------------------------------------ validation */

const trimmed = (max: number) => z.string().trim().max(max);

export const evidenceItemSchema = z.object({
  label: trimmed(200).min(1),
  url: z.string().trim().url().max(2000).nullable().default(null),
  note: trimmed(500).nullable().default(null),
});

/** Only the title is required — everything else is progressive disclosure. */
export const opportunityDraftSchema = z.object({
  title: trimmed(200).min(3, "Give the problem a short, recognisable name."),
  painPoint: trimmed(4000).optional().default(""),
  process: trimmed(200).optional().default(""),
  processId: z.string().uuid().nullable().default(null),
  orgUnitId: z.string().uuid().nullable().default(null),
  businessFunction: trimmed(200).optional().default(""),
  strategicObjective: trimmed(1000).optional().default(""),
  strategicThemeId: z.string().uuid().nullable().default(null),
  stakeholders: z.array(trimmed(160).min(1)).max(25).optional().default([]),
  affectedUsers: trimmed(2000).optional().default(""),
  baseline: trimmed(1000).optional().default(""),
  desiredOutcome: trimmed(2000).optional().default(""),
  urgency: z.enum(URGENCIES).optional().default("unknown"),
  ownerName: trimmed(160).optional().default(""),
  sponsorName: trimmed(160).optional().default(""),
  geography: trimmed(500).optional().default(""),
  constraints: trimmed(2000).optional().default(""),
  evidence: z.array(evidenceItemSchema).max(20).optional().default([]),
  status: z.enum(OPPORTUNITY_STATUSES).optional().default("signal"),
  source: z.enum(OPPORTUNITY_SOURCES).optional().default("scratch"),
  sourceReference: trimmed(300).optional().default(""),
});

/* ------------------------------------------------------------ completion */

export type CompletionField = { key: keyof OpportunityDraft; label: string; weight: number };

/**
 * Capture quality signal. Drives the progress meter and the "ready to
 * qualify / convert" hints — never a hard gate, so capture stays fast.
 */
export const COMPLETION_FIELDS: CompletionField[] = [
  { key: "title", label: "Problem name", weight: 2 },
  { key: "painPoint", label: "Pain point", weight: 2 },
  { key: "process", label: "Current workflow", weight: 1 },
  { key: "affectedUsers", label: "Affected users", weight: 1 },
  { key: "businessFunction", label: "Organisation / function", weight: 1 },
  { key: "strategicObjective", label: "Strategic objective", weight: 1 },
  { key: "stakeholders", label: "Stakeholders", weight: 1 },
  { key: "baseline", label: "Pain baseline", weight: 2 },
  { key: "desiredOutcome", label: "Desired outcome", weight: 2 },
  { key: "urgency", label: "Urgency", weight: 1 },
  { key: "ownerName", label: "Owner", weight: 1 },
  { key: "sponsorName", label: "Sponsor", weight: 1 },
  { key: "geography", label: "Geography", weight: 1 },
  { key: "constraints", label: "Constraints", weight: 1 },
  { key: "evidence", label: "Evidence", weight: 1 },
];

/** Fields shown in quick capture; guided mode discloses the rest. */
export const QUICK_MODE_KEYS: (keyof OpportunityDraft)[] = [
  "title",
  "painPoint",
  "desiredOutcome",
  "urgency",
  "ownerName",
];

export type MissingInfoPrompt = {
  key: keyof OpportunityDraft;
  label: string;
  prompt: string;
};

const MISSING_PROMPTS: Partial<Record<keyof OpportunityDraft, string>> = {
  painPoint: "Describe what is going wrong today — without proposing a solution yet.",
  process: "Name the current workflow or process where the pain shows up.",
  affectedUsers: "Who feels this pain — roles, teams or citizen groups?",
  baseline: "What is today's baseline (volume, cycle time, cost or error rate)?",
  desiredOutcome: "What would good look like, still in business terms?",
  strategicObjective: "Which stated strategic objective does this support?",
  urgency: "Is this needed this quarter, next, later — or still undecided?",
  ownerName: "Who is accountable for the outcome?",
  sponsorName: "Who is the executive or business sponsor?",
  geography: "Where does this apply — region, country or jurisdiction?",
  constraints: "Any hard constraints: policy, budget, timing, tech or regulatory?",
  stakeholders: "Who else must be consulted or informed?",
  evidence: "Attach a link or note that backs the pain or baseline.",
};

/** Ordered missing-information prompts for the side rail (FR-02). */
export function missingInformationPrompts(draft: OpportunityDraft): MissingInfoPrompt[] {
  return COMPLETION_FIELDS.filter((f) => !hasValue(draft, f.key))
    .map((f) => ({
      key: f.key,
      label: f.label,
      prompt: MISSING_PROMPTS[f.key] ?? `Add ${f.label.toLowerCase()}.`,
    }))
    .slice(0, 6);
}

function hasValue(draft: OpportunityDraft, key: keyof OpportunityDraft): boolean {
  const value = draft[key];
  if (key === "urgency") return value !== "unknown";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value != null;
}

export function completionOf(draft: OpportunityDraft): {
  percent: number;
  missing: CompletionField[];
} {
  const total = COMPLETION_FIELDS.reduce((sum, f) => sum + f.weight, 0);
  const missing = COMPLETION_FIELDS.filter((f) => !hasValue(draft, f.key));
  const earned = total - missing.reduce((sum, f) => sum + f.weight, 0);
  return { percent: Math.round((earned / total) * 100), missing };
}

/** Minimum framing before a use case should be designed from this problem. */
export function isConvertible(draft: OpportunityDraft): boolean {
  return (
    draft.title.trim().length >= 3 &&
    draft.painPoint.trim().length > 0 &&
    draft.desiredOutcome.trim().length > 0
  );
}

/* ------------------------------------------------------- local draft keys */

/** Pre-save drafts survive a refresh even before the first server autosave. */
export const LOCAL_DRAFT_KEY = "usecasex.opportunity.draft.v1";

/** Saved opportunities get their own key so edits never collide with capture. */
export function opportunityDraftKey(id?: string | null): string {
  return id ? `usecasex.opportunity.draft.${id}` : LOCAL_DRAFT_KEY;
}

export type StoredLocalDraft = LocalDraft<OpportunityDraft>;

/** Reads a stored draft, normalising it against the current draft shape. */
export function readLocalDraft(key: string = LOCAL_DRAFT_KEY): StoredLocalDraft | null {
  const stored = readDraft<OpportunityDraft>(key);
  if (!stored || typeof stored.data?.title !== "string") return null;
  return { ...stored, data: { ...emptyDraft(), ...stored.data } };
}

export function writeLocalDraft(
  draft: OpportunityDraft,
  key: string = LOCAL_DRAFT_KEY,
  baseUpdatedAt?: string | null,
): void {
  writeDraft(key, draft, baseUpdatedAt);
}

export function clearLocalDraft(key: string = LOCAL_DRAFT_KEY): void {
  clearDraft(key);
}

/* ------------------------------------------------------------ dedup hint */

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "our",
  "are",
  "not",
  "how",
  "why",
  "too",
  "from",
  "into",
  "that",
  "this",
  "have",
  "has",
  "ai",
]);

/** Significant tokens used for the non-blocking duplicate hint. */
export function keywordsOf(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    ),
  ).slice(0, 8);
}

/**
 * Overlap score for duplicate / related-pattern suggestions.
 * Returns 0–1 plus the matched tokens used as the human-readable reason.
 */
export function similarityScore(
  query: string,
  candidate: string,
): { score: number; matched: string[] } {
  const q = keywordsOf(query);
  const c = new Set(keywordsOf(candidate));
  if (q.length === 0 || c.size === 0) return { score: 0, matched: [] };
  const matched = q.filter((w) => c.has(w));
  return { score: matched.length / q.length, matched };
}

export function formatSimilarityReason(matched: string[]): string {
  if (matched.length === 0) return "Title overlap";
  if (matched.length === 1) return `Shares keyword “${matched[0]}”`;
  return `Shares keywords: ${matched.slice(0, 4).join(", ")}`;
}

/** Server-scored related hit shown in intake (workspace or repository). */
export type SimilarHit = {
  id?: string;
  slug?: string;
  title: string;
  status?: string;
  score: number;
  reason: string;
  source: "workspace" | "repository";
};
