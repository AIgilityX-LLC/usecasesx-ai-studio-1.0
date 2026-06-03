// Reusable hooks for UseCasesX™ Pro Dashboard.
// Mock-backed for now; swap internals for Supabase-backed createServerFn later
// without changing call sites.

import { useMemo } from "react";
import { MOCK_USE_CASES, type MockUseCase, type Level, type Risk } from "@/lib/usecasex.mock";

export interface SavedUseCase extends MockUseCase {
  savedAt: string;
  note?: string;
  priority: "Low" | "Medium" | "High";
}

export interface UseCaseScore {
  useCaseId: string;
  strategic: number;
  value: number;
  feasibility: number;
  risk: number;
  readiness: number;
  ttv: number;
  total: number; // 0-100
}

export interface Portfolio {
  id: string;
  name: string;
  objective: string;
  useCaseIds: string[];
}

export interface GeneratedReport {
  id: string;
  title: string;
  kind: "Executive PDF" | "Portfolio PDF" | "Roadmap PDF";
  createdAt: string;
  useCaseCount: number;
}

// --- Mock seed ---------------------------------------------------------
const SAVED_SLUGS = [
  "defense-threat-intel-fusion",
  "clinical-triage-copilot",
  "public-citizen-services-copilot",
  "energy-grid-load-forecasting",
  "telco-network-incident-rca",
  "retail-personalized-merchandising",
  "banking-aml-agent",
  "manufacturing-predictive-maintenance",
];

const PRIORITY_BY_INDEX: Array<SavedUseCase["priority"]> = [
  "High", "High", "Medium", "High", "Medium", "Low", "High", "Medium",
];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function scoreFor(uc: MockUseCase): UseCaseScore {
  const lvl = (l: Level) => (l === "High" ? 85 : l === "Medium" ? 60 : 35);
  const risk = (r: Risk) =>
    r === "Critical" ? 20 : r === "High" ? 40 : r === "Medium" ? 65 : 85;
  const ttv = uc.timeToValue === "Short" ? 85 : uc.timeToValue === "Medium" ? 60 : 35;
  const readiness = uc.maturity === "Advanced" ? 80 : uc.maturity === "Intermediate" ? 60 : 40;
  const feas = 100 - lvl(uc.complexity) + 25;
  const strategic = lvl(uc.valuePotential) + ((hash(uc.id) % 15) - 7);
  const value = lvl(uc.valuePotential);
  const total = Math.round(
    (strategic + value + feas + risk(uc.riskLevel) + readiness + ttv) / 6,
  );
  return {
    useCaseId: uc.id,
    strategic: Math.max(0, Math.min(100, strategic)),
    value,
    feasibility: Math.max(0, Math.min(100, feas)),
    risk: risk(uc.riskLevel),
    readiness,
    ttv,
    total: Math.max(0, Math.min(100, total)),
  };
}

// --- Hooks -------------------------------------------------------------
export function useSavedUseCases(): SavedUseCase[] {
  return useMemo(() => {
    return SAVED_SLUGS.map((slug, i) => {
      const uc = MOCK_USE_CASES.find((u) => u.slug === slug);
      if (!uc) return null;
      return {
        ...uc,
        savedAt: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
        priority: PRIORITY_BY_INDEX[i] ?? "Medium",
      } satisfies SavedUseCase;
    }).filter(Boolean) as SavedUseCase[];
  }, []);
}

export function useUseCaseScores(): UseCaseScore[] {
  const saved = useSavedUseCases();
  return useMemo(() => saved.map(scoreFor), [saved]);
}

export function usePortfolios(): Portfolio[] {
  const saved = useSavedUseCases();
  return useMemo(() => [
    { id: "p1", name: "Cost & Productivity", objective: "Operational efficiency",
      useCaseIds: saved.slice(0, 3).map((s) => s.id) },
    { id: "p2", name: "Customer Experience", objective: "CX uplift",
      useCaseIds: saved.slice(3, 6).map((s) => s.id) },
    { id: "p3", name: "Risk & Compliance", objective: "Govern AI risk",
      useCaseIds: saved.slice(6).map((s) => s.id) },
  ], [saved]);
}

export function useGeneratedReports(): GeneratedReport[] {
  return useMemo(() => [
    { id: "r1", title: "Q2 AI Opportunity Board Pack", kind: "Executive PDF",
      createdAt: "2026-05-12T09:00:00Z", useCaseCount: 8 },
    { id: "r2", title: "Cost & Productivity Portfolio", kind: "Portfolio PDF",
      createdAt: "2026-05-19T15:30:00Z", useCaseCount: 3 },
  ], []);
}
