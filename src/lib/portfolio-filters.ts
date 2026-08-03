/**
 * Advanced portfolio entry filtering.
 *
 * Pure functions shared by the table, the cards, the charts, the metrics tiles
 * and the export dialog so every surface shows exactly the same slice.
 */

import type { PortfolioEntry } from "@/lib/portfolio-model";

export interface PortfolioFilterState {
  query: string;
  decisions: string[];
  funding: string[];
  valuePotential: string[];
  complexity: string[];
  riskLevel: string[];
  targetPeriods: string[];
  functions: string[];
  /** Only entries that already have a Studio draft. */
  studioOnly: boolean;
  /** Only entries with no rank recorded yet. */
  unrankedOnly: boolean;
}

export const EMPTY_PORTFOLIO_FILTERS: PortfolioFilterState = {
  query: "",
  decisions: [],
  funding: [],
  valuePotential: [],
  complexity: [],
  riskLevel: [],
  targetPeriods: [],
  functions: [],
  studioOnly: false,
  unrankedOnly: false,
};

export function countActiveFilters(filters: PortfolioFilterState): number {
  return (
    (filters.query.trim() ? 1 : 0) +
    filters.decisions.length +
    filters.funding.length +
    filters.valuePotential.length +
    filters.complexity.length +
    filters.riskLevel.length +
    filters.targetPeriods.length +
    filters.functions.length +
    (filters.studioOnly ? 1 : 0) +
    (filters.unrankedOnly ? 1 : 0)
  );
}

function matches(selected: string[], value: string | undefined | null): boolean {
  if (selected.length === 0) return true;
  return value != null && selected.includes(value);
}

export function applyPortfolioFilters(
  entries: PortfolioEntry[],
  filters: PortfolioFilterState,
): PortfolioEntry[] {
  const query = filters.query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (query) {
      const haystack = [
        entry.useCaseTitle,
        entry.useCaseSlug,
        entry.nextAction,
        entry.notes,
        entry.functionName,
        entry.targetPeriod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (!matches(filters.decisions, entry.decision)) return false;
    if (!matches(filters.funding, entry.fundingState)) return false;
    if (!matches(filters.valuePotential, entry.valuePotential)) return false;
    if (!matches(filters.complexity, entry.complexity)) return false;
    if (!matches(filters.riskLevel, entry.riskLevel)) return false;
    if (!matches(filters.targetPeriods, entry.targetPeriod)) return false;
    if (!matches(filters.functions, entry.functionName)) return false;
    if (filters.studioOnly && !entry.studioUseCaseId) return false;
    if (filters.unrankedOnly && entry.rank != null) return false;
    return true;
  });
}

/** Distinct, sorted values present in the portfolio for a given attribute. */
export function distinctValues(
  entries: PortfolioEntry[],
  pick: (entry: PortfolioEntry) => string | undefined,
): string[] {
  return [...new Set(entries.map(pick).filter((v): v is string => Boolean(v && v.trim())))].sort(
    (a, b) => a.localeCompare(b),
  );
}
