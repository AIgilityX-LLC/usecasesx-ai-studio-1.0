/**
 * Guided demo story export.
 *
 * Builds a single PDF package from the static scenario template library only —
 * it never reads tenant data — and appends a template-to-copy lineage summary
 * so a reader can see exactly which template produced which sample records.
 */
import {
  DEMO_DISCLAIMER,
  DEMO_TEMPLATE_VERSION,
  scoreTotal,
  type DemoScenario,
} from "./demo-scenarios";
import { exportPackagePDF, type ExportDoc } from "@/lib/deliverables.export";

export interface LineageEntry {
  scenario_key: string;
  scenario_label: string;
  template_version: string;
  entity_counts: Record<string, number> | null;
  created_at: string;
}

function money(value: number, currency: string | null) {
  return `${currency ? `${currency} ` : ""}${value.toLocaleString()}`;
}

export function buildDemoStoryDocs(
  scenario: DemoScenario,
  lineage: LineageEntry[] = [],
): ExportDoc[] {
  const overview: ExportDoc = {
    title: "Scenario overview",
    subtitle: scenario.archetype,
    sections: [
      { heading: "Summary", kind: "text", body: scenario.summary },
      { heading: "Disclaimer", kind: "text", body: DEMO_DISCLAIMER },
      {
        heading: "Demonstration organisation",
        kind: "table",
        columns: ["Attribute", "Value"],
        rows: [
          ["Organisation", scenario.organization.name],
          ["Industry", scenario.organization.industry],
          ["Type", scenario.organization.type],
          ["Country", scenario.organization.country],
          ["Template workspace", scenario.workspace],
          ["Template key", scenario.key],
          ["Template version", DEMO_TEMPLATE_VERSION],
        ],
      },
    ],
  };

  const story: ExportDoc = {
    title: "Guided story",
    subtitle: "Discover → Capture → Design → Score → Prioritize → Portfolio → Roadmap → Export",
    sections: [
      {
        heading: "Walkthrough steps",
        kind: "table",
        columns: ["Step", "What to show", "Where"],
        rows: scenario.story.map((step) => [step.title, step.detail, step.to]),
      },
    ],
  };

  const opportunities: ExportDoc = {
    title: "Captured opportunities",
    sections: [
      {
        heading: "Opportunity backlog",
        kind: "table",
        columns: ["Title", "Pain point", "Desired outcome", "Function", "Urgency", "Status"],
        rows: scenario.opportunities.map((o) => [
          o.title,
          o.pain_point,
          o.desired_outcome,
          o.business_function,
          o.urgency,
          o.status,
        ]),
      },
    ],
  };

  const design: ExportDoc = {
    title: "Designed and scored use cases",
    sections: [
      {
        heading: "Use cases",
        kind: "table",
        columns: ["Title", "AI type", "Status", "Score"],
        rows: scenario.useCases.map((uc) => [
          uc.title,
          uc.ai_type,
          uc.status,
          String(scoreTotal(uc.score)),
        ]),
      },
      {
        heading: "Score detail",
        kind: "table",
        columns: ["Use case", "Value", "Feasibility", "Readiness", "Risk", "Strategic", "TTV"],
        rows: scenario.useCases.map((uc) => [
          uc.title,
          String(uc.score.value),
          String(uc.score.feasibility),
          String(uc.score.readiness),
          String(uc.score.risk),
          String(uc.score.strategic),
          String(uc.score.ttv),
        ]),
      },
    ],
  };

  const portfolio: ExportDoc = {
    title: "Portfolio and roadmap",
    subtitle: scenario.portfolio.name,
    sections: [
      { heading: "Objective", kind: "text", body: scenario.portfolio.objective },
      {
        heading: "Prioritised items",
        kind: "table",
        columns: ["Use case", "Decision", "Funding", "Stage", "Period", "Milestone", "Owner"],
        rows: scenario.useCases.map((uc) => [
          uc.title,
          uc.portfolio.decision,
          uc.portfolio.funding_state,
          uc.portfolio.delivery_stage,
          uc.portfolio.target_period,
          uc.portfolio.milestone,
          uc.portfolio.delivery_owner,
        ]),
      },
    ],
  };

  const value: ExportDoc = {
    title: "Value realization",
    sections: [
      {
        heading: "Tracked benefits",
        kind: "table",
        columns: ["Use case", "Benefit", "KPI", "Baseline", "Target", "Expected", "Confidence"],
        rows: scenario.useCases.flatMap((uc) =>
          uc.benefits.map((b) => [
            uc.title,
            b.name,
            b.kpi,
            money(b.baseline_value, b.currency),
            money(b.target_value, b.currency),
            money(b.expected_value, b.currency),
            b.confidence,
          ]),
        ),
      },
      {
        heading: "Benefit ownership and evidence",
        kind: "table",
        columns: ["Benefit", "Owner", "Frequency", "Evidence source", "State"],
        rows: scenario.useCases.flatMap((uc) =>
          uc.benefits.map((b) => [
            b.name,
            b.benefit_owner,
            b.measurement_frequency,
            b.evidence_source,
            b.state,
          ]),
        ),
      },
    ],
  };

  const scoped = lineage.filter((l) => l.scenario_key === scenario.key);
  const lineageDoc: ExportDoc = {
    title: "Template-to-copy lineage",
    subtitle: `Template ${scenario.key} · version ${DEMO_TEMPLATE_VERSION}`,
    sections: [
      {
        heading: "How lineage works",
        kind: "text",
        body: "Every sample copy is written into the user's own workspace, suffixed “(Sample)” and tagged with the template key and version below. Template records live only in labelled demonstration workspaces and are excluded from activation and usage metrics.",
      },
      {
        heading: "Copies made from this template",
        kind: "table",
        columns: ["Copied at", "Label", "Template version", "Records created"],
        rows: scoped.length
          ? scoped.map((l) => [
              new Date(l.created_at).toLocaleString(),
              l.scenario_label,
              l.template_version,
              Object.entries(l.entity_counts ?? {})
                .map(([k, v]) => `${v} ${k}`)
                .join(", "),
            ])
          : [["—", "No sample copies recorded yet", DEMO_TEMPLATE_VERSION, "—"]],
      },
    ],
  };

  return [overview, story, opportunities, design, portfolio, value, lineageDoc];
}

export function exportDemoStoryPDF(scenario: DemoScenario, lineage: LineageEntry[] = []) {
  exportPackagePDF(
    {
      title: `${scenario.label} — guided demonstration story`,
      subtitle: `${DEMO_DISCLAIMER} Template ${scenario.key} · version ${DEMO_TEMPLATE_VERSION}.`,
      documents: buildDemoStoryDocs(scenario, lineage),
    },
    `${scenario.key}-demo-story.pdf`,
  );
}
