/**
 * Enterprise Deliverables catalogue.
 * 12 named documents an advisory engagement hands over to the client.
 */

export type DeliverableType =
  | "longlist_report"
  | "prioritization_framework"
  | "conceptual_design"
  | "analytical_logic_model"
  | "data_requirements"
  | "reference_workflows"
  | "capability_framework"
  | "risk_assumption_register"
  | "governance_document"
  | "portfolio_roadmap"
  | "integration_notes"
  | "handover_package";

export const DELIVERABLE_META: Record<
  DeliverableType,
  { order: number; label: string; description: string; existingRoute?: string }
> = {
  longlist_report: {
    order: 1,
    label: "AI Use Case Identification and Longlist Report",
    description: "Curated list of AI use cases relevant to your organisation.",
    existingRoute: "/repository",
  },
  prioritization_framework: {
    order: 2,
    label: "AI Use Case Assessment and Prioritization Framework",
    description: "5-pillar feasibility scoring and value × complexity prioritization.",
    existingRoute: "/studio/use-case/$id/feasibility",
  },
  conceptual_design: {
    order: 3,
    label: "AI Use Case Conceptual Design Documents",
    description: "Structured 19-section Blueprint for funding and governance.",
    existingRoute: "/studio/use-case/$id/blueprint",
  },
  analytical_logic_model: {
    order: 4,
    label: "AI Analytical Logic Models",
    description: "Prediction target, features, model approach, output schema, feedback loop.",
  },
  data_requirements: {
    order: 5,
    label: "AI Data Requirements Definition",
    description: "Data sources, quality, accessibility, ownership, and mitigation plan.",
    existingRoute: "/studio/use-case/$id/data-readiness",
  },
  reference_workflows: {
    order: 6,
    label: "AI Reference Workflows and Process Diagrams",
    description: "Before and after swim-lane process flows with AI integration points.",
  },
  capability_framework: {
    order: 7,
    label: "AI Capability Requirement Framework",
    description: "Strategy, data, people, technology, governance capability inventory.",
  },
  risk_assumption_register: {
    order: 8,
    label: "AI Risk and Assumption Register",
    description: "Itemized risks and assumptions with likelihood, impact, owner, mitigation.",
  },
  governance_document: {
    order: 9,
    label: "AI Governance Considerations Document",
    description: "C3G risk class, controls, regulatory frameworks, and approval workflow.",
    existingRoute: "/studio/use-case/$id/c3g-governance",
  },
  portfolio_roadmap: {
    order: 10,
    label: "AI Use Case Portfolio Roadmap",
    description: "Sequenced phases, dependencies, value gates, and horizon planning.",
  },
  integration_notes: {
    order: 11,
    label: "AI Integration Consideration Notes (Generic)",
    description: "Source systems, authentication, data formats, SLA, error handling.",
  },
  handover_package: {
    order: 12,
    label: "Final Handover and Knowledge Transfer Package",
    description: "Bundled deliverables plus runbook, contacts, decision log, and lessons learned.",
  },
};

export const DELIVERABLE_ORDER = Object.keys(DELIVERABLE_META).sort(
  (a, b) =>
    DELIVERABLE_META[a as DeliverableType].order - DELIVERABLE_META[b as DeliverableType].order,
) as DeliverableType[];

export type DeliverableStatus = "not_started" | "draft" | "ready";

/* ---------- Content schemas per deliverable type (jsonb) ---------- */

export interface AnalyticalLogicModelContent {
  predictionTarget: string;
  inputs: string; // features
  outputFormat: string;
  thresholds: string;
  modelFamily: string;
  trainingApproach: string;
  validationApproach: string;
  feedbackLoop: string;
}

export interface ReferenceWorkflowStep {
  stepNumber: number;
  actor: string;
  action: string;
  aiIntegration: boolean;
  notes: string;
}

export interface ReferenceWorkflowsContent {
  beforeSteps: ReferenceWorkflowStep[];
  afterSteps: ReferenceWorkflowStep[];
  notes: string;
}

export interface CapabilityEntry {
  domain: string;
  capability: string;
  currentLevel: number; // 1–5
  requiredLevel: number;
  gap: string;
  buildBuyPartner: "build" | "buy" | "partner" | "";
}

export interface CapabilityFrameworkContent {
  entries: CapabilityEntry[];
  notes: string;
}

export interface RiskRow {
  id: string;
  type: "risk" | "assumption";
  description: string;
  likelihood: number; // 1–5
  impact: number; // 1–5
  score: number;
  owner: string;
  mitigationAction: string;
  residualRisk: string;
  reviewDate: string;
}

export interface RiskAssumptionRegisterContent {
  rows: RiskRow[];
}

export interface PortfolioRoadmapContent {
  phases: {
    name: string;
    useCases: string[];
    startDate: string;
    endDate: string;
    valueGate: string;
  }[];
  notes: string;
}

export interface IntegrationNotesContent {
  sourceSystems: string;
  authMethod: string;
  dataFormats: string;
  latencySLA: string;
  errorHandling: string;
  middleware: string;
  notes: string;
}

export interface HandoverPackageContent {
  runbook: string;
  contacts: string;
  decisionLog: string;
  lessonsLearned: string;
  includedDeliverables: DeliverableType[];
}
