// Mock data layer for UseCaseX Explore.
// Replace with Supabase-backed createServerFn later.

export type Level = "Low" | "Medium" | "High";
export type Risk = "Low" | "Medium" | "High" | "Critical";
export type Maturity = "Beginner" | "Intermediate" | "Advanced";
export type TTV = "Short" | "Medium" | "Long";
export type Sector = "public" | "private" | "both";

export interface MockPlatform { slug: string; name: string }

export interface MockUseCase {
  id: string;
  slug: string;
  title: string;
  summary: string;
  industry: { slug: string; name: string };
  businessFunction: string;
  aiType: string;
  objective: string;
  valuePotential: Level;
  complexity: Level;
  riskLevel: Risk;
  maturity: Maturity;
  timeToValue: TTV;
  platforms: MockPlatform[];
  publishedAt: string; // ISO
  // Derived after decoration:
  sector: Sector;
  tags: string[];
}

const P = {
  sarpi:      { slug: "sarpi", name: "SARPI™" },
  cyberx:     { slug: "cyberx", name: "CyberX C3G™" },
  advisorx:   { slug: "advisorx", name: "AdvisorX™" },
  flowx:      { slug: "flowx", name: "FlowX™" },
  privacyx:   { slug: "privacyx", name: "PrivacyX™" },
  assurex:    { slug: "assurex", name: "AssureX™" },
  auditx:     { slug: "auditx", name: "AuditX™" },
  regulatorx: { slug: "regulatorx", name: "RegulatorX™" },
  complyx:    { slug: "complyx", name: "ComplyX™" },
  ares:       { slug: "ares", name: "ARES™" },
  conversx:   { slug: "conversx", name: "ConversX™" },
  simulax:    { slug: "simulax", name: "SimulaX™" },
  roi:        { slug: "roi", name: "AI ROI Calculator" },
} as const;

const I = (slug: string, name: string) => ({ slug, name });

type RawUseCase = Omit<MockUseCase, "sector" | "tags">;

const RAW_USE_CASES: RawUseCase[] = [
  // 1. Defense
  { id: "1", slug: "defense-threat-intel-fusion",
    title: "Multi-source threat intelligence fusion",
    summary: "Fuse open-source, satellite and sensor feeds into a unified threat picture for command teams.",
    industry: I("defense", "Defense"),
    businessFunction: "Intelligence Operations", aiType: "Multimodal AI",
    objective: "Decision Support", valuePotential: "High", complexity: "High",
    riskLevel: "Critical", maturity: "Intermediate", timeToValue: "Long",
    platforms: [P.sarpi, P.cyberx, P.ares], publishedAt: "2026-05-22" },

  // 2. Healthcare
  { id: "2", slug: "clinical-triage-copilot",
    title: "AI clinical triage copilot",
    summary: "Assist clinicians at intake with risk scoring and protocol suggestions from EHR + vitals.",
    industry: I("healthcare", "Healthcare"),
    businessFunction: "Clinical Operations", aiType: "Predictive Analytics",
    objective: "Quality Improvement", valuePotential: "High", complexity: "Medium",
    riskLevel: "High", maturity: "Intermediate", timeToValue: "Medium",
    platforms: [P.advisorx, P.privacyx, P.assurex], publishedAt: "2026-05-21" },

  // 3. Real Estate
  { id: "3", slug: "real-estate-valuation-agent",
    title: "Agentic property valuation",
    summary: "GenAI agent that compiles AVM, comps, planning data and rental yields into a deal memo.",
    industry: I("real-estate", "Real Estate"),
    businessFunction: "Investment Analysis", aiType: "LLM Agents",
    objective: "Revenue Growth", valuePotential: "Medium", complexity: "Medium",
    riskLevel: "Medium", maturity: "Beginner", timeToValue: "Short",
    platforms: [P.advisorx, P.flowx], publishedAt: "2026-05-20" },

  // 4. Manufacturing
  { id: "4", slug: "manufacturing-predictive-maintenance",
    title: "Predictive maintenance for production lines",
    summary: "Predict equipment failures from sensor telemetry and schedule preventive interventions.",
    industry: I("manufacturing", "Manufacturing"),
    businessFunction: "Operations & Maintenance", aiType: "Time-Series Forecasting",
    objective: "Operational Efficiency", valuePotential: "High", complexity: "Medium",
    riskLevel: "Medium", maturity: "Advanced", timeToValue: "Medium",
    platforms: [P.sarpi, P.flowx], publishedAt: "2026-05-19" },

  // 5. Pharmaceuticals
  { id: "5", slug: "pharma-trial-protocol-generation",
    title: "GenAI for clinical trial protocol drafting",
    summary: "Draft and harmonize trial protocols against historical successes and regulator templates.",
    industry: I("pharma", "Pharmaceuticals"),
    businessFunction: "R&D", aiType: "Generative AI",
    objective: "Time-to-Market", valuePotential: "High", complexity: "High",
    riskLevel: "High", maturity: "Beginner", timeToValue: "Long",
    platforms: [P.advisorx, P.regulatorx, P.complyx], publishedAt: "2026-05-18" },

  // 6. Transport & Travel
  { id: "6", slug: "transport-dynamic-pricing",
    title: "Dynamic pricing for multi-modal travel",
    summary: "Optimize fares across rail, road and ferry based on demand, weather and capacity signals.",
    industry: I("transport-travel", "Transport & Travel"),
    businessFunction: "Revenue Management", aiType: "Reinforcement Learning",
    objective: "Revenue Growth", valuePotential: "High", complexity: "High",
    riskLevel: "Medium", maturity: "Intermediate", timeToValue: "Medium",
    platforms: [P.advisorx, P.flowx], publishedAt: "2026-05-17" },

  // 7. Airlines & Aviation
  { id: "7", slug: "aviation-crew-rostering",
    title: "AI crew rostering & disruption recovery",
    summary: "Optimize crew schedules under regulatory constraints; auto-recover from irregular operations.",
    industry: I("airlines-aviation", "Airlines & Aviation"),
    businessFunction: "Flight Operations", aiType: "Decision Intelligence",
    objective: "Operational Efficiency", valuePotential: "High", complexity: "High",
    riskLevel: "High", maturity: "Intermediate", timeToValue: "Long",
    platforms: [P.flowx, P.sarpi, P.simulax], publishedAt: "2026-05-16" },

  // 8. Food & Agribusiness
  { id: "8", slug: "agri-yield-forecasting",
    title: "Crop yield forecasting from satellite + weather",
    summary: "Forecast crop yields and procurement needs using multispectral imagery and climate models.",
    industry: I("food-agribusiness", "Food & Agribusiness"),
    businessFunction: "Supply Planning", aiType: "Computer Vision",
    objective: "Sustainability", valuePotential: "Medium", complexity: "Medium",
    riskLevel: "Low", maturity: "Intermediate", timeToValue: "Medium",
    platforms: [P.advisorx, P.flowx], publishedAt: "2026-05-15" },

  // 9. Retail & E-Commerce
  { id: "9", slug: "retail-personalization-engine",
    title: "Real-time personalization across channels",
    summary: "Unify web, app and store signals into a recommender that lifts basket value and retention.",
    industry: I("retail", "Retail & E-Commerce"),
    businessFunction: "Marketing & CX", aiType: "Recommender Systems",
    objective: "Personalization", valuePotential: "High", complexity: "Medium",
    riskLevel: "Low", maturity: "Advanced", timeToValue: "Short",
    platforms: [P.flowx, P.advisorx], publishedAt: "2026-05-14" },

  // 10. Education & Academia
  { id: "10", slug: "education-adaptive-tutor",
    title: "Adaptive learning tutor for STEM",
    summary: "LLM tutor that adapts question difficulty and explanation depth to each learner's mastery.",
    industry: I("education", "Education & Academia"),
    businessFunction: "Teaching & Learning", aiType: "LLM Agents",
    objective: "Quality Improvement", valuePotential: "Medium", complexity: "Medium",
    riskLevel: "Medium", maturity: "Beginner", timeToValue: "Medium",
    platforms: [P.conversx, P.assurex], publishedAt: "2026-05-13" },

  // 11. Media & Entertainment
  { id: "11", slug: "media-content-localization",
    title: "AI content localization & dubbing",
    summary: "Translate, voice-clone and re-time content across 30+ languages with brand-safe controls.",
    industry: I("media", "Media & Entertainment"),
    businessFunction: "Content Production", aiType: "Generative AI",
    objective: "Time-to-Market", valuePotential: "High", complexity: "Medium",
    riskLevel: "Medium", maturity: "Intermediate", timeToValue: "Short",
    platforms: [P.flowx, P.assurex, P.privacyx], publishedAt: "2026-05-12" },

  // 12. Automotive & Industrial
  { id: "12", slug: "automotive-warranty-anomaly",
    title: "Warranty claim anomaly detection",
    summary: "Detect dealer fraud and emerging quality defects in warranty claims before they scale.",
    industry: I("automotive", "Automotive & Industrial"),
    businessFunction: "Aftersales & Quality", aiType: "Anomaly Detection",
    objective: "Cost Reduction", valuePotential: "Medium", complexity: "Low",
    riskLevel: "Low", maturity: "Advanced", timeToValue: "Short",
    platforms: [P.sarpi, P.auditx], publishedAt: "2026-05-11" },

  // 13. Supply Chain & Logistics
  { id: "13", slug: "logistics-control-tower",
    title: "AI supply chain control tower",
    summary: "Real-time ETA, exception detection and what-if rerouting across multi-tier suppliers.",
    industry: I("logistics", "Supply Chain & Logistics"),
    businessFunction: "Supply Chain", aiType: "Decision Intelligence",
    objective: "Operational Efficiency", valuePotential: "High", complexity: "High",
    riskLevel: "Medium", maturity: "Intermediate", timeToValue: "Long",
    platforms: [P.flowx, P.sarpi, P.simulax], publishedAt: "2026-05-10" },

  // 14. Regulatory & Compliance
  { id: "14", slug: "regulatory-horizon-scanning",
    title: "Regulatory horizon-scanning agent",
    summary: "Continuously monitor 200+ regulators, classify changes and route impact to control owners.",
    industry: I("regulatory-compliance", "Regulatory & Compliance"),
    businessFunction: "Compliance", aiType: "RAG",
    objective: "Regulatory Reporting", valuePotential: "High", complexity: "Medium",
    riskLevel: "Medium", maturity: "Beginner", timeToValue: "Short",
    platforms: [P.regulatorx, P.complyx, P.advisorx], publishedAt: "2026-05-09" },

  // 15. Law Enforcement
  { id: "15", slug: "law-enforcement-case-summarization",
    title: "Investigation case summarization",
    summary: "Summarize evidence, statements and prior cases into investigator-ready briefs with citations.",
    industry: I("law-enforcement", "Law Enforcement Agencies"),
    businessFunction: "Investigations", aiType: "RAG",
    objective: "Decision Support", valuePotential: "High", complexity: "Medium",
    riskLevel: "Critical", maturity: "Beginner", timeToValue: "Medium",
    platforms: [P.privacyx, P.assurex, P.ares], publishedAt: "2026-05-08" },

  // 16. Government & Public Sector
  { id: "16", slug: "government-citizen-services-agent",
    title: "Citizen services AI assistant",
    summary: "Multilingual GenAI assistant for permits, benefits and tax queries with full audit trail.",
    industry: I("government", "Government & Public Sector"),
    businessFunction: "Citizen Services", aiType: "Conversational AI",
    objective: "Citizen Services", valuePotential: "High", complexity: "Medium",
    riskLevel: "High", maturity: "Intermediate", timeToValue: "Medium",
    platforms: [P.conversx, P.privacyx, P.assurex], publishedAt: "2026-05-07" },

  // 17. Hospitality, Gaming & Leisure
  { id: "17", slug: "hospitality-revenue-management",
    title: "AI revenue management for hotels",
    summary: "Forecast demand and optimize rates and inventory across direct and OTA channels.",
    industry: I("hospitality", "Hospitality, Gaming & Leisure"),
    businessFunction: "Revenue Management", aiType: "Predictive Analytics",
    objective: "Revenue Growth", valuePotential: "High", complexity: "Medium",
    riskLevel: "Low", maturity: "Advanced", timeToValue: "Short",
    platforms: [P.advisorx, P.flowx], publishedAt: "2026-05-06" },

  // 18. Banking, Finance & Insurance
  { id: "18", slug: "banking-fraud-detection-real-time",
    title: "Real-time fraud detection",
    summary: "Stream transactions through graph + ML models to block fraud in under 50ms.",
    industry: I("banking", "Banking, Finance & Insurance"),
    businessFunction: "Risk & Fraud", aiType: "Anomaly Detection",
    objective: "Fraud Prevention", valuePotential: "High", complexity: "High",
    riskLevel: "High", maturity: "Advanced", timeToValue: "Medium",
    platforms: [P.sarpi, P.cyberx, P.assurex], publishedAt: "2026-05-05" },

  // ---- Extras (industries repeated for depth) ----

  // 19. Banking – credit underwriting
  { id: "19", slug: "banking-ai-credit-underwriting",
    title: "AI-assisted SME credit underwriting",
    summary: "Augment underwriters with explainable scoring and document AI on financial statements.",
    industry: I("banking", "Banking, Finance & Insurance"),
    businessFunction: "Credit & Lending", aiType: "OCR / Document AI",
    objective: "Revenue Growth", valuePotential: "High", complexity: "Medium",
    riskLevel: "High", maturity: "Intermediate", timeToValue: "Medium",
    platforms: [P.advisorx, P.assurex, P.complyx], publishedAt: "2026-05-04" },

  // 20. Healthcare – radiology triage
  { id: "20", slug: "healthcare-radiology-triage",
    title: "Radiology image triage",
    summary: "Computer vision pre-reads chest X-rays and prioritizes urgent findings for radiologists.",
    industry: I("healthcare", "Healthcare"),
    businessFunction: "Diagnostics", aiType: "Computer Vision",
    objective: "Quality Improvement", valuePotential: "High", complexity: "High",
    riskLevel: "High", maturity: "Advanced", timeToValue: "Long",
    platforms: [P.assurex, P.privacyx, P.regulatorx], publishedAt: "2026-05-03" },

  // 21. Government – tax fraud
  { id: "21", slug: "government-tax-fraud-detection",
    title: "Tax fraud network detection",
    summary: "Graph-based detection of collusion rings across VAT and corporate tax filings.",
    industry: I("government", "Government & Public Sector"),
    businessFunction: "Tax & Revenue", aiType: "Knowledge Graphs",
    objective: "Fraud Prevention", valuePotential: "High", complexity: "High",
    riskLevel: "High", maturity: "Intermediate", timeToValue: "Long",
    platforms: [P.sarpi, P.cyberx, P.complyx], publishedAt: "2026-05-02" },

  // 22. Defense – autonomous ISR
  { id: "22", slug: "defense-autonomous-isr",
    title: "Autonomous ISR drone fleet coordination",
    summary: "Coordinate ISR drone swarms for persistent surveillance with human-on-the-loop governance.",
    industry: I("defense", "Defense"),
    businessFunction: "ISR Operations", aiType: "Reinforcement Learning",
    objective: "Decision Support", valuePotential: "High", complexity: "High",
    riskLevel: "Critical", maturity: "Beginner", timeToValue: "Long",
    platforms: [P.ares, P.simulax, P.assurex], publishedAt: "2026-05-01" },

  // 23. Logistics – warehouse robotics
  { id: "23", slug: "logistics-warehouse-vision-robotics",
    title: "Warehouse vision + robotics orchestration",
    summary: "Pair CV-based slotting with autonomous mobile robots to lift pick rate by 30–60%.",
    industry: I("logistics", "Supply Chain & Logistics"),
    businessFunction: "Warehouse Ops", aiType: "Computer Vision",
    objective: "Operational Efficiency", valuePotential: "High", complexity: "High",
    riskLevel: "Medium", maturity: "Intermediate", timeToValue: "Long",
    platforms: [P.flowx, P.simulax], publishedAt: "2026-04-30" },

  // 24. Retail – inventory forecasting
  { id: "24", slug: "retail-store-level-forecasting",
    title: "Store-level demand forecasting",
    summary: "SKU-store demand forecasts that cut stock-outs and markdowns across thousands of stores.",
    industry: I("retail", "Retail & E-Commerce"),
    businessFunction: "Merchandising", aiType: "Time-Series Forecasting",
    objective: "Cost Reduction", valuePotential: "Medium", complexity: "Medium",
    riskLevel: "Low", maturity: "Advanced", timeToValue: "Medium",
    platforms: [P.flowx, P.advisorx], publishedAt: "2026-04-29" },
];

// ----- Facet taxonomies derived from mock data ----------------------------

function uniqueBy<T, K extends string>(arr: T[], key: (t: T) => K): { slug: string; name: string }[] {
  const seen = new Set<string>();
  const out: { slug: string; name: string }[] = [];
  for (const x of arr) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ slug: k, name: k });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const MOCK_TAX = {
  industries: uniqueBy(MOCK_USE_CASES, (c) => c.industry.slug as string).map((x) => ({
    slug: x.slug,
    name: MOCK_USE_CASES.find((c) => c.industry.slug === x.slug)!.industry.name,
  })),
  capabilities: uniqueBy(MOCK_USE_CASES, (c) => c.aiType),
  businessFunctions: uniqueBy(MOCK_USE_CASES, (c) => c.businessFunction),
  objectives: uniqueBy(MOCK_USE_CASES, (c) => c.objective),
};

// ----- Filter & sort -------------------------------------------------------

export type SortKey = "relevant" | "value" | "complexity" | "risk" | "ttv" | "newest";

export interface MockFilters {
  q?: string;
  industries?: string[];
  capabilities?: string[];
  businessFunctions?: string[];
  objectives?: string[];
  valuePotential?: string[];
  complexity?: string[];
  riskLevel?: string[];
  maturity?: string[];
  timeToValue?: string[];
  sort?: SortKey;
}

const VALUE_RANK: Record<Level, number> = { High: 3, Medium: 2, Low: 1 };
const COMPLEXITY_RANK: Record<Level, number> = { Low: 1, Medium: 2, High: 3 };
const RISK_RANK: Record<Risk, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const TTV_RANK: Record<TTV, number> = { Short: 1, Medium: 2, Long: 3 };

const includesInsensitive = (hay: string | undefined, needle: string) =>
  !!hay && hay.toLowerCase().includes(needle);

export function filterAndSortMock(f: MockFilters): MockUseCase[] {
  const q = (f.q ?? "").trim().toLowerCase();
  const sel = (xs?: string[]) => (xs && xs.length ? xs : null);

  const inds = sel(f.industries);
  const caps = sel(f.capabilities);
  const bfns = sel(f.businessFunctions);
  const objs = sel(f.objectives);
  const vps = sel(f.valuePotential);
  const cxs = sel(f.complexity);
  const rsk = sel(f.riskLevel);
  const mat = sel(f.maturity);
  const ttv = sel(f.timeToValue);

  let out = MOCK_USE_CASES.filter((c) => {
    if (q && !(includesInsensitive(c.title, q) || includesInsensitive(c.summary, q) || includesInsensitive(c.businessFunction, q) || includesInsensitive(c.aiType, q) || includesInsensitive(c.industry.name, q))) return false;
    if (inds && !inds.includes(c.industry.slug)) return false;
    if (caps && !caps.includes(c.aiType)) return false;
    if (bfns && !bfns.includes(c.businessFunction)) return false;
    if (objs && !objs.includes(c.objective)) return false;
    if (vps && !vps.includes(c.valuePotential)) return false;
    if (cxs && !cxs.includes(c.complexity)) return false;
    if (rsk && !rsk.includes(c.riskLevel)) return false;
    if (mat && !mat.includes(c.maturity)) return false;
    if (ttv && !ttv.includes(c.timeToValue)) return false;
    return true;
  });

  const sort: SortKey = f.sort ?? "relevant";
  out = [...out].sort((a, b) => {
    switch (sort) {
      case "value":      return VALUE_RANK[b.valuePotential] - VALUE_RANK[a.valuePotential];
      case "complexity": return COMPLEXITY_RANK[a.complexity] - COMPLEXITY_RANK[b.complexity];
      case "risk":       return RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel];
      case "ttv":        return TTV_RANK[a.timeToValue] - TTV_RANK[b.timeToValue];
      case "newest":     return b.publishedAt.localeCompare(a.publishedAt);
      case "relevant":
      default:
        if (q) {
          const score = (c: MockUseCase) =>
            (includesInsensitive(c.title, q) ? 3 : 0) +
            (includesInsensitive(c.summary, q) ? 2 : 0) +
            (includesInsensitive(c.aiType, q) ? 1 : 0);
          return score(b) - score(a);
        }
        return 0;
    }
  });
  return out;
}
