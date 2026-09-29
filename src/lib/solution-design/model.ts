/**
 * V2-08 — Solution design / agentic catalogue (client-safe).
 * Configurable OWASP GenAI prompts are informational readiness aids — never
 * legal conclusions that a use case is "safe" or "compliant".
 */

import { z } from "zod";

/* --------------------------------------------------------- solution types */

export const SOLUTION_TYPES = [
  "analytics",
  "predictive_ml",
  "generative_ai",
  "assistant_copilot",
  "rag",
  "computer_vision",
  "speech",
  "optimization",
  "automation",
  "agentic_workflow",
  "robotics",
  "hybrid",
  "undecided",
] as const;

export type SolutionType = (typeof SOLUTION_TYPES)[number];

export const SOLUTION_TYPE_LABEL: Record<SolutionType, string> = {
  analytics: "Analytics",
  predictive_ml: "Predictive ML",
  generative_ai: "Generative AI",
  assistant_copilot: "Assistant / copilot",
  rag: "RAG",
  computer_vision: "Computer vision",
  speech: "Speech",
  optimization: "Optimization",
  automation: "Automation",
  agentic_workflow: "Agentic workflow",
  robotics: "Robotics",
  hybrid: "Hybrid",
  undecided: "Not decided yet",
};

/** Types that unlock the agentic workflow section. */
export const AGENTIC_SOLUTION_TYPES: SolutionType[] = ["agentic_workflow", "hybrid", "robotics"];

export function isAgenticSolutionType(type: SolutionType | null | undefined): boolean {
  return type != null && AGENTIC_SOLUTION_TYPES.includes(type);
}

export const BUILD_BUY_PARTNER = ["build", "buy", "partner", "hybrid", "undecided"] as const;
export type BuildBuyPartner = (typeof BUILD_BUY_PARTNER)[number];

export const BUILD_BUY_LABEL: Record<BuildBuyPartner, string> = {
  build: "Build",
  buy: "Buy",
  partner: "Partner",
  hybrid: "Hybrid",
  undecided: "Not decided yet",
};

export const AUTONOMY_LEVELS = [
  "advisory_only",
  "human_in_the_loop",
  "human_on_the_loop",
  "bounded_autonomous",
  "undecided",
] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

export const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  advisory_only: "Advisory only — human decides",
  human_in_the_loop: "Human in the loop — approval before action",
  human_on_the_loop: "Human on the loop — oversight with interrupt",
  bounded_autonomous: "Bounded autonomous action",
  undecided: "Not decided yet",
};

/* ---------------------------------------------------- field confirmation */

export const FIELD_STATUSES = ["missing", "ai_draft", "confirmed"] as const;
export type FieldStatus = (typeof FIELD_STATUSES)[number];

export type FieldMetaEntry = {
  status: FieldStatus;
  note?: string | null;
  source?: string | null;
};

export type FieldMeta = Record<string, FieldMetaEntry>;

/* ------------------------------------------------------------ OWASP pack */

/**
 * Versioned, configurable OWASP GenAI / agentic risk prompts.
 * Source: OWASP GenAI / LLM Top 10 themes — readiness prompts only.
 * Never emit a legal conclusion from these responses.
 */
export const OWASP_PROMPT_PACK_VERSION = "2025.1-owasp-genai-themes";

export type OwaspPrompt = {
  id: string;
  theme: string;
  prompt: string;
  /** Explicit non-conclusion disclaimer for UI. */
  disclaimer: string;
};

export const OWASP_GENAI_PROMPTS: readonly OwaspPrompt[] = [
  {
    id: "prompt_injection",
    theme: "Prompt injection",
    prompt:
      "How could untrusted input hijack instructions, and what input trust boundaries are you defining?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
  {
    id: "sensitive_disclosure",
    theme: "Sensitive data disclosure",
    prompt:
      "What sensitive data could the system reveal, and how will outputs be filtered or redacted?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
  {
    id: "excessive_agency",
    theme: "Excessive agency",
    prompt:
      "What actions can the system take without a human, and how are those actions bounded?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
  {
    id: "supply_chain",
    theme: "Supply chain",
    prompt:
      "Which models, plugins, tools or vendors sit in the supply chain, and how are they inventoried?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
  {
    id: "insecure_output",
    theme: "Insecure output handling",
    prompt:
      "How will downstream systems treat model output as untrusted (XSS, command injection, tool args)?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
  {
    id: "poisoning",
    theme: "Data / model poisoning",
    prompt:
      "What training, retrieval or feedback paths could be poisoned, and how will integrity be checked?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
  {
    id: "denial_cost_abuse",
    theme: "Denial of service / cost abuse",
    prompt:
      "How could runaway prompts, loops or tool calls create cost or availability abuse?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
  {
    id: "unbounded_consumption",
    theme: "Unbounded consumption",
    prompt:
      "What rate limits, token budgets and recursion caps prevent unbounded resource use?",
    disclaimer: "Informational readiness prompt — not a compliance determination.",
  },
] as const;

export type OwaspResponse = {
  response: string;
  status: FieldStatus;
  reviewedAt?: string | null;
};

export type OwaspResponses = Record<string, OwaspResponse>;

/* --------------------------------------------------------------- draft */

export type SolutionDesignDraft = {
  solutionType: SolutionType | null;
  modalityNotes: string;
  modelOptions: string;
  toolOptions: string;
  vendorOptions: string;
  buildBuyPartner: BuildBuyPartner | null;
  humanRole: string;
  autonomyLevel: AutonomyLevel | null;
  agentGoal: string;
  planningMethod: string;
  toolsActions: string[];
  identitiesCredentials: string;
  memory: string;
  knowledgeSources: string;
  delegation: string;
  humanCheckpoints: string;
  actionLimits: string;
  transactionLimits: string;
  sandbox: string;
  killSwitch: string;
  observability: string;
  fallback: string;
  fieldMeta: FieldMeta;
  owaspResponses: OwaspResponses;
};

export function emptySolutionDesign(
  overrides: Partial<SolutionDesignDraft> = {},
): SolutionDesignDraft {
  return {
    solutionType: null,
    modalityNotes: "",
    modelOptions: "",
    toolOptions: "",
    vendorOptions: "",
    buildBuyPartner: null,
    humanRole: "",
    autonomyLevel: null,
    agentGoal: "",
    planningMethod: "",
    toolsActions: [],
    identitiesCredentials: "",
    memory: "",
    knowledgeSources: "",
    delegation: "",
    humanCheckpoints: "",
    actionLimits: "",
    transactionLimits: "",
    sandbox: "",
    killSwitch: "",
    observability: "",
    fallback: "",
    fieldMeta: {},
    owaspResponses: {},
    ...overrides,
  };
}

const trimmed = (max: number) => z.string().trim().max(max);

export const solutionDesignDraftSchema = z.object({
  solutionType: z.enum(SOLUTION_TYPES).nullable().default(null),
  modalityNotes: trimmed(4000).optional().default(""),
  modelOptions: trimmed(4000).optional().default(""),
  toolOptions: trimmed(4000).optional().default(""),
  vendorOptions: trimmed(4000).optional().default(""),
  buildBuyPartner: z.enum(BUILD_BUY_PARTNER).nullable().default(null),
  humanRole: trimmed(2000).optional().default(""),
  autonomyLevel: z.enum(AUTONOMY_LEVELS).nullable().default(null),
  agentGoal: trimmed(4000).optional().default(""),
  planningMethod: trimmed(2000).optional().default(""),
  toolsActions: z.array(trimmed(200).min(1)).max(40).optional().default([]),
  identitiesCredentials: trimmed(4000).optional().default(""),
  memory: trimmed(4000).optional().default(""),
  knowledgeSources: trimmed(4000).optional().default(""),
  delegation: trimmed(2000).optional().default(""),
  humanCheckpoints: trimmed(4000).optional().default(""),
  actionLimits: trimmed(4000).optional().default(""),
  transactionLimits: trimmed(2000).optional().default(""),
  sandbox: trimmed(2000).optional().default(""),
  killSwitch: trimmed(4000).optional().default(""),
  observability: trimmed(4000).optional().default(""),
  fallback: trimmed(4000).optional().default(""),
  fieldMeta: z.record(z.string(), z.object({
    status: z.enum(FIELD_STATUSES),
    note: z.string().trim().max(500).nullable().optional(),
    source: z.string().trim().max(200).nullable().optional(),
  })).optional().default({}),
  owaspResponses: z.record(z.string(), z.object({
    response: trimmed(4000),
    status: z.enum(FIELD_STATUSES),
    reviewedAt: z.string().nullable().optional(),
  })).optional().default({}),
});

/* ----------------------------------------------- pilot authorization */

export const AGENTIC_PILOT_REQUIRED_FIELDS = [
  "actionLimits",
  "humanCheckpoints",
  "killSwitch",
] as const;

export type AgenticPilotField = (typeof AGENTIC_PILOT_REQUIRED_FIELDS)[number];

export type PilotAuthorizationReadiness = {
  ready: boolean;
  isAgentic: boolean;
  blockers: Array<{ field: AgenticPilotField | "solutionType"; message: string }>;
};

function filled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function fieldConfirmed(meta: FieldMeta, key: string, value: string): boolean {
  const entry = meta[key];
  if (entry?.status === "ai_draft") return false;
  return filled(value) && (entry?.status === "confirmed" || entry == null);
}

/**
 * SRS §14.4 / FR-04: agentic use cases cannot become Pilot Authorization ready
 * until action limits, human checkpoints and kill switch are confirmed.
 */
export function pilotAuthorizationReadiness(
  draft: SolutionDesignDraft,
): PilotAuthorizationReadiness {
  const isAgentic = isAgenticSolutionType(draft.solutionType);
  if (!isAgentic) {
    return { ready: true, isAgentic: false, blockers: [] };
  }

  const blockers: PilotAuthorizationReadiness["blockers"] = [];
  const checks: Array<{ field: AgenticPilotField; label: string; value: string }> = [
    { field: "actionLimits", label: "Action limits", value: draft.actionLimits },
    { field: "humanCheckpoints", label: "Human checkpoints", value: draft.humanCheckpoints },
    { field: "killSwitch", label: "Kill switch", value: draft.killSwitch },
  ];

  for (const c of checks) {
    if (!filled(c.value)) {
      blockers.push({
        field: c.field,
        message: `${c.label} must be completed before Pilot Authorization.`,
      });
    } else if (draft.fieldMeta[c.field]?.status === "ai_draft") {
      blockers.push({
        field: c.field,
        message: `${c.label} is still an AI draft — confirm it before Pilot Authorization.`,
      });
    } else if (!fieldConfirmed(draft.fieldMeta, c.field, c.value)) {
      blockers.push({
        field: c.field,
        message: `${c.label} must be confirmed before Pilot Authorization.`,
      });
    }
  }

  return { ready: blockers.length === 0, isAgentic: true, blockers };
}

export class PilotAuthorizationBlockedError extends Error {
  readonly readiness: PilotAuthorizationReadiness;
  constructor(readiness: PilotAuthorizationReadiness) {
    super(
      readiness.blockers.map((b) => b.message).join(" ") ||
        "Agentic Pilot Authorization requirements are incomplete.",
    );
    this.name = "PilotAuthorizationBlockedError";
    this.readiness = readiness;
  }
}

export function assertPilotAuthorizationReady(draft: SolutionDesignDraft): void {
  const readiness = pilotAuthorizationReadiness(draft);
  if (!readiness.ready) throw new PilotAuthorizationBlockedError(readiness);
}

/* -------------------------------------------------------- agent card */

export type AgentCardField = {
  key: string;
  label: string;
  value: string | null;
  status: FieldStatus;
};

export type AgentCardPreview = {
  title: string;
  solutionTypeLabel: string | null;
  autonomyLabel: string | null;
  fields: AgentCardField[];
  missingCount: number;
  aiDraftCount: number;
  confirmedCount: number;
  pilot: PilotAuthorizationReadiness;
  owaspPackVersion: string;
  disclaimer: string;
};

const CARD_CORE: Array<{ key: keyof SolutionDesignDraft; label: string }> = [
  { key: "humanRole", label: "Human role" },
  { key: "modelOptions", label: "Model options" },
  { key: "toolOptions", label: "Tool options" },
  { key: "vendorOptions", label: "Vendor options" },
  { key: "buildBuyPartner", label: "Build / buy / partner" },
];

const CARD_AGENTIC: Array<{ key: keyof SolutionDesignDraft; label: string }> = [
  { key: "agentGoal", label: "Agent goal" },
  { key: "planningMethod", label: "Planning method" },
  { key: "toolsActions", label: "Tools / actions" },
  { key: "identitiesCredentials", label: "Identities / credentials" },
  { key: "memory", label: "Memory" },
  { key: "knowledgeSources", label: "Knowledge sources" },
  { key: "delegation", label: "Delegation" },
  { key: "humanCheckpoints", label: "Human checkpoints" },
  { key: "actionLimits", label: "Action limits" },
  { key: "transactionLimits", label: "Transaction limits" },
  { key: "sandbox", label: "Sandbox" },
  { key: "killSwitch", label: "Kill switch" },
  { key: "observability", label: "Observability" },
  { key: "fallback", label: "Fallback" },
];

function displayValue(draft: SolutionDesignDraft, key: keyof SolutionDesignDraft): string | null {
  const v = draft[key];
  if (v == null) return null;
  if (key === "solutionType") return SOLUTION_TYPE_LABEL[v as SolutionType];
  if (key === "buildBuyPartner") return BUILD_BUY_LABEL[v as BuildBuyPartner];
  if (key === "autonomyLevel") return AUTONOMY_LABEL[v as AutonomyLevel];
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  if (typeof v === "string") return v.trim() || null;
  return null;
}

function statusFor(
  draft: SolutionDesignDraft,
  key: string,
  value: string | null,
): FieldStatus {
  const meta = draft.fieldMeta[key];
  if (meta?.status === "ai_draft") return "ai_draft";
  if (meta?.status === "confirmed" && value) return "confirmed";
  if (!value) return "missing";
  return meta?.status ?? "confirmed";
}

/** Preview only from captured fields — never invents content. */
export function buildAgentCardPreview(
  draft: SolutionDesignDraft,
  opts: { title?: string } = {},
): AgentCardPreview {
  const agentic = isAgenticSolutionType(draft.solutionType);
  const keys = [...CARD_CORE, ...(agentic ? CARD_AGENTIC : [])];
  const fields: AgentCardField[] = keys.map(({ key, label }) => {
    const value = displayValue(draft, key);
    return {
      key: key as string,
      label,
      value,
      status: statusFor(draft, key as string, value),
    };
  });

  return {
    title: opts.title?.trim() || "AI System / Agent Card",
    solutionTypeLabel: draft.solutionType ? SOLUTION_TYPE_LABEL[draft.solutionType] : null,
    autonomyLabel: draft.autonomyLevel ? AUTONOMY_LABEL[draft.autonomyLevel] : null,
    fields,
    missingCount: fields.filter((f) => f.status === "missing").length,
    aiDraftCount: fields.filter((f) => f.status === "ai_draft").length,
    confirmedCount: fields.filter((f) => f.status === "confirmed").length,
    pilot: pilotAuthorizationReadiness(draft),
    owaspPackVersion: OWASP_PROMPT_PACK_VERSION,
    disclaimer:
      "This card summarises confirmed capture fields only. Missing and AI-drafted items are marked. It is not a safety, compliance or approval certificate.",
  };
}

export function markField(
  meta: FieldMeta,
  key: string,
  status: FieldStatus,
  extras: { note?: string | null; source?: string | null } = {},
): FieldMeta {
  return {
    ...meta,
    [key]: { status, note: extras.note ?? null, source: extras.source ?? null },
  };
}
