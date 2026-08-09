/**
 * Deliverable composition — one place that turns everything captured about a
 * use case into the 12 named advisory documents.
 *
 * Two sources feed a deliverable:
 *   • a saved `use_case_deliverables` row (the structured editors), or
 *   • derived data from the modules the user already completed
 *     (`feasibility_scores`, `data_readiness_assessments`, `blueprints`,
 *      `ai_use_cases`).
 *
 * Client-safe: reads through the browser Supabase client under RLS, no secrets.
 */

import * as studioRepo from "@/lib/domain/studio.repository";
import { loadDeliverables, type DeliverableRow } from "@/lib/deliverables.data";
import {
  DELIVERABLE_META,
  DELIVERABLE_ORDER,
  type CapabilityEntry,
  type DeliverableStatus,
  type DeliverableType,
  type ReferenceWorkflowStep,
  type RiskRow,
} from "@/lib/deliverables";
import type { ExportSection } from "@/lib/deliverables.export";

/* --------------------------- source data bundle --------------------------- */

export type UseCaseSources = {
  useCase: Record<string, unknown> | null;
  feasibility: Record<string, unknown> | null;
  dataReadiness: Record<string, unknown> | null;
  blueprint: Record<string, unknown> | null;
  saved: Record<string, DeliverableRow>;
};

export async function loadUseCaseSources(useCaseId: string): Promise<UseCaseSources> {
  const [useCase, feasibility, dataReadiness, blueprint, rows] = await Promise.all([
    studioRepo.getStudioUseCase<Record<string, unknown>>(useCaseId).catch(() => null),
    studioRepo.getLatestFeasibility<Record<string, unknown>>(useCaseId, "*").catch(() => null),
    studioRepo.getLatestDataReadiness<Record<string, unknown>>(useCaseId).catch(() => null),
    studioRepo.getBlueprint<Record<string, unknown>>(useCaseId).catch(() => null),
    loadDeliverables(useCaseId).catch(() => [] as DeliverableRow[]),
  ]);

  const saved: Record<string, DeliverableRow> = {};
  rows.forEach((r) => (saved[r.deliverable_type] = r));
  return { useCase, feasibility, dataReadiness, blueprint, saved };
}

/* ------------------------------ helpers ---------------------------------- */

const text = (v: unknown): string =>
  typeof v === "string" ? v : v == null ? "" : Array.isArray(v) ? v.filter(Boolean).join("\n") : "";

const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

function nonEmpty(sections: ExportSection[]): boolean {
  return sections.some((s) =>
    s.kind === "text" ? s.body.trim().length > 0 : s.rows.some((r) => r.some((c) => c?.trim())),
  );
}

/* ------------------- sections from a saved editor row --------------------- */

export function buildSavedSections(
  dType: DeliverableType,
  content: Record<string, unknown>,
): ExportSection[] {
  const txt = (k: string) => text(content[k]);
  switch (dType) {
    case "analytical_logic_model":
      return (
        [
          ["Prediction target", "predictionTarget"],
          ["Inputs / features", "inputs"],
          ["Output format", "outputFormat"],
          ["Decision thresholds", "thresholds"],
          ["Model family", "modelFamily"],
          ["Training approach", "trainingApproach"],
          ["Validation approach", "validationApproach"],
          ["Feedback loop", "feedbackLoop"],
        ] as const
      ).map(([h, k]) => ({ heading: h, kind: "text" as const, body: txt(k) }));
    case "integration_notes":
      return (
        [
          ["Source & target systems", "sourceSystems"],
          ["Authentication", "authMethod"],
          ["Data formats & contracts", "dataFormats"],
          ["Latency & SLA", "latencySLA"],
          ["Error handling & retries", "errorHandling"],
          ["Middleware / pattern", "middleware"],
          ["Additional notes", "notes"],
        ] as const
      ).map(([h, k]) => ({ heading: h, kind: "text" as const, body: txt(k) }));
    case "capability_framework": {
      const entries = (content.entries as CapabilityEntry[]) ?? [];
      return [
        {
          heading: "Capability inventory",
          kind: "table",
          columns: ["Domain", "Capability", "Now", "Required", "Build/Buy/Partner", "Gap / action"],
          rows: entries.map((e) => [
            e.domain,
            e.capability,
            String(e.currentLevel),
            String(e.requiredLevel),
            e.buildBuyPartner,
            e.gap,
          ]),
        },
        { heading: "Notes", kind: "text", body: txt("notes") },
      ];
    }
    case "risk_assumption_register": {
      const rows = (content.rows as RiskRow[]) ?? [];
      return [
        {
          heading: "Register",
          kind: "table",
          columns: [
            "Type",
            "Description",
            "L",
            "I",
            "Score",
            "Owner",
            "Mitigation",
            "Residual",
            "Review",
          ],
          rows: rows.map((r) => [
            r.type,
            r.description,
            String(r.likelihood),
            String(r.impact),
            String(r.score),
            r.owner,
            r.mitigationAction,
            r.residualRisk,
            r.reviewDate,
          ]),
        },
      ];
    }
    case "reference_workflows": {
      const mk = (key: "beforeSteps" | "afterSteps") =>
        ((content[key] as ReferenceWorkflowStep[]) ?? []).map((s, i) => [
          String(i + 1),
          s.actor,
          s.action,
          s.aiIntegration ? "AI" : "",
        ]);
      return [
        {
          heading: "Current workflow (before AI)",
          kind: "table",
          columns: ["#", "Actor", "Action", "AI"],
          rows: mk("beforeSteps"),
        },
        {
          heading: "Future workflow (with AI)",
          kind: "table",
          columns: ["#", "Actor", "Action", "AI"],
          rows: mk("afterSteps"),
        },
        { heading: "Process notes", kind: "text", body: txt("notes") },
      ];
    }
    case "portfolio_roadmap": {
      const phases =
        (content.phases as {
          name: string;
          useCases: string[];
          startDate: string;
          endDate: string;
          valueGate: string;
        }[]) ?? [];
      return [
        {
          heading: "Roadmap phases",
          kind: "table",
          columns: ["Phase", "Start", "End", "Value gate", "Use cases"],
          rows: phases.map((p) => [
            p.name,
            p.startDate,
            p.endDate,
            p.valueGate,
            (p.useCases ?? []).join(", "),
          ]),
        },
        { heading: "Dependencies & sequencing", kind: "text", body: txt("notes") },
      ];
    }
    case "handover_package": {
      const included = (content.includedDeliverables as DeliverableType[]) ?? [];
      return [
        {
          heading: "Included deliverables",
          kind: "text",
          body:
            included
              .map((t) => `• ${DELIVERABLE_META[t].order}. ${DELIVERABLE_META[t].label}`)
              .join("\n") || "—",
        },
        { heading: "Operating runbook", kind: "text", body: txt("runbook") },
        { heading: "Key contacts", kind: "text", body: txt("contacts") },
        { heading: "Decision log", kind: "text", body: txt("decisionLog") },
        { heading: "Lessons learned", kind: "text", body: txt("lessonsLearned") },
      ];
    }
    default:
      return [];
  }
}

/* ------------------ sections derived from module data --------------------- */

function derivedSections(dType: DeliverableType, src: UseCaseSources): ExportSection[] {
  const uc = src.useCase ?? {};
  const f = src.feasibility;
  const dr = src.dataReadiness;
  const bp = src.blueprint;

  switch (dType) {
    case "longlist_report":
      return [
        { heading: "Use case", kind: "text", body: text(uc.title) },
        { heading: "Business problem", kind: "text", body: text(uc.problem_statement) },
        { heading: "Current state", kind: "text", body: text(uc.current_state) },
        { heading: "Future state", kind: "text", body: text(uc.future_state) },
        { heading: "AI type", kind: "text", body: text(uc.ai_type) },
        { heading: "Beneficiaries", kind: "text", body: text(uc.beneficiaries) },
        { heading: "Expected benefits", kind: "text", body: text(uc.expected_benefits) },
        { heading: "KPIs", kind: "text", body: text(uc.kpis) },
      ];

    case "prioritization_framework": {
      if (!f) return [];
      const pillars: [string, unknown][] = [
        ["Desirability", f.desirability_score],
        ["Viability", f.viability_score],
        ["Feasibility", f.feasibility_score],
        ["Governability", f.governability_score],
        ["Sustainability", f.sustainability_score],
      ];
      return [
        {
          heading: "Five-pillar feasibility assessment",
          kind: "table",
          columns: ["Pillar", "Score / 100"],
          rows: pillars.map(([l, v]) => [l, num(v) == null ? "—" : String(num(v))]),
        },
        {
          heading: "Overall",
          kind: "text",
          body: [
            `Total score: ${num(f.total_score) ?? "—"} / 100`,
            `Recommendation: ${text(f.recommendation) || "—"}`,
            `Assessed: ${text(f.updated_at) || text(f.created_at)}`,
          ].join("\n"),
        },
        { heading: "Assessor notes", kind: "text", body: text(f.notes) },
      ];
    }

    case "conceptual_design": {
      if (!bp) return [];
      return (
        [
          ["Executive summary", "executive_summary"],
          ["Business case", "business_case"],
          ["Technical scope", "technical_scope"],
          ["Data requirements", "data_requirements"],
          ["Model approach", "model_approach"],
          ["Risk summary", "risk_summary"],
          ["Governance controls", "governance_controls"],
          ["Implementation roadmap", "implementation_roadmap"],
          ["Budget assumptions", "budget_assumptions"],
          ["Success metrics", "success_metrics"],
        ] as const
      ).map(([h, k]) => ({ heading: h, kind: "text" as const, body: text(bp[k]) }));
    }

    case "data_requirements": {
      if (!dr) return [];
      const gaps = Array.isArray(dr.missing_data_gaps)
        ? (dr.missing_data_gaps as Record<string, unknown>[])
        : [];
      const sections: ExportSection[] = [
        {
          heading: "Readiness dimensions",
          kind: "table",
          columns: ["Dimension", "Score / 5"],
          rows: [
            ["Availability", dr.data_availability_score],
            ["Quality", dr.data_quality_score],
            ["Accessibility", dr.data_accessibility_score],
            ["Privacy exposure", dr.privacy_exposure_score],
            ["Bias risk", dr.bias_risk_score],
            ["Ownership clarity", dr.ownership_clarity_score],
          ].map(([l, v]) => [String(l), num(v) == null ? "—" : String(num(v))]),
        },
        {
          heading: "Overall data readiness",
          kind: "text",
          body: `${num(dr.overall_data_readiness_score) ?? "—"} / 100`,
        },
      ];
      if (gaps.length) {
        sections.push({
          heading: "Data sources",
          kind: "table",
          columns: ["Source", "Owner", "Format", "Availability", "Quality", "Privacy"],
          rows: gaps.map((g) => [
            text(g.name),
            text(g.owner),
            text(g.format),
            String(num(g.availability) ?? "—"),
            String(num(g.quality) ?? "—"),
            String(num(g.privacy_sensitivity) ?? "—"),
          ]),
        });
      }
      sections.push({
        heading: "Mitigation recommendations",
        kind: "text",
        body: text(dr.mitigation_recommendations),
      });
      return sections;
    }

    case "governance_document": {
      const body = [
        text(uc.risk_level) ? `Risk level: ${text(uc.risk_level)}` : "",
        text(bp?.governance_controls),
        text(bp?.risk_summary),
      ]
        .filter(Boolean)
        .join("\n\n");
      const controls = Array.isArray(uc.controls) ? (uc.controls as string[]) : [];
      const risks = Array.isArray(uc.risks) ? (uc.risks as string[]) : [];
      const sections: ExportSection[] = [{ heading: "Governance position", kind: "text", body }];
      if (risks.length)
        sections.push({ heading: "Identified risks", kind: "text", body: risks.join("\n") });
      if (controls.length)
        sections.push({ heading: "Controls", kind: "text", body: controls.join("\n") });
      return sections;
    }

    case "capability_framework":
      return [
        {
          heading: "Capability signals from assessment",
          kind: "text",
          body: f
            ? `Feasibility pillar score: ${num(f.feasibility_score) ?? "—"} / 100\nSustainability pillar score: ${
                num(f.sustainability_score) ?? "—"
              } / 100`
            : "",
        },
      ];

    case "risk_assumption_register": {
      const risks = Array.isArray(uc.risks) ? (uc.risks as string[]) : [];
      if (!risks.length) return [];
      return [
        {
          heading: "Risks captured in the use case",
          kind: "table",
          columns: ["Type", "Description", "Owner", "Mitigation"],
          rows: risks.map((r) => ["risk", r, "", ""]),
        },
      ];
    }

    case "portfolio_roadmap":
      return [
        {
          heading: "Implementation roadmap",
          kind: "text",
          body: text(bp?.implementation_roadmap),
        },
      ];

    case "analytical_logic_model":
      return [
        { heading: "Model approach", kind: "text", body: text(bp?.model_approach) },
        {
          heading: "Minimum viable prediction",
          kind: "text",
          body: text(uc.minimum_viable_prediction),
        },
      ];

    default:
      return [];
  }
}

/* ------------------------------ public API -------------------------------- */

export type ComposedDeliverable = {
  type: DeliverableType;
  label: string;
  order: number;
  description: string;
  /** Where the content came from. */
  origin: "saved" | "derived" | "empty";
  status: DeliverableStatus;
  sections: ExportSection[];
  /** True when there is something worth exporting. */
  hasContent: boolean;
  /** Module route that owns the underlying data, when one exists. */
  moduleRoute?: string;
};

export function composeDeliverable(
  dType: DeliverableType,
  src: UseCaseSources,
): ComposedDeliverable {
  const meta = DELIVERABLE_META[dType];
  const savedRow = src.saved[dType];
  let origin: ComposedDeliverable["origin"] = "empty";
  let sections: ExportSection[] = [];

  if (savedRow) {
    const savedSections = buildSavedSections(dType, savedRow.content ?? {});
    if (nonEmpty(savedSections)) {
      sections = savedSections;
      origin = "saved";
    }
  }
  if (origin === "empty") {
    const derived = derivedSections(dType, src);
    if (nonEmpty(derived)) {
      sections = derived;
      origin = "derived";
    }
  }

  const status: DeliverableStatus =
    savedRow?.status === "ready"
      ? "ready"
      : origin === "empty"
        ? "not_started"
        : savedRow
          ? "draft"
          : "draft";

  return {
    type: dType,
    label: meta.label,
    order: meta.order,
    description: meta.description,
    origin,
    status,
    sections,
    hasContent: origin !== "empty",
    moduleRoute: meta.existingRoute,
  };
}

export function composeAll(src: UseCaseSources): ComposedDeliverable[] {
  return DELIVERABLE_ORDER.map((t) => composeDeliverable(t, src));
}
