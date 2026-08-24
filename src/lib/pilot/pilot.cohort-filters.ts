/**
 * Cohort search filters (pure).
 *
 * Narrows the pilot participant table — and therefore each seat's audit
 * timeline — by free-text (name, email, organisation), by the sector and
 * country the participant declared at intake, and by the window the seat was
 * invited in. Nothing is inferred: a seat with no intake only matches the
 * "Any" sector/country option.
 */

import type { PilotCohortRow } from "./pilot.model";
import type { CohortOnboardingProfile } from "./pilot.enrollment-analytics";

export const ANY = "__any__";

export type CohortFilterState = {
  /** Free text matched against full name, email and organisation. */
  query: string;
  sector: string;
  country: string;
  /** Inclusive invited-at bounds as YYYY-MM-DD, or "" for open-ended. */
  from: string;
  to: string;
};

export const EMPTY_COHORT_FILTERS: CohortFilterState = {
  query: "",
  sector: ANY,
  country: ANY,
  from: "",
  to: "",
};

export function hasActiveCohortFilters(filters: CohortFilterState): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.sector !== ANY ||
    filters.country !== ANY ||
    filters.from !== "" ||
    filters.to !== ""
  );
}

const norm = (value: string | null | undefined): string => (value ?? "").trim().toLowerCase();
const day = (value: string | null | undefined): string | null =>
  value ? new Date(value).toISOString().slice(0, 10) : null;

/** Distinct declared values for one intake dimension, alphabetically. */
export function cohortFilterOptions(
  onboarding: readonly CohortOnboardingProfile[],
  dimension: "sector" | "country",
): string[] {
  const values = new Set<string>();
  for (const profile of onboarding) {
    const raw = dimension === "sector" ? profile.sector : profile.country;
    if (raw && String(raw).trim()) values.add(String(raw).trim());
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function filterCohortRows(
  rows: readonly PilotCohortRow[],
  onboardingByUser: Readonly<Record<string, CohortOnboardingProfile>>,
  filters: CohortFilterState,
): PilotCohortRow[] {
  const terms = norm(filters.query).split(/\s+/).filter(Boolean);

  return rows.filter((row) => {
    const profile = row.userId ? onboardingByUser[row.userId] : undefined;

    if (terms.length > 0) {
      const haystack = [
        row.fullName,
        row.email,
        row.organization,
        profile?.fullName,
        profile?.organization,
        profile?.roleTitle,
      ]
        .map(norm)
        .join(" ");
      if (!terms.every((term) => haystack.includes(term))) return false;
    }

    if (filters.sector !== ANY && norm(profile?.sector) !== norm(filters.sector)) return false;
    if (filters.country !== ANY && norm(profile?.country) !== norm(filters.country)) return false;

    const invited = day(row.invitedAt);
    if (filters.from && (!invited || invited < filters.from)) return false;
    if (filters.to && (!invited || invited > filters.to)) return false;

    return true;
  });
}
