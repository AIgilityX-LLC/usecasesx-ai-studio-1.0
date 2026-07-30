/**
 * Default UseCasesX™ launch scorecard (v1).
 *
 * Global, versioned definition covering the seven launch dimensions. Weights,
 * scales and thresholds are configured here and nowhere else — no surface may
 * hardcode its own numbers. Workspaces may later publish their own definition;
 * this one is the fallback and the reference implementation.
 */

import type { Criterion, ScaleOption, ScorecardDefinition } from "./model";

const SCALE_MAX = 4;

function scale(labels: [string, string, string, string, string]): ScaleOption[] {
  return labels.map((label, value) => ({ value, label }));
}

const EXTENT = scale(["Not at all", "Slightly", "Partly", "Largely", "Fully"]);
const CONFIDENCE = scale(["No evidence", "Anecdotal", "Indicative", "Documented", "Validated"]);
const EXPOSURE = scale(["None", "Low", "Moderate", "High", "Severe"]);
const SPEED = scale(["12+ months", "9–12 months", "6–9 months", "3–6 months", "0–3 months"]);

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

export const DEFAULT_SCORECARD: ScorecardDefinition = {
  slug: "usecasex-launch-v1",
  name: "UseCasesX™ launch scorecard",
  description:
    "Seven-dimension prioritisation model covering business value, strategic alignment, feasibility, data readiness, time to value, organisational readiness and risk & governance.",
  version: 1,
  scaleMax: SCALE_MAX,
  riskWeighting: 0.4,
  minimumCompleteness: 0.7,
  dimensions: [
    {
      id: "business_value",
      label: "Business value",
      intent: "How much measurable value this use case creates if it succeeds.",
      weight: 25,
      criteria: [
        c(
          "value_size",
          "Size of the benefit",
          3,
          EXTENT,
          "Scale of cost, revenue, service-quality or public-value improvement.",
        ),
        c(
          "value_evidence",
          "Evidence for the benefit",
          2,
          CONFIDENCE,
          "How well the expected benefit is quantified and sourced.",
        ),
        c(
          "value_measurability",
          "Measurable KPIs",
          2,
          EXTENT,
          "Whether success can be proven with existing metrics.",
        ),
        c(
          "value_beneficiaries",
          "Breadth of beneficiaries",
          1,
          EXTENT,
          "How many teams, customers or citizens are affected.",
        ),
      ],
    },
    {
      id: "strategic_alignment",
      label: "Strategic alignment",
      intent: "How closely this supports declared strategy and sponsorship.",
      weight: 15,
      criteria: [
        c(
          "strategy_link",
          "Link to a strategic objective",
          3,
          EXTENT,
          "Maps to a named objective or strategic theme.",
        ),
        c("strategy_sponsor", "Executive sponsorship", 2, EXTENT, "A named accountable sponsor."),
        c(
          "strategy_portfolio_fit",
          "Fit with the current portfolio",
          1,
          EXTENT,
          "Complements rather than duplicates work already under way.",
        ),
      ],
    },
    {
      id: "feasibility",
      label: "Feasibility",
      intent: "Whether the solution can realistically be built and run.",
      weight: 15,
      criteria: [
        c(
          "feas_technique",
          "Maturity of the AI technique",
          3,
          EXTENT,
          "Proven approach versus research-grade novelty.",
        ),
        c(
          "feas_integration",
          "Integration effort",
          2,
          EXTENT,
          "How readily it fits existing systems and workflows.",
        ),
        c(
          "feas_capability",
          "Delivery capability available",
          2,
          EXTENT,
          "Skills and capacity in-house or via partners.",
        ),
        c("feas_cost", "Cost within reach", 1, EXTENT, "Build and run cost against likely budget."),
      ],
    },
    {
      id: "data_readiness",
      label: "Data readiness",
      intent: "Whether the data needed exists, is usable and is permitted.",
      weight: 15,
      criteria: [
        c("data_availability", "Data availability", 3, EXTENT, "The required data exists today."),
        c("data_quality", "Data quality", 2, EXTENT, "Complete, accurate and consistent enough."),
        c(
          "data_access",
          "Access and permissions",
          2,
          EXTENT,
          "Lawful basis, ownership and access route are clear.",
        ),
        c(
          "data_history",
          "Sufficient history or volume",
          1,
          EXTENT,
          "Enough depth to train, tune or ground the solution.",
        ),
      ],
    },
    {
      id: "time_to_value",
      label: "Time to value",
      intent: "How quickly a first credible result can be demonstrated.",
      weight: 10,
      criteria: [
        c("ttv_first_value", "Time to first value", 3, SPEED, "When a usable result lands."),
        c(
          "ttv_scope",
          "Scope of a viable first release",
          2,
          EXTENT,
          "A genuinely small first slice exists.",
        ),
        c(
          "ttv_dependencies",
          "External dependencies",
          1,
          EXPOSURE,
          "Procurement, vendors or other programmes standing in the way.",
          true,
        ),
      ],
    },
    {
      id: "organisational_readiness",
      label: "Organisational readiness",
      intent: "Whether the organisation can absorb and sustain the change.",
      weight: 10,
      criteria: [
        c("org_owner", "Named business owner", 2, EXTENT, "Someone owns the outcome after launch."),
        c(
          "org_process",
          "Process change is understood",
          2,
          EXTENT,
          "The affected workflow and hand-offs are mapped.",
        ),
        c(
          "org_adoption",
          "Likely user adoption",
          2,
          EXTENT,
          "Users are willing and involved in the design.",
        ),
        c(
          "org_operating_model",
          "Run and support model",
          1,
          EXTENT,
          "Who monitors, maintains and improves it.",
        ),
      ],
    },
    {
      id: "risk_governance",
      label: "Risk & governance",
      intent: "Residual exposure after the controls you can realistically apply.",
      weight: 10,
      isRiskDimension: true,
      criteria: [
        c(
          "risk_regulatory",
          "Regulatory and legal exposure",
          3,
          EXPOSURE,
          "Obligations under AI, sector or public-law regimes.",
          true,
        ),
        c(
          "risk_privacy",
          "Privacy and personal-data exposure",
          2,
          EXPOSURE,
          "Personal or special-category data involved.",
          true,
        ),
        c(
          "risk_security",
          "Security exposure",
          2,
          EXPOSURE,
          "Attack surface, sensitivity and cyber impact.",
          true,
        ),
        c(
          "risk_harm",
          "Potential harm to people",
          2,
          EXPOSURE,
          "Consequences of a wrong or unfair output.",
          true,
        ),
        c(
          "risk_controls",
          "Controls and oversight defined",
          2,
          EXTENT,
          "Human oversight, assurance and monitoring are specified.",
        ),
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
        "Strong value with manageable exposure. Move to business case and delivery planning.",
    },
    {
      id: "shortlist",
      label: "Shortlist",
      min: 60,
      tone: "caution",
      guidance: "Credible candidate. Close the weakest dimension before committing funding.",
    },
    {
      id: "refine",
      label: "Refine",
      min: 45,
      tone: "warning",
      guidance: "Promising but not decision-ready. Strengthen evidence, data or controls first.",
    },
    {
      id: "hold",
      label: "Hold",
      min: 0,
      tone: "negative",
      guidance:
        "Value is unclear or residual risk is too high. Park it and revisit when conditions change.",
    },
  ],
};

/** Every definition shipped in code, keyed by slug. */
export const BUILT_IN_SCORECARDS: Record<string, ScorecardDefinition> = {
  [DEFAULT_SCORECARD.slug]: DEFAULT_SCORECARD,
};
