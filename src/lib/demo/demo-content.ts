/**
 * Demonstration tenant definitions shared by the seed/reset logic and the
 * /demo-login walkthrough. Fictional content only — never production data.
 */

export const DEMO_EMAIL_DOMAIN = "@demo.usecasex.app";

export type DemoEdition = "pro" | "enterprise";

export interface DemoContentSpec {
  board: string;
  portfolio: string;
  objective: string;
  opportunities: Array<{
    title: string;
    pain_point: string;
    desired_outcome: string;
    urgency: string;
    status: string;
  }>;
  useCases: Array<{
    title: string;
    problem_statement: string;
    ai_type: string;
    status: string;
    decision: string;
    delivery_stage: string;
  }>;
  report: { title: string; kind: string };
}

export const DEMO_CONTENT: Record<DemoEdition, DemoContentSpec> = {
  pro: {
    board: "Pro Demo Board",
    portfolio: "FY26 Retail AI Portfolio",
    objective: "Prove the discovery → portfolio → report journey on a Pro seat.",
    opportunities: [
      {
        title: "Store replenishment forecasting",
        pain_point: "Manual weekly replenishment causes stock-outs on fast movers.",
        desired_outcome: "Forecast-driven replenishment with 20% fewer stock-outs.",
        urgency: "now",
        status: "qualified",
      },
      {
        title: "Customer service triage assistant",
        pain_point: "Agents re-read long email threads before every reply.",
        desired_outcome: "Summarised threads with a suggested next action.",
        urgency: "next",
        status: "opportunity",
      },
    ],
    useCases: [
      {
        title: "Demand forecasting for store replenishment",
        problem_statement: "Weekly replenishment is manual and reactive.",
        ai_type: "Predictive analytics",
        status: "designed",
        decision: "approved",
        delivery_stage: "now",
      },
      {
        title: "Service inbox summarisation",
        problem_statement: "Agents spend 6 minutes per ticket on context gathering.",
        ai_type: "Generative AI",
        status: "idea",
        decision: "shortlisted",
        delivery_stage: "next",
      },
    ],
    report: { title: "Pro demo — executive portfolio summary", kind: "portfolio_summary" },
  },
  enterprise: {
    board: "Enterprise Demo Board",
    portfolio: "Group AI Investment Portfolio",
    objective: "Show governed, ERP-verified value across an enterprise tenant.",
    opportunities: [
      {
        title: "Predictive maintenance for turbine fleet",
        pain_point: "Unplanned outages drive high emergency maintenance cost.",
        desired_outcome: "Failure prediction 14 days ahead with verified savings.",
        urgency: "now",
        status: "converted",
      },
      {
        title: "Regulatory reporting assistant",
        pain_point: "Quarterly regulatory packs take three weeks to assemble.",
        desired_outcome: "Assisted drafting with full provenance and sign-off.",
        urgency: "next",
        status: "qualified",
      },
    ],
    useCases: [
      {
        title: "Turbine failure prediction",
        problem_statement: "Unplanned turbine outages cost the fleet materially each quarter.",
        ai_type: "Predictive analytics",
        status: "in_delivery",
        decision: "approved",
        delivery_stage: "now",
      },
      {
        title: "Regulatory pack drafting assistant",
        problem_statement: "Manual assembly of regulatory packs is slow and error-prone.",
        ai_type: "Generative AI",
        status: "designed",
        decision: "shortlisted",
        delivery_stage: "next",
      },
    ],
    report: {
      title: "Enterprise demo — governed value & assurance summary",
      kind: "portfolio_summary",
    },
  },
};

export const DEMO_EDITION_EMAIL: Record<DemoEdition, string> = {
  pro: `pro${DEMO_EMAIL_DOMAIN}`,
  enterprise: `enterprise${DEMO_EMAIL_DOMAIN}`,
};

/** Guided walkthrough shown on /demo-login for each seeded edition. */
export interface WalkthroughStep {
  title: string;
  detail: string;
  to: string;
}

export const DEMO_WALKTHROUGH: Record<DemoEdition, WalkthroughStep[]> = {
  pro: [
    {
      title: "1 · Review seeded opportunities",
      detail: "Two qualified opportunities are waiting in the Pro Demo Workspace.",
      to: "/opportunities",
    },
    {
      title: "2 · Open the Studio use cases",
      detail: "Both opportunities are already designed into use cases on the Pro Demo Board.",
      to: "/my-use-cases",
    },
    {
      title: "3 · Score feasibility",
      detail: "Run scoring on a use case to see value versus feasibility positioning.",
      to: "/feasibility",
    },
    {
      title: "4 · Inspect the portfolio",
      detail: "FY26 Retail AI Portfolio holds both use cases, ranked with funding state.",
      to: "/portfoliox",
    },
    {
      title: "5 · Open the sample report",
      detail: "An executive portfolio summary is pre-generated and ready to export.",
      to: "/reports",
    },
  ],
  enterprise: [
    {
      title: "1 · Review seeded opportunities",
      detail: "Turbine and regulatory opportunities sit in the Enterprise Demo Workspace.",
      to: "/opportunities",
    },
    {
      title: "2 · Open the governed portfolio",
      detail: "Group AI Investment Portfolio shows decisions, funding and delivery stage.",
      to: "/portfoliox",
    },
    {
      title: "3 · Check governance & assurance",
      detail: "Enterprise-only governance surfaces and ERP verification states.",
      to: "/governance",
    },
    {
      title: "4 · Export the assurance report",
      detail: "Generate the report package and confirm the export receipt audit id.",
      to: "/reports",
    },
    {
      title: "5 · Raise a suite handoff",
      detail: "Send a structured handoff to SARPI or SARN/CyberX C3G from the queue.",
      to: "/handoffs",
    },
  ],
};
