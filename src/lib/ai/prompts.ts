/**
 * Prompt registry — the single source of truth for every AI instruction the
 * product sends. Prompts are versioned so usage records stay attributable to
 * the exact instruction that produced an output.
 */

import type { ModelTier } from "./models";

export const AI_TASKS = [
  "enrichOpportunity",
  "draftUseCase",
  "recommendCapabilities",
  "explainScore",
  "suggestScoreEvidence",
  "findSimilarUseCases",
  "generateExecutiveSummary",
] as const;

export type AiTask = (typeof AI_TASKS)[number];

export type PromptDefinition = {
  task: AiTask;
  version: string;
  /** Default capability tier when the caller does not pick an alias. */
  tier: ModelTier;
  /** Wall-clock budget for the whole gateway call. */
  timeoutMs: number;
  /** Retries for transient (429 / 5xx / network) failures only. */
  retries: number;
  system: string;
};

const HOUSE_STYLE = [
  "You are AIgilityX UseCasesX™ — an enterprise AI opportunity and value-design assistant.",
  "Be specific to the organisation, industry and evidence supplied. Never invent metrics, customers, vendors or savings figures.",
  "When evidence is missing, say so plainly instead of guessing.",
  "Always answer by calling the supplied tool with structured fields. Never return free-form prose.",
].join(" ");

export const PROMPT_REGISTRY: Record<AiTask, PromptDefinition> = {
  enrichOpportunity: {
    task: "enrichOpportunity",
    version: "2026-07-28.1",
    tier: "balanced",
    timeoutMs: 45_000,
    retries: 1,
    system: [
      HOUSE_STYLE,
      "Task: enrich a captured AI opportunity. Sharpen the problem statement, name the data and capabilities implied, and propose measurable KPIs.",
      "Return suggestions only. Do not rewrite the author's wording beyond the fields you are asked to produce.",
    ].join(" "),
  },
  draftUseCase: {
    task: "draftUseCase",
    version: "2026-07-28.1",
    tier: "balanced",
    timeoutMs: 60_000,
    retries: 1,
    system: [
      HOUSE_STYLE,
      "Task: given an organisation context and objective, produce ONE concrete, organisation-specific AI use case draft.",
      "Avoid generic platitudes. Use realistic, measurable KPIs.",
    ].join(" "),
  },
  recommendCapabilities: {
    task: "recommendCapabilities",
    version: "2026-07-28.1",
    tier: "fast",
    timeoutMs: 30_000,
    retries: 1,
    system: [
      HOUSE_STYLE,
      "Task: recommend the AI capabilities and data foundations a described use case requires, each with a short rationale and a confidence rating.",
    ].join(" "),
  },
  explainScore: {
    task: "explainScore",
    version: "2026-07-28.1",
    tier: "fast",
    timeoutMs: 30_000,
    retries: 1,
    system: [
      HOUSE_STYLE,
      "Task: explain a prioritisation score in executive language. Reference only the dimension values supplied.",
      "Identify the strongest and weakest dimensions and what would move the score.",
    ].join(" "),
  },
  suggestScoreEvidence: {
    task: "suggestScoreEvidence",
    version: "2026-07-30.1",
    tier: "balanced",
    timeoutMs: 45_000,
    retries: 1,
    system: [
      HOUSE_STYLE,
      "Task: for each scoring criterion supplied, propose the specific EVIDENCE a reviewer should gather before answering it, and draft a short justification they can edit.",
      "You are strictly forbidden from proposing, implying or estimating a numeric score, rating or answer value. Scores are calculated deterministically elsewhere from human answers.",
      "Ground every suggestion in the supplied use-case context. Where the context does not support a criterion, say what is missing and ask for it instead of inventing evidence.",
      "Prefer named artefacts a real organisation would hold: baseline metrics, system inventories, data dictionaries, policy documents, owner sign-off, prior pilots.",
    ].join(" "),
  },
  findSimilarUseCases: {
    task: "findSimilarUseCases",
    version: "2026-07-28.1",
    tier: "fast",
    timeoutMs: 30_000,
    retries: 1,
    system: [
      HOUSE_STYLE,
      "Task: from the supplied candidate list ONLY, select the use cases most similar to the reference.",
      "Never invent a candidate that is not in the list. Return the candidate slugs verbatim.",
    ].join(" "),
  },
  generateExecutiveSummary: {
    task: "generateExecutiveSummary",
    version: "2026-07-28.1",
    tier: "deep",
    timeoutMs: 60_000,
    retries: 1,
    system: [
      HOUSE_STYLE,
      "Task: write a board-ready executive summary of an AI portfolio from the supplied figures.",
      "Use only the numbers provided. Be concise, evidence-oriented and free of hype.",
    ].join(" "),
  },
};

export function promptFor(task: AiTask): PromptDefinition {
  return PROMPT_REGISTRY[task];
}
