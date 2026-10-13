/**
 * UseCasesX™ five-pillar scorecard (V2 / FR-06).
 *
 * Desirability · Viability · Feasibility · Governability · Value.
 * Shipped alongside the launch seven-dimension card; existing results keep
 * their original model version via scorecard_slug + scorecard_version.
 */

import type { Criterion, ScaleOption, ScorecardDefinition } from "./model";

const SCALE_MAX = 4;

function scale(labels: [string, string, string, string, string]): ScaleOption[] {
  return labels.map((label, value) => ({ value, label }));
}

const EXTENT = scale(["Not at all", "Slightly", "Partly", "Largely", "Fully"]);
const CONFIDENCE = scale(["No evidence", "Anecdotal", "Indicative", "Documented", "Validated"]);
const EXPOSURE = scale(["None", "Low", "Moderate", "High", "Severe"]);

function c(
  id: string,
  label: string,
  weight: number,
  options: ScaleOption[],
  help: string,
  inverse = false,
): Criterion {
  return { id, label, weight, scale: options, help, ...(inverse ? { inverse: true } : {}) };
}

export const FIVE_PILLAR_SCORECARD: ScorecardDefinition = {
  slug: "usecasex-pillars-v2",
  name: "UseCasesX™ five-pillar scorecard",
  description:
    "FR-06 five-pillar model: Desirability, Viability, Feasibility, Governability and Value. Prioritisation bands only — never a compliance, safety or approval label.",
  version: 1,
  scaleMax: SCALE_MAX,
  riskWeighting: 0.35,
  minimumCompleteness: 0.7,
  dimensions: [
    {
      id: "desirability",
      label: "Desirability",
      intent: "Whether users and stakeholders want this outcome.",
      weight: 20,
      criteria: [
        c(
          "des_user_need",
          "Clear user or citizen need",
          3,
          EXTENT,
          "Problem is felt by a named group.",
        ),
        c(
          "des_demand",
          "Demand / willingness to adopt",
          2,
          EXTENT,
          "Signals that adoption is likely.",
        ),
        c(
          "des_experience",
          "Experience improvement",
          2,
          EXTENT,
          "Material improvement in journey quality or effort.",
        ),
      ],
    },
    {
      id: "viability",
      label: "Viability",
      intent: "Whether the organisation can sustain the case economically and operationally.",
      weight: 20,
      criteria: [
        c("via_funding", "Funding / budget path", 3, EXTENT, "A realistic funding source exists."),
        c(
          "via_sponsor",
          "Sustained sponsorship",
          2,
          EXTENT,
          "Sponsor will stay engaged past pilot.",
        ),
        c(
          "via_ops",
          "Operating model fit",
          2,
          EXTENT,
          "Teams can run and support the solution after go-live.",
        ),
      ],
    },
    {
      id: "feasibility",
      label: "Feasibility",
      intent:
        "Whether the solution can realistically be built and run with available data and skills.",
      weight: 20,
      criteria: [
        c(
          "fea_technique",
          "Technique maturity",
          3,
          EXTENT,
          "Proven approach versus research novelty.",
        ),
        c(
          "fea_data",
          "Data availability",
          3,
          CONFIDENCE,
          "Required data is obtainable and usable.",
        ),
        c(
          "fea_skills",
          "Skills and capacity",
          2,
          EXTENT,
          "Delivery capacity exists or can be hired.",
        ),
      ],
    },
    {
      id: "governability",
      label: "Governability",
      intent: "Whether residual risk, controls and oversight are manageable.",
      weight: 20,
      isRiskDimension: true,
      criteria: [
        c(
          "gov_exposure",
          "Residual risk exposure",
          3,
          EXPOSURE,
          "Overall residual risk if deployed as designed.",
          true,
        ),
        c(
          "gov_controls",
          "Controls and oversight defined",
          3,
          EXTENT,
          "Human oversight, monitoring and escalation are specified.",
        ),
        c(
          "gov_rights",
          "Data rights and privacy posture",
          2,
          EXTENT,
          "Lawful basis, residency and access controls are clear.",
        ),
      ],
    },
    {
      id: "value",
      label: "Value",
      intent: "How much measurable value this use case creates if it succeeds.",
      weight: 20,
      criteria: [
        c(
          "val_size",
          "Size of the benefit",
          3,
          EXTENT,
          "Scale of cost, revenue or public-value improvement.",
        ),
        c(
          "val_evidence",
          "Evidence for the benefit",
          2,
          CONFIDENCE,
          "Benefit is quantified and sourced.",
        ),
        c("val_kpis", "Measurable KPIs", 2, EXTENT, "Success can be proven with metrics."),
      ],
    },
  ],
  bands: [
    {
      id: "pursue",
      label: "Pursue now",
      min: 75,
      tone: "positive",
      guidance:
        "Prioritisation signal only — strong value with manageable exposure. Not a compliance, safety or approval decision.",
    },
    {
      id: "shortlist",
      label: "Shortlist",
      min: 60,
      tone: "caution",
      guidance:
        "Prioritisation signal only — credible candidate. Close weakest pillars before committing funding.",
    },
    {
      id: "refine",
      label: "Refine",
      min: 45,
      tone: "warning",
      guidance:
        "Prioritisation signal only — promising but not decision-ready. Strengthen evidence or controls first.",
    },
    {
      id: "hold",
      label: "Hold",
      min: 0,
      tone: "negative",
      guidance:
        "Prioritisation signal only — park and revisit. This band is not a rejection or safety finding.",
    },
  ],
};
