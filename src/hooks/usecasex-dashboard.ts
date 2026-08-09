// Reusable hooks for UseCasesX™ Pro Dashboard.
// Supabase-backed via useUseCaseXPro — no mock data.

import { useMemo } from "react";
import { useUseCaseXPro } from "@/hooks/usecasex-pro";
import { computeTotalScore } from "@/lib/usecasex.store";
import type { UseCaseContent } from "@/lib/domain/saved-use-cases.repository";

export interface SavedUseCase {
  id: string;
  slug: string;
  title: string;
  summary: string;
  valuePotential: string;
  complexity: string;
  riskLevel: string;
  timeToValue: string;
  maturity: string;
  industry: { slug: string; name: string };
  businessFunction: string;
  aiType: string;
  objective: string;
  savedAt: string;
  note?: string;
  priority: "Low" | "Medium" | "High" | "Strategic";
}

export interface UseCaseScore {
  useCaseId: string;
  strategic: number;
  value: number;
  feasibility: number;
  risk: number;
  readiness: number;
  ttv: number;
  total: number;
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

/** Map the DB maturity enum/text to the dashboard's Beginner/Intermediate/Advanced. */
function mapMaturity(content: UseCaseContent): string {
  if (content.maturityLevel) return content.maturityLevel;
  if (!content.maturity) return "—";
  const m = content.maturity;
  if (m === "concept" || m === "prototype") return "Beginner";
  if (m === "pilot") return "Intermediate";
  if (m === "production" || m === "scaled") return "Advanced";
  return m;
}

export function useSavedUseCases(): SavedUseCase[] {
  const store = useUseCaseXPro();
  return useMemo(() => {
    return store.saved
      .map((entry) => {
        const content = store.useCaseContent[entry.useCaseSlug];
        if (!content) return null;
        return {
          id: entry.useCaseSlug,
          slug: content.slug,
          title: content.title,
          summary: content.summary,
          valuePotential: content.valuePotential ?? "—",
          complexity: content.complexity ?? "—",
          riskLevel: content.riskLevel ?? "—",
          timeToValue: content.timeToValue ?? "—",
          maturity: mapMaturity(content),
          industry: content.industry ?? { slug: "", name: "—" },
          businessFunction: content.businessFunction ?? "—",
          aiType: content.aiCapability ?? "—",
          objective: "",
          savedAt: entry.savedAt,
          note: entry.note,
          priority: entry.priority as SavedUseCase["priority"],
        } satisfies SavedUseCase;
      })
      .filter(Boolean) as SavedUseCase[];
  }, [store.saved, store.useCaseContent]);
}

export function useUseCaseScores(): UseCaseScore[] {
  const store = useUseCaseXPro();
  return useMemo(() => {
    return store.saved
      .filter((s) => s.score)
      .map((s) => {
        const score = s.score!;
        return {
          useCaseId: s.useCaseSlug,
          strategic: score.strategicAlignment,
          value: score.valuePotential,
          feasibility: score.feasibility,
          risk: score.riskManageability,
          readiness: score.governanceReadiness,
          ttv: score.timeToValue,
          total: computeTotalScore(score),
        } satisfies UseCaseScore;
      });
  }, [store.saved]);
}

export function usePortfolios(): Portfolio[] {
  const store = useUseCaseXPro();
  return useMemo(() => {
    return store.portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      objective: p.objective ?? "",
      useCaseIds: p.entries.map((e) => e.useCaseId),
    }));
  }, [store.portfolios]);
}

export function useGeneratedReports(): GeneratedReport[] {
  // No mock data — returns empty until the generated_reports table is wired.
  // The ProDashboard shows an empty state when this is empty.
  return useMemo(() => [], []);
}
