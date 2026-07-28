// Client-side store for UseCasesX™ Pro saved use cases, scoring, and portfolios.
// Persisted via localStorage. Mock-first; swap for Supabase-backed serverFn later
// without changing the hook surface.

import { useCallback, useEffect, useState } from "react";

export type Priority = "Low" | "Medium" | "High" | "Strategic";

export interface ScoreDimensions {
  strategicAlignment: number; // 0-100
  valuePotential: number; // 0-100
  feasibility: number; // 0-100
  timeToValue: number; // 0-100
  riskManageability: number; // 0-100
  governanceReadiness: number; // 0-100
}

export const SCORE_WEIGHTS: Record<keyof ScoreDimensions, number> = {
  strategicAlignment: 0.2,
  valuePotential: 0.25,
  feasibility: 0.2,
  timeToValue: 0.15,
  riskManageability: 0.1,
  governanceReadiness: 0.1,
};

export const SCORE_LABELS: Record<keyof ScoreDimensions, string> = {
  strategicAlignment: "Strategic Alignment",
  valuePotential: "Value Potential",
  feasibility: "Feasibility",
  timeToValue: "Time to Value",
  riskManageability: "Risk Manageability",
  governanceReadiness: "Governance Readiness",
};

export interface SavedUseCaseEntry {
  useCaseSlug: string;
  savedAt: string;
  note?: string;
  priority: Priority;
  score?: ScoreDimensions;
}

export type PortfolioType =
  | "Quick Wins"
  | "Strategic Initiatives"
  | "High-Risk AI Systems"
  | "Agentic AI Opportunities"
  | "Department Roadmap"
  | "Board Priority Initiatives"
  | "Custom Portfolio";

export const PORTFOLIO_TYPES: PortfolioType[] = [
  "Quick Wins",
  "Strategic Initiatives",
  "High-Risk AI Systems",
  "Agentic AI Opportunities",
  "Department Roadmap",
  "Board Priority Initiatives",
  "Custom Portfolio",
];

export type PortfolioStatus =
  | "Draft"
  | "Under Review"
  | "Ready for Readiness"
  | "Ready for ROI"
  | "Ready for Governance"
  | "Ready for Pilot";

export const PORTFOLIO_STATUSES: PortfolioStatus[] = [
  "Draft",
  "Under Review",
  "Ready for Readiness",
  "Ready for ROI",
  "Ready for Governance",
  "Ready for Pilot",
];

export interface Portfolio {
  id: string;
  name: string;
  type: PortfolioType;
  status: PortfolioStatus;
  objective?: string;
  targetDepartment?: string;
  targetQuarter?: string;
  useCaseSlugs: string[];
  createdAt: string;
}

interface StoreShape {
  saved: SavedUseCaseEntry[];
  portfolios: Portfolio[];
}

const STORAGE_KEY = "usecasex.pro.store.v1";

function defaultState(): StoreShape {
  return {
    saved: [
      {
        useCaseSlug: "defense-threat-intel-fusion",
        savedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        priority: "Strategic",
        note: "Discuss with command staff.",
      },
      {
        useCaseSlug: "clinical-triage-copilot",
        savedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        priority: "High",
      },
      {
        useCaseSlug: "banking-aml-agent",
        savedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        priority: "High",
      },
      {
        useCaseSlug: "retail-personalized-merchandising",
        savedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        priority: "Medium",
      },
    ],
    portfolios: [
      {
        id: "p-quick-wins",
        name: "Q3 Quick Wins",
        type: "Quick Wins",
        status: "Draft",
        objective: "Deliver measurable AI value in 90 days",
        targetDepartment: "Operations",
        targetQuarter: "Q3 2026",
        useCaseSlugs: ["retail-personalized-merchandising"],
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function read(): StoreShape {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as StoreShape;
  } catch {
    return defaultState();
  }
}

function write(state: StoreShape) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("usecasex-store-change"));
}

export function computeTotalScore(s: ScoreDimensions | undefined): number {
  if (!s) return 0;
  const total =
    s.strategicAlignment * SCORE_WEIGHTS.strategicAlignment +
    s.valuePotential * SCORE_WEIGHTS.valuePotential +
    s.feasibility * SCORE_WEIGHTS.feasibility +
    s.timeToValue * SCORE_WEIGHTS.timeToValue +
    s.riskManageability * SCORE_WEIGHTS.riskManageability +
    s.governanceReadiness * SCORE_WEIGHTS.governanceReadiness;
  return Math.round(total);
}

export function interpretScore(total: number): { label: string; toneClass: string } {
  if (total >= 80)
    return {
      label: "High-priority quick win or strategic use case",
      toneClass: "text-emerald-600 dark:text-emerald-400",
    };
  if (total >= 60)
    return {
      label: "Strong candidate requiring planning",
      toneClass: "text-blue-600 dark:text-blue-400",
    };
  if (total >= 40)
    return {
      label: "Medium priority; readiness improvement needed",
      toneClass: "text-amber-600 dark:text-amber-400",
    };
  if (total >= 20)
    return {
      label: "Low priority or high complexity",
      toneClass: "text-orange-600 dark:text-orange-400",
    };
  return { label: "Not recommended now", toneClass: "text-red-600 dark:text-red-400" };
}

export function defaultScore(): ScoreDimensions {
  return {
    strategicAlignment: 60,
    valuePotential: 60,
    feasibility: 60,
    timeToValue: 60,
    riskManageability: 60,
    governanceReadiness: 60,
  };
}

// --- React hook --------------------------------------------------------
export function useUseCaseXStore() {
  const [state, setState] = useState<StoreShape>(() => read());

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener("usecasex-store-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("usecasex-store-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((mut: (s: StoreShape) => StoreShape) => {
    const next = mut(read());
    write(next);
    setState(next);
  }, []);

  return {
    saved: state.saved,
    portfolios: state.portfolios,

    addSaved: (slug: string) =>
      update((s) =>
        s.saved.find((x) => x.useCaseSlug === slug)
          ? s
          : {
              ...s,
              saved: [
                ...s.saved,
                { useCaseSlug: slug, savedAt: new Date().toISOString(), priority: "Medium" },
              ],
            },
      ),

    removeSaved: (slug: string) =>
      update((s) => ({
        ...s,
        saved: s.saved.filter((x) => x.useCaseSlug !== slug),
        portfolios: s.portfolios.map((p) => ({
          ...p,
          useCaseSlugs: p.useCaseSlugs.filter((x) => x !== slug),
        })),
      })),

    setNote: (slug: string, note: string) =>
      update((s) => ({
        ...s,
        saved: s.saved.map((x) => (x.useCaseSlug === slug ? { ...x, note } : x)),
      })),

    setPriority: (slug: string, priority: Priority) =>
      update((s) => ({
        ...s,
        saved: s.saved.map((x) => (x.useCaseSlug === slug ? { ...x, priority } : x)),
      })),

    setScore: (slug: string, score: ScoreDimensions) =>
      update((s) => ({
        ...s,
        saved: s.saved.map((x) => (x.useCaseSlug === slug ? { ...x, score } : x)),
      })),

    createPortfolio: (input: {
      name: string;
      type: PortfolioType;
      objective?: string;
      targetDepartment?: string;
      targetQuarter?: string;
    }) =>
      update((s) => ({
        ...s,
        portfolios: [
          ...s.portfolios,
          {
            id: `p-${Date.now().toString(36)}`,
            name: input.name,
            type: input.type,
            status: "Draft",
            objective: input.objective,
            targetDepartment: input.targetDepartment,
            targetQuarter: input.targetQuarter,
            useCaseSlugs: [],
            createdAt: new Date().toISOString(),
          },
        ],
      })),

    renamePortfolio: (id: string, name: string) =>
      update((s) => ({
        ...s,
        portfolios: s.portfolios.map((p) => (p.id === id ? { ...p, name } : p)),
      })),

    updatePortfolio: (id: string, patch: Partial<Portfolio>) =>
      update((s) => ({
        ...s,
        portfolios: s.portfolios.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })),

    deletePortfolio: (id: string) =>
      update((s) => ({ ...s, portfolios: s.portfolios.filter((p) => p.id !== id) })),

    addToPortfolio: (portfolioId: string, slug: string) =>
      update((s) => ({
        ...s,
        portfolios: s.portfolios.map((p) =>
          p.id === portfolioId && !p.useCaseSlugs.includes(slug)
            ? { ...p, useCaseSlugs: [...p.useCaseSlugs, slug] }
            : p,
        ),
      })),

    removeFromPortfolio: (portfolioId: string, slug: string) =>
      update((s) => ({
        ...s,
        portfolios: s.portfolios.map((p) =>
          p.id === portfolioId
            ? { ...p, useCaseSlugs: p.useCaseSlugs.filter((x) => x !== slug) }
            : p,
        ),
      })),
  };
}
