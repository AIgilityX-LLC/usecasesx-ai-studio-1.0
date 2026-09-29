/**
 * Reviewed pattern-template catalogue (V2-19 / FR-01).
 * Every entry is a reusable shape — no client names, no ROI figures, no invented outcomes.
 * Seed SQL is generated from this list so code and DB stay aligned.
 */

import type { SectorContext, TemplateKind } from "./model";
import { SECTOR_CONTEXTS, TEMPLATE_KINDS } from "./model";

export type PatternTemplateSeed = {
  slug: string;
  title: string;
  summary: string;
  businessProblem: string;
  templateKind: TemplateKind;
  sectorContext: SectorContext;
  /** Metric *categories* only — never numeric claims. */
  kpiCategories: string[];
  /** Control themes to consider — not certifications. */
  controlThemes: string[];
  licenseUsageNote: string;
  provenanceNote: string;
};

const LICENSE =
  "UseCasesX™ editorial pattern template. Free to adapt inside a licensed workspace. Do not republish as a verified case study without independent attribution.";

const PROVENANCE =
  "AIgilityX editorial pattern. Reviewed for structure and honesty. Contains no client names and no measured outcomes.";

function tpl(
  kind: TemplateKind,
  sector: SectorContext,
  title: string,
  summary: string,
  businessProblem: string,
  kpiCategories: string[],
  controlThemes: string[],
): PatternTemplateSeed {
  return {
    slug: `${kind}-${sector}`.replace(/_/g, "-"),
    title,
    summary,
    businessProblem,
    templateKind: kind,
    sectorContext: sector,
    kpiCategories,
    controlThemes,
    licenseUsageNote: LICENSE,
    provenanceNote: PROVENANCE,
  };
}

/**
 * 6 modalities × 5 sector contexts = 30 reviewed templates.
 * Titles describe capability shapes, not engagements.
 */
export const PATTERN_TEMPLATE_SEEDS: PatternTemplateSeed[] = [
  // —— GenAI ——
  tpl(
    "genai",
    "enterprise",
    "Enterprise GenAI drafting with human approval",
    "Draft internal communications or documents with mandatory human review before release.",
    "Knowledge workers spend disproportionate time on first drafts of routine documents.",
    ["cycle time to first draft", "human edit rate", "policy exception rate"],
    ["human approval gate", "prompt/output logging", "data-classification filter"],
  ),
  tpl(
    "genai",
    "sme",
    "SME customer-reply drafting assistant",
    "Suggest reply drafts for common customer questions; agent always sends the final message.",
    "Small teams lack capacity to answer repetitive inquiries consistently.",
    ["time to first response", "reply acceptance rate"],
    ["PII redaction", "human send control", "tone/brand checklist"],
  ),
  tpl(
    "genai",
    "government",
    "Public-service correspondence drafting",
    "Assist caseworkers drafting citizen correspondence with mandatory supervisor release.",
    "Case volumes create backlog on routine correspondence.",
    ["correspondence backlog", "supervisor rejection rate"],
    ["records retention", "accessibility review", "appeal path"],
  ),
  tpl(
    "genai",
    "defense",
    "Mission planning narrative assistant (non-operational)",
    "Support staff officers drafting planning narratives offline from operational systems.",
    "Planning staff spend time reformatting known inputs into narrative form.",
    ["staff hours on narrative packaging"],
    ["air-gap / offline mode", "classification boundary", "no autonomous action"],
  ),
  tpl(
    "genai",
    "regulated_industry",
    "Regulated disclosure draft assistant",
    "Help prepare first drafts of regulated disclosures; compliance owns release.",
    "Disclosure cycles consume scarce compliance capacity on formatting and first pass.",
    ["draft turnaround", "compliance rework rate"],
    ["regulated lexicon filter", "dual control release", "audit trail"],
  ),

  // —— RAG ——
  tpl(
    "rag",
    "enterprise",
    "Enterprise policy Q&A over approved corpus",
    "Answer employee questions only from a curated, versioned policy corpus with citations.",
    "Employees cannot reliably find the current approved policy answer.",
    ["citation coverage", "unsupported-answer rate", "time-to-answer"],
    ["corpus ACL", "citation required", "stale-document flag"],
  ),
  tpl(
    "rag",
    "sme",
    "SME product-handbook assistant",
    "Retrieve answers from the company's product handbook with source links.",
    "New hires and partners ask the same handbook questions repeatedly.",
    ["deflection of repeat questions", "handbook hit rate"],
    ["single source of truth", "no external web browse"],
  ),
  tpl(
    "rag",
    "government",
    "Citizen guidance retrieval with citations",
    "Retrieve published guidance for citizens with clear citations and 'not legal advice' notice.",
    "Citizens struggle to navigate fragmented published guidance.",
    ["citation presence", "escalation to human rate"],
    ["published-corpus only", "disclaimer", "language accessibility"],
  ),
  tpl(
    "rag",
    "defense",
    "Doctrine library retrieval (classified-aware)",
    "Retrieve from an authorized doctrine library; refuse out-of-corpus questions.",
    "Staff lose time locating the correct doctrine excerpt.",
    ["retrieval precision proxies", "refuse rate for OOD queries"],
    ["classification labels", "need-to-know ACL", "no generative freestyle"],
  ),
  tpl(
    "rag",
    "regulated_industry",
    "Procedure retrieval for frontline staff",
    "Return the current approved procedure step with version stamp.",
    "Frontline staff risk using outdated printed procedures.",
    ["version match rate", "procedure open-to-action time"],
    ["version pinning", "offline cache policy", "change notification"],
  ),

  // —— Predictive ML ——
  tpl(
    "predictive_ml",
    "enterprise",
    "Enterprise demand / workload forecast support",
    "Produce forecasts as decision support; planners own the plan.",
    "Planners lack timely signal on demand shifts.",
    ["forecast residual error band", "planner override rate"],
    ["feature lineage", "drift monitoring", "human plan ownership"],
  ),
  tpl(
    "predictive_ml",
    "sme",
    "SME inventory replenishment signal",
    "Flag SKUs likely to stock out; purchasing confirms orders.",
    "Stockouts and overstock both hurt cash and service.",
    ["stockout incidents", "excess inventory days"],
    ["supplier lead-time assumptions documented", "human order confirm"],
  ),
  tpl(
    "predictive_ml",
    "government",
    "Service demand forecast for staffing",
    "Forecast expected service volumes to inform staffing — not automated rostering.",
    "Demand spikes create citizen wait times.",
    ["wait-time trend", "forecast vs actual band"],
    ["fairness review", "no automated denial of service"],
  ),
  tpl(
    "predictive_ml",
    "defense",
    "Logistics demand signal (support systems)",
    "Estimate consumable demand for logistics planning with human confirmation.",
    "Logistics planners need earlier demand signals for consumables.",
    ["fill-rate trend", "planner acceptance"],
    ["non-operational scope", "model card", "human confirmation"],
  ),
  tpl(
    "predictive_ml",
    "regulated_industry",
    "Risk-score decision support (non-binding)",
    "Surface a risk score to underwriters/analysts; humans make the decision.",
    "Analysts need consistent risk signals without ceding authority.",
    ["override rate", "documentation completeness"],
    ["explainability summary", "adverse-action process", "model monitoring"],
  ),

  // —— Computer vision ——
  tpl(
    "computer_vision",
    "enterprise",
    "Enterprise visual inspection assist",
    "Flag potential defects on a line; quality engineers confirm disposition.",
    "Manual inspection misses intermittent defects under volume.",
    ["false-positive rate band", "engineer confirm latency"],
    ["lighting/calibration SOP", "human disposition", "privacy of workers"],
  ),
  tpl(
    "computer_vision",
    "sme",
    "SME shelf / stock visual check",
    "Detect empty shelf facings from store cameras or handheld photos for staff follow-up.",
    "Small retailers lack continuous shelf auditing capacity.",
    ["facing gap detection rate", "staff follow-up completion"],
    ["camera purpose notice", "no biometric ID", "human restock action"],
  ),
  tpl(
    "computer_vision",
    "government",
    "Infrastructure condition photo triage",
    "Triage citizen/inspector photos of infrastructure issues for work-order queueing.",
    "Inspection photo backlogs delay maintenance prioritization.",
    ["triage latency", "misroute rate"],
    ["geolocation minimization", "human work-order create"],
  ),
  tpl(
    "computer_vision",
    "defense",
    "Equipment condition assist (non-targeting)",
    "Assist maintainers reviewing equipment condition imagery; no targeting use.",
    "Maintainers need consistent first-pass condition cues.",
    ["maintainer acceptance", "rework after assist"],
    ["explicit non-targeting scope", "classification handling"],
  ),
  tpl(
    "computer_vision",
    "regulated_industry",
    "Safety PPE compliance assist",
    "Flag possible PPE non-compliance for supervisor follow-up — not automated discipline.",
    "Safety teams cannot watch every zone continuously.",
    ["flag precision proxies", "supervisor follow-up rate"],
    ["no automated sanctions", "worker notice", "retention limits"],
  ),

  // —— Automation ——
  tpl(
    "automation",
    "enterprise",
    "Enterprise invoice field extraction + queue",
    "Extract invoice fields into AP queue; clerks confirm before posting.",
    "AP clerks re-key high volumes of similar invoices.",
    ["straight-through candidate rate", "clerk correction rate"],
    ["dual control posting", "vendor master checks"],
  ),
  tpl(
    "automation",
    "sme",
    "SME order-status status sync",
    "Push order status updates from system of record to customer channels with templates.",
    "Owners manually copy status into email/chat.",
    ["manual status touches", "customer chase messages"],
    ["template approval", "PII minimization"],
  ),
  tpl(
    "automation",
    "government",
    "Form intake validation assist",
    "Validate required fields and attachments on intake forms before case creation.",
    "Incomplete submissions create rework loops for citizens and staff.",
    ["incomplete submission rate", "rework cycles"],
    ["accessibility", "clear error messages", "human exception path"],
  ),
  tpl(
    "automation",
    "defense",
    "Support-ticket routing assist",
    "Suggest ticket routing for IT/support desks; agents confirm assignment.",
    "Misrouted tickets delay resolution.",
    ["first-route accuracy proxies", "agent override rate"],
    ["no auto-close", "audit of overrides"],
  ),
  tpl(
    "automation",
    "regulated_industry",
    "KYC document checklist automation",
    "Check that required KYC documents are present before analyst review.",
    "Analysts waste time on incomplete KYC packs.",
    ["pack completeness rate", "analyst idle waits"],
    ["retention rules", "human KYC decision"],
  ),

  // —— Agentic ——
  tpl(
    "agentic_workflow",
    "enterprise",
    "Enterprise research agent with human checkpoints",
    "Agent gathers internal sources into a brief; human approves any external send or action.",
    "Analysts spend cycles assembling known internal sources.",
    ["brief assembly time", "checkpoint rejection rate"],
    ["tool allow-list", "kill switch", "action limits"],
  ),
  tpl(
    "agentic_workflow",
    "sme",
    "SME scheduling agent (propose only)",
    "Propose meeting or job slots; human confirms bookings.",
    "Owners lose time coordinating schedules across channels.",
    ["propose-to-confirm latency", "cancelled proposes"],
    ["no silent booking", "calendar write gated"],
  ),
  tpl(
    "agentic_workflow",
    "government",
    "Case preparation agent with officer control",
    "Assemble case packs from approved systems; officer decides next step.",
    "Officers spend time gathering the same case artifacts repeatedly.",
    ["pack completeness", "officer edit distance"],
    ["segregation of duties", "no auto-decision", "audit log"],
  ),
  tpl(
    "agentic_workflow",
    "defense",
    "Logistics coordination agent (advisory)",
    "Propose logistics coordination steps inside policy bounds; human executes.",
    "Coordination overhead slows routine logistics tasks.",
    ["proposal acceptance", "policy violation blocks"],
    ["sandbox", "kill switch", "no weapon/targeting tools"],
  ),
  tpl(
    "agentic_workflow",
    "regulated_industry",
    "Compliance evidence gathering agent",
    "Collect evidence artifacts for a control test; compliance reviewer closes the finding.",
    "Evidence chase consumes audit cycles.",
    ["evidence pack lead time", "re-open rate"],
    ["read-only connectors preferred", "human close only"],
  ),
];

/** Guard: catalogue must cover every kind × sector pair exactly once. */
export function templateCoverageGaps(): string[] {
  const have = new Set(PATTERN_TEMPLATE_SEEDS.map((t) => `${t.templateKind}:${t.sectorContext}`));
  const gaps: string[] = [];
  for (const kind of TEMPLATE_KINDS) {
    for (const sector of SECTOR_CONTEXTS) {
      const key = `${kind}:${sector}`;
      if (!have.has(key)) gaps.push(key);
    }
  }
  return gaps;
}

export function templatesFor(
  kind?: TemplateKind | null,
  sector?: SectorContext | null,
): PatternTemplateSeed[] {
  return PATTERN_TEMPLATE_SEEDS.filter(
    (t) => (!kind || t.templateKind === kind) && (!sector || t.sectorContext === sector),
  );
}
