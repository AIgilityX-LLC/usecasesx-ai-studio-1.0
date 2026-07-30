/**
 * AI Use Case Studio™ — guided design wizard (client-safe model).
 *
 * Converts a captured opportunity (or a repository case / blank draft) into a
 * structured, business-ready AI use case across nine steps. This module holds
 * the step definitions, field metadata, validation and progress maths only —
 * no transport, no secrets. The server functions in
 * `studio-wizard.functions.ts` own persistence, lineage and versioning.
 */

import { z } from "zod";

/* ----------------------------------------------------------------- fields */

export type FieldKind = "text" | "textarea" | "list" | "select";

export type WizardField = {
  key: string;
  label: string;
  kind: FieldKind;
  /** Essential fields are always visible; advanced ones sit behind disclosure. */
  advanced?: boolean;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string[];
  /** Minimum entries for list fields when required. */
  minItems?: number;
};

export type WizardStep = {
  id: string;
  title: string;
  intent: string;
  fields: WizardField[];
};

const AI_TYPES = [
  "Predictive analytics",
  "Classification",
  "Forecasting",
  "Computer vision",
  "Natural language processing",
  "Generative AI",
  "Recommendation",
  "Optimisation",
  "Agentic automation",
  "Not decided yet",
];

const LEVELS = ["Low", "Medium", "High"];
const TIME_TO_VALUE = ["0–3 months", "3–6 months", "6–12 months", "12+ months"];
const RECOMMENDATIONS = [
  "Proceed to pilot",
  "Proceed to business case",
  "Refine and re-review",
  "Park for a later cycle",
  "Do not pursue",
];

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "opportunity",
    title: "Opportunity",
    intent: "Name the business problem this use case answers.",
    fields: [
      {
        key: "title",
        label: "Use case name",
        kind: "text",
        required: true,
        placeholder: "Short, recognisable name",
      },
      {
        key: "problemStatement",
        label: "Problem statement",
        kind: "textarea",
        required: true,
        help: "What is going wrong today, for whom, and why it matters.",
      },
      {
        key: "triggerContext",
        label: "Why now",
        kind: "textarea",
        advanced: true,
        help: "The event, deadline or pressure that makes this worth solving now.",
      },
    ],
  },
  {
    id: "businessContext",
    title: "Business context",
    intent: "Anchor the problem in the organisation and its strategy.",
    fields: [
      {
        key: "businessFunction",
        label: "Business function or unit",
        kind: "text",
        required: true,
        placeholder: "e.g. Claims Operations",
      },
      {
        key: "currentState",
        label: "How it works today",
        kind: "textarea",
        required: true,
        help: "The current process and its measurable baseline.",
      },
      { key: "strategicObjective", label: "Strategic objective", kind: "textarea" },
      { key: "processScope", label: "Processes in scope", kind: "list", advanced: true },
      {
        key: "geographyScope",
        label: "Geography / entities in scope",
        kind: "text",
        advanced: true,
      },
    ],
  },
  {
    id: "solution",
    title: "Proposed solution",
    intent: "Describe the AI-enabled future state.",
    fields: [
      {
        key: "proposedSolution",
        label: "Solution concept",
        kind: "textarea",
        required: true,
        help: "What the AI does, where it sits in the process, and who acts on it.",
      },
      { key: "aiType", label: "AI capability type", kind: "select", options: AI_TYPES },
      { key: "futureState", label: "Future state", kind: "textarea" },
      { key: "mvpScope", label: "MVP scope", kind: "textarea", advanced: true },
      {
        key: "minimumViablePrediction",
        label: "Minimum viable prediction",
        kind: "text",
        advanced: true,
        help: "The single decision the first version must support.",
      },
    ],
  },
  {
    id: "dataTechnology",
    title: "Data & technology",
    intent: "State what the solution needs to run.",
    fields: [
      {
        key: "dataSources",
        label: "Data sources",
        kind: "list",
        required: true,
        minItems: 1,
        help: "Systems or datasets the model or workflow depends on.",
      },
      { key: "dataQualityNotes", label: "Known data gaps or quality issues", kind: "textarea" },
      { key: "systems", label: "Systems to integrate", kind: "list", advanced: true },
      { key: "hostingModel", label: "Hosting / deployment model", kind: "text", advanced: true },
    ],
  },
  {
    id: "stakeholders",
    title: "Stakeholders & operating model",
    intent: "Name who owns, uses and runs the outcome.",
    fields: [
      {
        key: "stakeholders",
        label: "Stakeholders",
        kind: "list",
        required: true,
        minItems: 1,
        placeholder: "Role or name",
      },
      { key: "ownerName", label: "Business owner", kind: "text", required: true },
      { key: "beneficiaries", label: "Who benefits", kind: "text" },
      { key: "operatingModel", label: "Who runs it once live", kind: "textarea", advanced: true },
      { key: "changeImpact", label: "Change impact", kind: "textarea", advanced: true },
    ],
  },
  {
    id: "value",
    title: "Value & KPIs",
    intent: "Make the expected value measurable.",
    fields: [
      {
        key: "expectedBenefits",
        label: "Expected benefits",
        kind: "list",
        required: true,
        minItems: 1,
      },
      {
        key: "kpis",
        label: "KPIs",
        kind: "list",
        required: true,
        minItems: 1,
        help: "Measures that will show whether this worked.",
      },
      { key: "valuePotential", label: "Value potential", kind: "select", options: LEVELS },
      { key: "valueAssumptions", label: "Value assumptions", kind: "textarea", advanced: true },
    ],
  },
  {
    id: "feasibility",
    title: "Feasibility & delivery",
    intent: "Be honest about effort and sequencing.",
    fields: [
      {
        key: "complexity",
        label: "Delivery complexity",
        kind: "select",
        options: LEVELS,
        required: true,
      },
      {
        key: "timeToValue",
        label: "Time to value",
        kind: "select",
        options: TIME_TO_VALUE,
        required: true,
      },
      { key: "deliveryApproach", label: "Delivery approach", kind: "textarea" },
      { key: "dependencies", label: "Dependencies", kind: "list", advanced: true },
      { key: "effortEstimate", label: "Indicative effort", kind: "text", advanced: true },
    ],
  },
  {
    id: "risk",
    title: "Risk & governance",
    intent: "Surface the risks before anyone commits budget.",
    fields: [
      {
        key: "riskLevel",
        label: "Overall risk level",
        kind: "select",
        options: LEVELS,
        required: true,
      },
      { key: "risks", label: "Key risks", kind: "list", required: true, minItems: 1 },
      { key: "controls", label: "Controls / mitigations", kind: "list" },
      { key: "governanceNotes", label: "Governance notes", kind: "textarea", advanced: true },
      {
        key: "privacyNotes",
        label: "Privacy / data protection notes",
        kind: "textarea",
        advanced: true,
      },
    ],
  },
  {
    id: "recommendation",
    title: "Recommendation & next action",
    intent: "Close with a decision someone can act on.",
    fields: [
      {
        key: "recommendation",
        label: "Recommendation",
        kind: "select",
        options: RECOMMENDATIONS,
        required: true,
      },
      { key: "nextAction", label: "Next action", kind: "textarea", required: true },
      { key: "decisionOwner", label: "Decision owner", kind: "text", advanced: true },
      { key: "reviewBy", label: "Review by", kind: "text", advanced: true },
    ],
  },
];

export const STEP_IDS = WIZARD_STEPS.map((s) => s.id);
export type WizardStepId = (typeof STEP_IDS)[number];

export function stepById(id: string): WizardStep | undefined {
  return WIZARD_STEPS.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ state */

export type FieldValue = string | string[];
export type StepValues = Record<string, FieldValue>;
/** `wizard_state` shape: one bag of values per step id. */
export type WizardState = Record<string, StepValues>;

export const wizardStepValuesSchema = z.record(
  z.string(),
  z.union([z.string().max(8000), z.array(z.string().max(600)).max(40)]),
);

export const wizardStateSchema = z.record(z.string(), wizardStepValuesSchema);

export function valuesFor(state: WizardState, stepId: string): StepValues {
  return state?.[stepId] ?? {};
}

export function readField(state: WizardState, stepId: string, key: string): FieldValue {
  const raw = valuesFor(state, stepId)[key];
  if (Array.isArray(raw)) return raw;
  return typeof raw === "string" ? raw : "";
}

/* ------------------------------------------------------------- validation */

export type FieldIssue = { stepId: string; key: string; label: string; message: string };

function isEmpty(field: WizardField, value: FieldValue | undefined): boolean {
  if (field.kind === "list") {
    const arr = Array.isArray(value) ? value.filter((v) => v.trim().length > 0) : [];
    return arr.length < (field.minItems ?? 1);
  }
  return typeof value !== "string" || value.trim().length === 0;
}

/** Issues for a single step. Empty array means the step is complete. */
export function validateStep(state: WizardState, stepId: string): FieldIssue[] {
  const step = stepById(stepId);
  if (!step) return [];
  const values = valuesFor(state, stepId);
  return step.fields
    .filter((f) => f.required && isEmpty(f, values[f.key]))
    .map((f) => ({
      stepId,
      key: f.key,
      label: f.label,
      message:
        f.kind === "list"
          ? `Add at least ${f.minItems ?? 1} entry for "${f.label}".`
          : `"${f.label}" is required before this use case can be completed.`,
    }));
}

export function validateAll(state: WizardState): FieldIssue[] {
  return WIZARD_STEPS.flatMap((s) => validateStep(state, s.id));
}

export function isStepComplete(state: WizardState, stepId: string): boolean {
  return validateStep(state, stepId).length === 0;
}

/** Percentage of steps whose required fields are answered. */
export function progressOf(state: WizardState): number {
  const done = WIZARD_STEPS.filter((s) => isStepComplete(state, s.id)).length;
  return Math.round((done / WIZARD_STEPS.length) * 100);
}

/* ------------------------------------------------------------- lifecycle */

export const USE_CASE_VISIBILITIES = ["private", "workspace", "organization"] as const;
export type UseCaseVisibility = (typeof USE_CASE_VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<UseCaseVisibility, string> = {
  private: "Private — only me",
  workspace: "Workspace — my team",
  organization: "Organisation — all workspaces",
};

/** Draft lifecycle used by the wizard. `defined` is set on completion. */
export const WIZARD_STATUSES = ["idea", "in_design", "defined", "archived"] as const;
export type WizardStatus = (typeof WIZARD_STATUSES)[number];

export const STATUS_LABELS: Record<WizardStatus, string> = {
  idea: "Idea",
  in_design: "In design",
  defined: "Defined",
  archived: "Archived",
};

/* -------------------------------------------------------- AI assist plumbing */

/** Steps the contextual assistant can propose content for, and the target keys. */
export const ASSISTABLE_STEPS: Record<string, string[]> = {
  solution: ["proposedSolution"],
  dataTechnology: ["dataSources"],
  value: ["kpis", "expectedBenefits"],
  risk: ["risks", "controls"],
};

export function isAssistable(stepId: string): boolean {
  return stepId in ASSISTABLE_STEPS;
}
