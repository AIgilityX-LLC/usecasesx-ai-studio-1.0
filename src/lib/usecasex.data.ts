// UseCasesX data layer. Wraps real Supabase server functions for Lite/public reads;
// uses mock-first stubs for Pro features (saved, scored, portfolio) that will
// later be replaced with Supabase-backed createServerFn calls.

export type Tier = "lite" | "pro";

export interface Industry {
  slug: string;
  name: string;
  icon?: string;
}

export const INDUSTRIES: Industry[] = [
  { slug: "banking", name: "Banking & Finance" },
  { slug: "insurance", name: "Insurance" },
  { slug: "healthcare", name: "Healthcare" },
  { slug: "pharma", name: "Pharmaceuticals" },
  { slug: "government", name: "Government & Public Sector" },
  { slug: "defense", name: "Defense & Security" },
  { slug: "energy", name: "Energy & Utilities" },
  { slug: "telecom", name: "Telecommunications" },
  { slug: "manufacturing", name: "Manufacturing" },
  { slug: "automotive", name: "Automotive" },
  { slug: "retail", name: "Retail & E-commerce" },
  { slug: "logistics", name: "Logistics & Supply Chain" },
  { slug: "construction", name: "Construction & Real Estate" },
  { slug: "education", name: "Education" },
  { slug: "media", name: "Media & Entertainment" },
  { slug: "professional", name: "Professional Services" },
  { slug: "agriculture", name: "Agriculture" },
  { slug: "hospitality", name: "Hospitality & Travel" },
];

export const AI_TYPES = [
  "Generative AI", "LLM Agents", "Computer Vision", "NLP", "Predictive Analytics",
  "Recommender Systems", "Anomaly Detection", "Speech AI", "OCR / Document AI",
  "Reinforcement Learning", "Time-Series Forecasting", "Knowledge Graphs",
  "RAG", "Multimodal AI", "Synthetic Data", "AutoML", "Edge AI",
  "Conversational AI", "Process Mining AI", "Decision Intelligence",
];

export const BUSINESS_OBJECTIVES = [
  "Revenue Growth", "Cost Reduction", "Customer Experience", "Risk & Compliance",
  "Operational Efficiency", "Workforce Productivity", "Innovation",
  "Sustainability", "Data Monetization", "Cybersecurity", "Fraud Prevention",
  "Quality Improvement", "Time-to-Market", "Personalization",
  "Citizen Services", "Regulatory Reporting", "Decision Support",
];

export const HUB_MODULES = [
  { slug: "home", name: "Home", to: "/ai-hub" as const, live: true },
  { slug: "ai-readiness", name: "AI Readiness", to: "/ai-hub" as const, live: false },
  { slug: "roi-calculator", name: "AI ROI Calculator", to: "/ai-hub" as const, live: false },
  { slug: "usecasex", name: "UseCasesX", to: "/ai-hub/usecasex" as const, live: true },
  { slug: "strategy-canvas", name: "AI Strategy Canvas", to: "/ai-hub" as const, live: false },
  { slug: "governance", name: "AI Governance Toolkit", to: "/ai-hub" as const, live: false },
  { slug: "reports", name: "Reports", to: "/ai-hub" as const, live: false },
  { slug: "dashboard", name: "Dashboard", to: "/ai-hub" as const, live: false },
];

export const PARTNER_PLATFORMS = [
  { slug: "sarpi", name: "SARPI™", category: "Risk & Performance", color: "navy" },
  { slug: "cyberx", name: "CyberX C3G™", category: "Cyber Governance", color: "cyan" },
  { slug: "advisorx", name: "AdvisorX™", category: "AI Advisory", color: "blue" },
  { slug: "flowx", name: "FlowX™", category: "Process Automation", color: "navy" },
  { slug: "privacyx", name: "PrivacyX™", category: "Privacy & Data", color: "blue" },
  { slug: "assurex", name: "AssureX™", category: "Assurance", color: "navy" },
  { slug: "roi", name: "AI ROI Calculator", category: "Business Case", color: "cyan" },
  { slug: "auditx", name: "AuditX™", category: "AI Audit", color: "blue" },
  { slug: "regulatorx", name: "RegulatorX™", category: "Regulatory Intelligence", color: "navy" },
  { slug: "complyx", name: "ComplyX™", category: "Compliance Ops", color: "cyan" },
  { slug: "ares", name: "ARES™", category: "Adversarial Resilience", color: "navy" },
  { slug: "conversx", name: "ConversX™", category: "Conversational Intelligence", color: "blue" },
  { slug: "simulax", name: "SimulaX™", category: "AI Simulation", color: "cyan" },
] as const;

// ---- Pro-only mocks (swap for Supabase later) ----

export interface SavedItem { useCaseId: string; useCaseSlug: string; title: string; savedAt: string; }
export interface ScoreInputs {
  strategic: number; value: number; feasibility: number;
  risk: number; readiness: number; ttv: number;
}
export interface Portfolio {
  id: string; name: string; objective: string;
  itemCount: number; avgScore: number; updatedAt: string;
}

export const MOCK_SAVED: SavedItem[] = [
  { useCaseId: "1", useCaseSlug: "fraud-detection-real-time", title: "Real-time fraud detection for retail banking", savedAt: "2026-05-10" },
  { useCaseId: "2", useCaseSlug: "ai-citizen-services", title: "AI assistant for citizen services", savedAt: "2026-05-12" },
  { useCaseId: "3", useCaseSlug: "predictive-maintenance-energy", title: "Predictive maintenance for grid assets", savedAt: "2026-05-18" },
];

export const MOCK_PORTFOLIOS: Portfolio[] = [
  { id: "p1", name: "FY26 — Banking AI Roadmap", objective: "Risk & Compliance",
    itemCount: 12, avgScore: 78, updatedAt: "2026-05-20" },
  { id: "p2", name: "Public Sector — Citizen AI", objective: "Citizen Services",
    itemCount: 8, avgScore: 71, updatedAt: "2026-05-22" },
];

export function aigilityXScore(s: ScoreInputs): number {
  // Strategic 20 • Value 25 • Feasibility 20 • Risk(inv) 15 • Readiness 10 • TTV(inv) 10
  const ri = 5 - s.risk;
  const tt = 5 - s.ttv;
  const raw =
    s.strategic * 0.20 +
    s.value * 0.25 +
    s.feasibility * 0.20 +
    ri * 0.15 +
    s.readiness * 0.10 +
    tt * 0.10;
  return Math.round((raw / 5) * 100);
}
