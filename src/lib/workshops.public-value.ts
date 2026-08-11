/**
 * Sovereign Public Value Canvas™ — pure domain model.
 *
 * A structured public-sector companion to the workshop board: it forces a
 * legitimate public purpose, the affected groups, the measured baseline, the
 * target service standards, an honest AI-versus-simpler-option comparison,
 * human authority and redress, and where sovereignty actually sits.
 *
 * No React, no Supabase, no `import.meta`. Completeness is measured from what
 * has actually been written — nothing is inferred or scored generously.
 */

import { z } from "zod";

export const CANVAS_SECTIONS = [
  "mandate",
  "beneficiaries",
  "baseline",
  "outcomes",
  "ai_versus_alternatives",
  "authority_and_redress",
  "sovereignty",
] as const;
export type CanvasSection = (typeof CANVAS_SECTIONS)[number];

export type CanvasSectionMeta = {
  key: CanvasSection;
  label: string;
  /** Why a public-sector executive is being asked for this. */
  purpose: string;
  /** Concrete prompts shown under the field. */
  prompts: string[];
};

export const CANVAS_META: readonly CanvasSectionMeta[] = [
  {
    key: "mandate",
    label: "Service mandate and legitimate public purpose",
    purpose:
      "Name the legal or policy mandate the service operates under, and the public good it exists to deliver.",
    prompts: [
      "Which statute, regulation, policy or ministerial mandate authorises this service?",
      "What legitimate public purpose does the intervention serve?",
      "Which decisions are in scope, and which are explicitly out of scope?",
    ],
  },
  {
    key: "beneficiaries",
    label: "Beneficiaries, affected groups and inclusion needs",
    purpose:
      "Separate who benefits from who is affected, and state the access needs that must be met.",
    prompts: [
      "Who benefits directly, and who is affected without choosing to be?",
      "Which groups risk exclusion (language, disability, digital access, literacy, remoteness)?",
      "What reasonable adjustments and non-digital channels stay available?",
    ],
  },
  {
    key: "baseline",
    label: "Current problem, baseline and whole-service journey",
    purpose: "Describe today's service end to end with measured figures, not impressions.",
    prompts: [
      "What is going wrong today, and where in the journey does it happen?",
      "Baseline figures: demand, backlog, cycle time, error or appeal rates, cost per case.",
      "Which upstream and downstream steps (including offline handoffs) are part of the journey?",
    ],
  },
  {
    key: "outcomes",
    label: "Target outcomes, service standards and performance measures",
    purpose: "State the outcome you are accountable for and how it will be measured after go-live.",
    prompts: [
      "Target outcomes for citizens or the wider public, not internal throughput alone.",
      "Published service standards (e.g. decision within N days) that must hold.",
      "Measures, data source and review cadence — including a measure that would show harm.",
    ],
  },
  {
    key: "ai_versus_alternatives",
    label: "Role of AI versus simpler process, policy or technology options",
    purpose:
      "Prove AI is the proportionate option by comparing it against the cheaper alternatives.",
    prompts: [
      "What exactly would AI do — draft, classify, rank, extract, summarise, forecast?",
      "Which process fix, policy change, rules engine or integration was considered instead?",
      "Why is AI proportionate here, and what is the fallback if it underperforms?",
    ],
  },
  {
    key: "authority_and_redress",
    label: "Human authority, transparency, contestability and redress",
    purpose:
      "Keep a named human accountable for the decision and give people a real route to challenge it.",
    prompts: [
      "Who takes the decision, and what can they override or refuse?",
      "What is disclosed to the person affected about the use of AI?",
      "How is a decision contested, how is it reviewed, and what redress exists?",
    ],
  },
  {
    key: "sovereignty",
    label: "Data, infrastructure, vendor, jurisdiction and capability sovereignty",
    purpose: "Record where data, compute, vendors and skills actually sit, and the exit route.",
    prompts: [
      "Data classification, residency and cross-border flows.",
      "Hosting and model location; vendor concentration and lock-in exposure.",
      "In-house capability to operate and audit it, plus the exit or substitution plan.",
    ],
  },
];

export const CANVAS_SECTION_LABEL: Record<CanvasSection, string> = CANVAS_META.reduce(
  (acc, meta) => ({ ...acc, [meta.key]: meta.label }),
  {} as Record<CanvasSection, string>,
);

/** A section's answer plus its explicit confidence in the evidence behind it. */
export const CANVAS_CONFIDENCE = ["unknown", "assumed", "evidenced"] as const;
export type CanvasConfidence = (typeof CANVAS_CONFIDENCE)[number];

export const CANVAS_CONFIDENCE_LABEL: Record<CanvasConfidence, string> = {
  unknown: "Not yet known",
  assumed: "Assumption",
  evidenced: "Evidenced",
};

export const canvasEntrySchema = z.object({
  text: z.string().trim().max(4000).default(""),
  confidence: z.enum(CANVAS_CONFIDENCE).default("unknown"),
});
export type CanvasEntry = z.infer<typeof canvasEntrySchema>;

export const canvasSectionsSchema = z.object(
  CANVAS_SECTIONS.reduce(
    (acc, key) => ({
      ...acc,
      [key]: canvasEntrySchema.default({ text: "", confidence: "unknown" }),
    }),
    {} as Record<CanvasSection, typeof canvasEntrySchema>,
  ),
);
export type CanvasSections = Record<CanvasSection, CanvasEntry>;

export const publicValueCanvasInputSchema = z.object({
  workshopId: z.string().uuid(),
  sections: canvasSectionsSchema,
});

export type PublicValueCanvas = {
  workshopId: string;
  sections: CanvasSections;
  completeness: number;
  updatedBy: string | null;
  updatedAt: string | null;
};

export function emptyCanvasSections(): CanvasSections {
  return CANVAS_SECTIONS.reduce(
    (acc, key) => ({ ...acc, [key]: { text: "", confidence: "unknown" as CanvasConfidence } }),
    {} as CanvasSections,
  );
}

/** Accepts anything stored and returns a complete, safe canvas shape. */
export function normalizeCanvasSections(value: unknown): CanvasSections {
  const raw = (value ?? {}) as Record<string, unknown>;
  return CANVAS_SECTIONS.reduce((acc, key) => {
    const entry = (raw[key] ?? {}) as Record<string, unknown>;
    const text = typeof entry.text === "string" ? entry.text.slice(0, 4000) : "";
    const confidence = CANVAS_CONFIDENCE.includes(entry.confidence as CanvasConfidence)
      ? (entry.confidence as CanvasConfidence)
      : "unknown";
    return { ...acc, [key]: { text, confidence } };
  }, {} as CanvasSections);
}

/** A section counts as answered only with a substantive answer (≥ 40 chars). */
export const MIN_ANSWER_LENGTH = 40;

export function isSectionAnswered(entry: CanvasEntry | undefined): boolean {
  return (entry?.text ?? "").trim().length >= MIN_ANSWER_LENGTH;
}

/** Percentage of sections with a substantive answer, rounded down. */
export function canvasCompleteness(sections: CanvasSections): number {
  const answered = CANVAS_SECTIONS.filter((key) => isSectionAnswered(sections[key])).length;
  return Math.floor((answered / CANVAS_SECTIONS.length) * 100);
}

export type CanvasReadiness = {
  completeness: number;
  answered: number;
  total: number;
  /** Sections still empty or too thin to review. */
  missing: CanvasSection[];
  /** Answered sections that are still explicit assumptions. */
  assumptions: CanvasSection[];
  /** Sections whose evidence is recorded as unknown. */
  unknowns: CanvasSection[];
  /** True only when every section is answered and none is left unknown. */
  reviewReady: boolean;
  headline: string;
};

export function assessCanvas(sections: CanvasSections): CanvasReadiness {
  const missing = CANVAS_SECTIONS.filter((key) => !isSectionAnswered(sections[key]));
  const answered = CANVAS_SECTIONS.length - missing.length;
  const assumptions = CANVAS_SECTIONS.filter(
    (key) => isSectionAnswered(sections[key]) && sections[key].confidence === "assumed",
  );
  const unknowns = CANVAS_SECTIONS.filter(
    (key) => isSectionAnswered(sections[key]) && sections[key].confidence === "unknown",
  );
  const reviewReady = missing.length === 0 && unknowns.length === 0;
  return {
    completeness: canvasCompleteness(sections),
    answered,
    total: CANVAS_SECTIONS.length,
    missing,
    assumptions,
    unknowns,
    reviewReady,
    headline: reviewReady
      ? assumptions.length > 0
        ? `Ready for review with ${assumptions.length} recorded assumption(s)`
        : "Ready for review — every section is evidenced"
      : missing.length > 0
        ? `${missing.length} of ${CANVAS_SECTIONS.length} section(s) still need an answer`
        : `${unknowns.length} answered section(s) have no evidence recorded`,
  };
}

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function canvasToCsv(sections: CanvasSections): string {
  const header = ["Section", "Purpose", "Answer", "Evidence"];
  const body = CANVAS_META.map((meta) => [
    meta.label,
    meta.purpose,
    sections[meta.key]?.text ?? "",
    CANVAS_CONFIDENCE_LABEL[sections[meta.key]?.confidence ?? "unknown"],
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Shareable Markdown for the public-sector business case pack. */
export function canvasToMarkdown(input: {
  workshopTitle: string;
  organisation?: string;
  generatedAt: string;
  sections: CanvasSections;
}): string {
  const readiness = assessCanvas(input.sections);
  const lines: string[] = [
    `# Sovereign Public Value Canvas — ${input.workshopTitle}`,
    ``,
    input.organisation ? `Organisation: ${input.organisation}` : `Organisation: not recorded`,
    `Generated ${input.generatedAt}`,
    ``,
    `**${readiness.headline}** — ${readiness.answered}/${readiness.total} sections answered (${readiness.completeness}%).`,
    ``,
  ];
  for (const meta of CANVAS_META) {
    const entry = input.sections[meta.key];
    lines.push(
      `## ${meta.label}`,
      ``,
      `_${meta.purpose}_`,
      ``,
      `Evidence: ${CANVAS_CONFIDENCE_LABEL[entry?.confidence ?? "unknown"]}`,
      ``,
      (entry?.text ?? "").trim() || `Not yet recorded.`,
      ``,
    );
  }
  return lines.join("\n");
}
