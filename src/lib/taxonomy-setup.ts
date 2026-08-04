/**
 * Taxonomy setup checklist — pure, client-safe model.
 *
 * A single honest definition of "is this workspace classified well enough to
 * read the Opportunity Map?". Every step reflects real counts; nothing is
 * simulated and no step claims Enterprise capability.
 */

export type ChecklistStepKey =
  | "orgUnits"
  | "strategicThemes"
  | "valueThemes"
  | "processes"
  | "opportunities"
  | "classified";

export type ChecklistStep = {
  key: ChecklistStepKey;
  label: string;
  description: string;
  done: boolean;
  optional: boolean;
  /** Route to the surface where the step is completed. */
  to: string;
  actionLabel: string;
  /** Human readable current state, e.g. "3 units". */
  detail: string;
};

export type TaxonomySetupCounts = {
  orgUnits: number;
  strategicThemes: number;
  valueThemes: number;
  processes: number;
  /** Captured opportunity records visible to the caller. */
  opportunities: number;
  /** Records that carry both an organizational dimension and a value theme. */
  classifiedOpportunities: number;
};

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

export function buildTaxonomyChecklist(counts: TaxonomySetupCounts): ChecklistStep[] {
  return [
    {
      key: "orgUnits",
      label: "Add organization units",
      description: "Departments, teams or programs opportunities are mapped to.",
      done: counts.orgUnits > 0,
      optional: false,
      to: "/account/organization",
      actionLabel: "Add units",
      detail: plural(counts.orgUnits, "unit"),
    },
    {
      key: "strategicThemes",
      label: "Define strategic themes",
      description: "The strategy pillars an opportunity supports.",
      done: counts.strategicThemes > 0,
      optional: false,
      to: "/account/organization",
      actionLabel: "Add themes",
      detail: plural(counts.strategicThemes, "theme"),
    },
    {
      key: "valueThemes",
      label: "Define value themes",
      description: "Where the value shows up: cost, revenue, risk, experience.",
      done: counts.valueThemes > 0,
      optional: false,
      to: "/account/organization",
      actionLabel: "Add value themes",
      detail: plural(counts.valueThemes, "theme"),
    },
    {
      key: "processes",
      label: "Add processes",
      description: "Optional, but sharpens later feasibility and scoring work.",
      done: counts.processes > 0,
      optional: true,
      to: "/account/organization",
      actionLabel: "Add processes",
      detail: plural(counts.processes, "process", "processes"),
    },
    {
      key: "opportunities",
      label: "Capture opportunities",
      description: "The map plots real captured records only.",
      done: counts.opportunities > 0,
      optional: false,
      to: "/opportunities/new",
      actionLabel: "Capture one",
      detail: plural(counts.opportunities, "record"),
    },
    {
      key: "classified",
      label: "Classify captured opportunities",
      description: "Each record needs an organizational dimension and a strategic theme.",
      done: counts.opportunities > 0 && counts.classifiedOpportunities > 0,
      optional: false,
      to: "/opportunities",
      actionLabel: "Classify",
      detail: `${counts.classifiedOpportunities} of ${counts.opportunities} classified`,
    },
  ];
}

export type ChecklistProgress = {
  requiredTotal: number;
  requiredDone: number;
  percent: number;
  complete: boolean;
};

export function checklistProgress(steps: ChecklistStep[]): ChecklistProgress {
  const required = steps.filter((step) => !step.optional);
  const done = required.filter((step) => step.done).length;
  return {
    requiredTotal: required.length,
    requiredDone: done,
    percent: required.length === 0 ? 100 : Math.round((done / required.length) * 100),
    complete: done === required.length,
  };
}
