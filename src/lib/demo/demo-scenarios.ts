/**
 * Demonstration scenario library.
 *
 * Fictional, clearly labelled content used for guided demonstrations and for
 * "copy a sample into my workspace". These are NOT client case studies and no
 * real personal, client or commercial data is used. Every organisation,
 * person and number below is invented for illustration.
 *
 * Shared by:
 *  - `demo-scenarios.server.ts` (seeds the labelled template workspaces)
 *  - `_app.demo-scenarios.tsx` (browse + sample copy UI)
 */

export const DEMO_DISCLAIMER =
  "Illustrative demonstration content. Fictional organisations and figures — not a real client case study.";

export const DEMO_TEMPLATE_VERSION = "v1";

export type DemoScenarioKey =
  | "diversified-group"
  | "financial-services"
  | "manufacturing"
  | "sme-professional-services";

export interface DemoOpportunitySpec {
  title: string;
  pain_point: string;
  desired_outcome: string;
  business_function: string;
  strategic_objective: string;
  urgency: "now" | "next" | "later" | "unknown";
  status: "signal" | "opportunity" | "qualified" | "converted" | "deferred";
}

export interface DemoBenefitSpec {
  name: string;
  kpi: string;
  category:
    | "cost_reduction"
    | "revenue_growth"
    | "productivity"
    | "risk_reduction"
    | "quality"
    | "customer_experience"
    | "compliance"
    | "sustainability";
  unit_type: "currency" | "hours" | "fte" | "percent" | "count";
  currency: string | null;
  period: "one_off" | "monthly" | "quarterly" | "annual";
  baseline_value: number;
  target_value: number;
  expected_value: number;
  confidence: "low" | "medium" | "high";
  benefit_owner: string;
  measurement_frequency: "monthly" | "quarterly" | "biannual" | "annual" | "ad_hoc";
  evidence_source: string;
  state: "proposed" | "approved" | "delivered" | "verified" | "sustained";
}

export interface DemoScoreSpec {
  value: number;
  feasibility: number;
  readiness: number;
  risk: number;
  strategic: number;
  ttv: number;
}

export interface DemoUseCaseSpec {
  title: string;
  problem_statement: string;
  ai_type: string;
  status: string;
  score: DemoScoreSpec;
  benefits: DemoBenefitSpec[];
  portfolio: {
    decision: "under_review" | "shortlisted" | "approved" | "deferred" | "rejected" | "delivered";
    funding_state: "unfunded" | "requested" | "funded" | "on_hold";
    delivery_stage: "now" | "next" | "later" | "unscheduled";
    target_period: string;
    milestone: string;
    planned_start_date: string;
    planned_end_date: string;
    delivery_owner: string;
  };
}

export interface DemoStoryStep {
  title: string;
  detail: string;
  to: string;
}

export interface DemoScenario {
  key: DemoScenarioKey;
  label: string;
  archetype: string;
  summary: string;
  organization: { name: string; industry: string; type: string; country: string };
  workspace: string;
  board: string;
  portfolio: { name: string; objective: string; targetQuarter: string };
  opportunities: DemoOpportunitySpec[];
  useCases: DemoUseCaseSpec[];
  report: { title: string; kind: string };
  /** One complete guided story per scenario, in journey order. */
  story: DemoStoryStep[];
}

const totalOf = (s: DemoScoreSpec) =>
  Math.round(
    ((s.value + s.feasibility + s.readiness + s.strategic + s.ttv + (10 - s.risk)) / 6) * 10,
  ) / 10;

export function scoreTotal(score: DemoScoreSpec): number {
  return totalOf(score);
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    key: "diversified-group",
    label: "Meridian Holdings (Demo)",
    archetype: "Diversified group",
    summary:
      "A fictional multi-sector holding group aligning AI investment across retail, logistics and property subsidiaries.",
    organization: {
      name: "Meridian Holdings (Demo)",
      industry: "Diversified holdings",
      type: "group",
      country: "AE",
    },
    workspace: "Diversified Group — Demo Template",
    board: "Group AI Portfolio Board (Demo)",
    portfolio: {
      name: "Group AI Investment Portfolio (Demo)",
      objective:
        "Balance group-wide AI investment across three subsidiaries with one funding view.",
      targetQuarter: "FY27 Q1",
    },
    opportunities: [
      {
        title: "Group-wide spend classification",
        pain_point:
          "Each subsidiary classifies supplier spend differently, so group savings are invisible.",
        desired_outcome: "One classified spend view across subsidiaries within a quarter of close.",
        business_function: "Finance",
        strategic_objective: "Operational efficiency",
        urgency: "now",
        status: "qualified",
      },
      {
        title: "Shared logistics route optimisation",
        pain_point: "Retail and distribution arms run overlapping delivery routes.",
        desired_outcome: "Consolidated routing with lower cost per drop.",
        business_function: "Supply chain",
        strategic_objective: "Cost leadership",
        urgency: "next",
        status: "opportunity",
      },
      {
        title: "Property portfolio energy forecasting",
        pain_point: "Energy budgets are set annually with no consumption modelling.",
        desired_outcome: "Forecast-led energy budgets and reduced peak-load charges.",
        business_function: "Facilities",
        strategic_objective: "Sustainability",
        urgency: "later",
        status: "signal",
      },
    ],
    useCases: [
      {
        title: "Group spend classification engine",
        problem_statement:
          "Supplier spend is coded inconsistently across three subsidiaries, hiding consolidation savings.",
        ai_type: "Machine learning",
        status: "designed",
        score: { value: 8, feasibility: 7, readiness: 6, risk: 4, strategic: 9, ttv: 7 },
        benefits: [
          {
            name: "Consolidated sourcing savings",
            kpi: "Addressable spend under group contracts",
            category: "cost_reduction",
            unit_type: "currency",
            currency: "AED",
            period: "annual",
            baseline_value: 0,
            target_value: 4_200_000,
            expected_value: 2_800_000,
            confidence: "medium",
            benefit_owner: "Group Procurement Director (demo persona)",
            measurement_frequency: "quarterly",
            evidence_source: "Group procurement ledger extract (fictional)",
            state: "approved",
          },
        ],
        portfolio: {
          decision: "approved",
          funding_state: "funded",
          delivery_stage: "now",
          target_period: "FY27 Q1",
          milestone: "Classified spend baseline signed off",
          planned_start_date: "2026-09-01",
          planned_end_date: "2026-12-15",
          delivery_owner: "Group Data Office (demo persona)",
        },
      },
      {
        title: "Cross-subsidiary route consolidation",
        problem_statement:
          "Overlapping delivery routes inflate cost per drop across two subsidiaries.",
        ai_type: "Optimisation",
        status: "idea",
        score: { value: 7, feasibility: 5, readiness: 5, risk: 5, strategic: 7, ttv: 5 },
        benefits: [
          {
            name: "Cost per drop reduction",
            kpi: "Average cost per delivery drop",
            category: "cost_reduction",
            unit_type: "currency",
            currency: "AED",
            period: "annual",
            baseline_value: 38,
            target_value: 31,
            expected_value: 33,
            confidence: "low",
            benefit_owner: "Logistics COO (demo persona)",
            measurement_frequency: "monthly",
            evidence_source: "Fictional transport management extract",
            state: "proposed",
          },
        ],
        portfolio: {
          decision: "shortlisted",
          funding_state: "requested",
          delivery_stage: "next",
          target_period: "FY27 Q2",
          milestone: "Route simulation completed",
          planned_start_date: "2027-01-05",
          planned_end_date: "2027-04-30",
          delivery_owner: "Logistics Transformation Lead (demo persona)",
        },
      },
    ],
    report: {
      title: "Demo — Meridian Holdings group AI investment summary",
      kind: "portfolio_summary",
    },
    story: [
      {
        title: "1 · Review the group opportunity backlog",
        detail: "Three labelled opportunities span finance, supply chain and facilities.",
        to: "/opportunities",
      },
      {
        title: "2 · Position them on the Opportunity Map",
        detail: "See how the same backlog reads by business function and strategic theme.",
        to: "/opportunity-map",
      },
      {
        title: "3 · Open the designed use cases",
        detail: "Two opportunities are already designed into use cases with scores attached.",
        to: "/my-use-cases",
      },
      {
        title: "4 · Inspect the funded portfolio",
        detail: "Decisions, funding state and rank across the group portfolio.",
        to: "/portfoliox",
      },
      {
        title: "5 · Read the roadmap and value",
        detail: "Delivery stages and expected benefits with named owners and evidence sources.",
        to: "/roadmap",
      },
      {
        title: "6 · Open the sample report",
        detail: "A pre-generated group investment summary, ready to export.",
        to: "/reports",
      },
    ],
  },
  {
    key: "financial-services",
    label: "Northport Mutual Bank (Demo)",
    archetype: "Financial services",
    summary:
      "A fictional mid-size retail bank balancing customer-experience gains against regulatory and model-risk controls.",
    organization: {
      name: "Northport Mutual Bank (Demo)",
      industry: "Banking",
      type: "company",
      country: "GB",
    },
    workspace: "Financial Services — Demo Template",
    board: "Retail Bank AI Board (Demo)",
    portfolio: {
      name: "Retail Banking AI Portfolio (Demo)",
      objective: "Deliver service and risk gains inside an auditable model-governance envelope.",
      targetQuarter: "FY27 Q1",
    },
    opportunities: [
      {
        title: "Disputed transaction triage",
        pain_point: "Dispute cases are triaged manually and breach service targets at month end.",
        desired_outcome: "Automated triage with a clear audit trail per decision.",
        business_function: "Operations",
        strategic_objective: "Customer experience",
        urgency: "now",
        status: "qualified",
      },
      {
        title: "Complaint theme detection",
        pain_point: "Emerging complaint themes are only visible in quarterly reporting.",
        desired_outcome: "Weekly theme detection feeding conduct-risk reviews.",
        business_function: "Risk & compliance",
        strategic_objective: "Regulatory confidence",
        urgency: "next",
        status: "opportunity",
      },
      {
        title: "Onboarding document checks",
        pain_point: "Account opening stalls on manual document verification.",
        desired_outcome: "Assisted verification with human sign-off retained.",
        business_function: "Customer onboarding",
        strategic_objective: "Growth",
        urgency: "next",
        status: "signal",
      },
    ],
    useCases: [
      {
        title: "Assisted dispute triage",
        problem_statement:
          "Analysts read every dispute in full before routing, creating a month-end backlog.",
        ai_type: "Generative AI",
        status: "designed",
        score: { value: 7, feasibility: 7, readiness: 7, risk: 6, strategic: 8, ttv: 8 },
        benefits: [
          {
            name: "Triage handling time",
            kpi: "Average minutes per dispute triage",
            category: "productivity",
            unit_type: "hours",
            currency: null,
            period: "annual",
            baseline_value: 9500,
            target_value: 6200,
            expected_value: 7100,
            confidence: "medium",
            benefit_owner: "Head of Disputes (demo persona)",
            measurement_frequency: "monthly",
            evidence_source: "Fictional case management timing export",
            state: "approved",
          },
          {
            name: "Service-level breaches avoided",
            kpi: "Disputes breaching the 15-day target",
            category: "customer_experience",
            unit_type: "count",
            currency: null,
            period: "quarterly",
            baseline_value: 420,
            target_value: 120,
            expected_value: 190,
            confidence: "medium",
            benefit_owner: "Customer Operations Director (demo persona)",
            measurement_frequency: "quarterly",
            evidence_source: "Fictional SLA report",
            state: "proposed",
          },
        ],
        portfolio: {
          decision: "approved",
          funding_state: "funded",
          delivery_stage: "now",
          target_period: "FY27 Q1",
          milestone: "Model-risk review cleared",
          planned_start_date: "2026-09-15",
          planned_end_date: "2027-01-31",
          delivery_owner: "Operations Change Lead (demo persona)",
        },
      },
      {
        title: "Conduct-risk theme detection",
        problem_statement: "Complaint themes surface too late for conduct-risk intervention.",
        ai_type: "Natural language processing",
        status: "idea",
        score: { value: 6, feasibility: 6, readiness: 5, risk: 7, strategic: 8, ttv: 5 },
        benefits: [
          {
            name: "Earlier conduct-risk detection",
            kpi: "Days from first complaint to theme escalation",
            category: "risk_reduction",
            unit_type: "count",
            currency: null,
            period: "quarterly",
            baseline_value: 62,
            target_value: 14,
            expected_value: 21,
            confidence: "low",
            benefit_owner: "Chief Risk Officer (demo persona)",
            measurement_frequency: "quarterly",
            evidence_source: "Fictional conduct-risk register",
            state: "proposed",
          },
        ],
        portfolio: {
          decision: "under_review",
          funding_state: "requested",
          delivery_stage: "later",
          target_period: "FY27 Q3",
          milestone: "Conduct-risk committee decision",
          planned_start_date: "2027-04-01",
          planned_end_date: "2027-08-31",
          delivery_owner: "Risk Analytics Lead (demo persona)",
        },
      },
    ],
    report: {
      title: "Demo — Northport Mutual retail AI portfolio review",
      kind: "portfolio_summary",
    },
    story: [
      {
        title: "1 · Start from the service backlog",
        detail: "Dispute, complaint and onboarding opportunities, all labelled as demo records.",
        to: "/opportunities",
      },
      {
        title: "2 · Design the triage use case",
        detail: "Open the assisted dispute triage use case in the Studio.",
        to: "/my-use-cases",
      },
      {
        title: "3 · Score value against feasibility",
        detail: "Scores are pre-populated so the value/feasibility positioning is visible.",
        to: "/feasibility",
      },
      {
        title: "4 · Check the governance posture",
        detail: "Model risk and conduct review sit before the funded delivery stage.",
        to: "/governance",
      },
      {
        title: "5 · Review portfolio and roadmap",
        detail: "One funded item now, one under review later, with named owners.",
        to: "/roadmap",
      },
      {
        title: "6 · Export the sample report",
        detail: "A pre-generated portfolio review, ready to export.",
        to: "/reports",
      },
    ],
  },
  {
    key: "manufacturing",
    label: "Kestrel Industrials (Demo)",
    archetype: "Manufacturing",
    summary:
      "A fictional discrete manufacturer targeting downtime, yield and inspection quality across two plants.",
    organization: {
      name: "Kestrel Industrials (Demo)",
      industry: "Manufacturing",
      type: "company",
      country: "DE",
    },
    workspace: "Manufacturing — Demo Template",
    board: "Plant AI Board (Demo)",
    portfolio: {
      name: "Plant Productivity AI Portfolio (Demo)",
      objective: "Reduce unplanned downtime and scrap across two fictional plants.",
      targetQuarter: "FY27 Q2",
    },
    opportunities: [
      {
        title: "Unplanned line downtime",
        pain_point: "Line stoppages are diagnosed after the fact from paper logs.",
        desired_outcome: "Early warning on the three highest-loss assets.",
        business_function: "Maintenance",
        strategic_objective: "Asset productivity",
        urgency: "now",
        status: "qualified",
      },
      {
        title: "Visual weld inspection",
        pain_point: "Manual weld inspection is inconsistent between shifts.",
        desired_outcome: "Consistent inspection with reviewable images.",
        business_function: "Quality",
        strategic_objective: "Quality assurance",
        urgency: "next",
        status: "opportunity",
      },
      {
        title: "Scrap root-cause analysis",
        pain_point: "Scrap causes are debated without a shared data view.",
        desired_outcome: "Ranked scrap drivers per line, refreshed weekly.",
        business_function: "Production",
        strategic_objective: "Cost leadership",
        urgency: "later",
        status: "signal",
      },
    ],
    useCases: [
      {
        title: "Predictive maintenance for press lines",
        problem_statement: "Unplanned press stoppages drive emergency maintenance and lost output.",
        ai_type: "Predictive analytics",
        status: "in_delivery",
        score: { value: 9, feasibility: 6, readiness: 7, risk: 4, strategic: 8, ttv: 6 },
        benefits: [
          {
            name: "Unplanned downtime reduction",
            kpi: "Unplanned downtime hours per quarter",
            category: "productivity",
            unit_type: "hours",
            currency: null,
            period: "quarterly",
            baseline_value: 640,
            target_value: 390,
            expected_value: 450,
            confidence: "high",
            benefit_owner: "Plant Maintenance Manager (demo persona)",
            measurement_frequency: "monthly",
            evidence_source: "Fictional CMMS downtime export",
            state: "delivered",
          },
          {
            name: "Emergency maintenance spend",
            kpi: "Emergency work-order cost",
            category: "cost_reduction",
            unit_type: "currency",
            currency: "EUR",
            period: "annual",
            baseline_value: 1_450_000,
            target_value: 900_000,
            expected_value: 1_050_000,
            confidence: "medium",
            benefit_owner: "Plant Finance Controller (demo persona)",
            measurement_frequency: "quarterly",
            evidence_source: "Fictional maintenance cost ledger",
            state: "approved",
          },
        ],
        portfolio: {
          decision: "approved",
          funding_state: "funded",
          delivery_stage: "now",
          target_period: "FY27 Q1",
          milestone: "Pilot line in production monitoring",
          planned_start_date: "2026-08-20",
          planned_end_date: "2026-12-20",
          delivery_owner: "Reliability Engineering Lead (demo persona)",
        },
      },
      {
        title: "Automated weld inspection",
        problem_statement: "Weld inspection quality varies between shifts and inspectors.",
        ai_type: "Computer vision",
        status: "designed",
        score: { value: 7, feasibility: 6, readiness: 6, risk: 5, strategic: 7, ttv: 6 },
        benefits: [
          {
            name: "Escaped defect reduction",
            kpi: "Escaped weld defects per 10k units",
            category: "quality",
            unit_type: "count",
            currency: null,
            period: "quarterly",
            baseline_value: 34,
            target_value: 12,
            expected_value: 18,
            confidence: "medium",
            benefit_owner: "Head of Quality (demo persona)",
            measurement_frequency: "monthly",
            evidence_source: "Fictional quality inspection log",
            state: "proposed",
          },
        ],
        portfolio: {
          decision: "shortlisted",
          funding_state: "requested",
          delivery_stage: "next",
          target_period: "FY27 Q2",
          milestone: "Line-side camera trial complete",
          planned_start_date: "2027-01-12",
          planned_end_date: "2027-05-29",
          delivery_owner: "Quality Systems Engineer (demo persona)",
        },
      },
    ],
    report: {
      title: "Demo — Kestrel Industrials plant AI value summary",
      kind: "portfolio_summary",
    },
    story: [
      {
        title: "1 · Capture the plant backlog",
        detail:
          "Downtime, inspection and scrap opportunities captured from a fictional plant review.",
        to: "/opportunities",
      },
      {
        title: "2 · Open the delivery use case",
        detail: "Predictive maintenance is already in delivery on the demo board.",
        to: "/my-use-cases",
      },
      {
        title: "3 · Compare feasibility",
        detail: "Two scored use cases show a fast follower behind the funded item.",
        to: "/feasibility",
      },
      {
        title: "4 · Track benefits",
        detail: "Downtime hours and maintenance spend carry owners, evidence and confidence.",
        to: "/portfoliox",
      },
      {
        title: "5 · Read the roadmap",
        detail: "Now / next staging with planned dates and milestones.",
        to: "/roadmap",
      },
      {
        title: "6 · Open the sample report",
        detail: "A pre-generated plant value summary, ready to export.",
        to: "/reports",
      },
    ],
  },
  {
    key: "sme-professional-services",
    label: "Calder & Ross Advisory (Demo)",
    archetype: "SME / professional services",
    summary:
      "A fictional 60-person advisory firm proving quick, low-risk AI wins without a dedicated data team.",
    organization: {
      name: "Calder & Ross Advisory (Demo)",
      industry: "Professional services",
      type: "company",
      country: "SG",
    },
    workspace: "SME Professional Services — Demo Template",
    board: "Firm AI Board (Demo)",
    portfolio: {
      name: "Firm Productivity Portfolio (Demo)",
      objective:
        "Two low-risk productivity wins delivered inside one quarter with no new headcount.",
      targetQuarter: "FY27 Q1",
    },
    opportunities: [
      {
        title: "Proposal drafting turnaround",
        pain_point: "Partners rewrite proposal boilerplate for every pursuit.",
        desired_outcome: "First drafts assembled from prior approved material.",
        business_function: "Business development",
        strategic_objective: "Revenue growth",
        urgency: "now",
        status: "qualified",
      },
      {
        title: "Engagement note summarisation",
        pain_point: "Consultants spend billable-adjacent time writing meeting notes.",
        desired_outcome: "Structured notes and actions produced in minutes.",
        business_function: "Delivery",
        strategic_objective: "Utilisation",
        urgency: "next",
        status: "opportunity",
      },
      {
        title: "Invoice narrative consistency",
        pain_point: "Client invoice narratives vary and trigger billing queries.",
        desired_outcome: "Consistent narratives with fewer billing disputes.",
        business_function: "Finance",
        strategic_objective: "Cash collection",
        urgency: "later",
        status: "signal",
      },
    ],
    useCases: [
      {
        title: "Proposal first-draft assistant",
        problem_statement: "Every pursuit restarts proposal drafting from a blank document.",
        ai_type: "Generative AI",
        status: "designed",
        score: { value: 7, feasibility: 9, readiness: 8, risk: 3, strategic: 6, ttv: 9 },
        benefits: [
          {
            name: "Partner drafting time released",
            kpi: "Partner hours per proposal",
            category: "productivity",
            unit_type: "hours",
            currency: null,
            period: "annual",
            baseline_value: 1450,
            target_value: 850,
            expected_value: 980,
            confidence: "high",
            benefit_owner: "Managing Partner (demo persona)",
            measurement_frequency: "quarterly",
            evidence_source: "Fictional time-recording export",
            state: "approved",
          },
        ],
        portfolio: {
          decision: "approved",
          funding_state: "funded",
          delivery_stage: "now",
          target_period: "FY27 Q1",
          milestone: "Template library approved",
          planned_start_date: "2026-09-01",
          planned_end_date: "2026-11-14",
          delivery_owner: "BD Operations Manager (demo persona)",
        },
      },
      {
        title: "Engagement note summarisation",
        problem_statement: "Consultants write up meeting notes manually after every session.",
        ai_type: "Generative AI",
        status: "idea",
        score: { value: 6, feasibility: 8, readiness: 7, risk: 4, strategic: 5, ttv: 8 },
        benefits: [
          {
            name: "Write-up time released",
            kpi: "Hours spent on engagement write-ups",
            category: "productivity",
            unit_type: "hours",
            currency: null,
            period: "annual",
            baseline_value: 2100,
            target_value: 1200,
            expected_value: 1450,
            confidence: "medium",
            benefit_owner: "Delivery Director (demo persona)",
            measurement_frequency: "quarterly",
            evidence_source: "Fictional timesheet sample",
            state: "proposed",
          },
        ],
        portfolio: {
          decision: "shortlisted",
          funding_state: "requested",
          delivery_stage: "next",
          target_period: "FY27 Q2",
          milestone: "Pilot with two delivery teams",
          planned_start_date: "2027-01-06",
          planned_end_date: "2027-03-27",
          delivery_owner: "Practice Operations Lead (demo persona)",
        },
      },
    ],
    report: { title: "Demo — Calder & Ross firm productivity summary", kind: "portfolio_summary" },
    story: [
      {
        title: "1 · Capture two quick wins",
        detail: "A short backlog sized for a firm with no dedicated data team.",
        to: "/opportunities",
      },
      {
        title: "2 · Design the proposal assistant",
        detail: "The highest-feasibility use case is already designed.",
        to: "/my-use-cases",
      },
      {
        title: "3 · Confirm feasibility",
        detail: "High feasibility, low risk, fast time to value.",
        to: "/feasibility",
      },
      {
        title: "4 · Fund one, shortlist one",
        detail: "The portfolio keeps scope honest for a 60-person firm.",
        to: "/portfoliox",
      },
      {
        title: "5 · Check the quarter plan",
        detail: "Both items land inside two quarters on the roadmap.",
        to: "/roadmap",
      },
      {
        title: "6 · Open the sample report",
        detail: "A pre-generated productivity summary, ready to export.",
        to: "/reports",
      },
    ],
  },
];

export function findScenario(key: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.key === key);
}

/** Copy suffix applied to every user-owned sample record, so lineage is visible. */
export const SAMPLE_SUFFIX = "(Sample)";

export function sampleName(name: string): string {
  return `${name} ${SAMPLE_SUFFIX}`;
}
