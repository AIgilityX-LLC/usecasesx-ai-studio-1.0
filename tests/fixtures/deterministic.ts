/**
 * Deterministic, dependency-free fixtures for unit tests.
 *
 * Nothing here touches the network, the database or the clock: every factory is
 * pure and every default is fixed, so a suite that uses these fixtures produces
 * the same result on any machine and in any order. Tests that need live tenancy
 * use `tests/fixtures/workspace.ts` instead.
 */

/** Fixed "now" used by every time-dependent assertion. */
export const FIXED_NOW = new Date("2026-08-14T09:00:00.000Z");

export type UseCaseRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  organization: string;
  business_problem: string;
  ai_solution_concept: string;
  impact_score: number;
};

/** One repository row; every field has a stable default so ranking is testable. */
export function useCaseRow(overrides: Partial<UseCaseRow> = {}): UseCaseRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "fixture-use-case",
    title: "Fixture use case",
    summary: "A neutral summary used as ranking baseline.",
    organization: "Fixture Authority",
    business_problem: "Manual work is slow.",
    ai_solution_concept: "Automate the manual work.",
    impact_score: 50,
    ...overrides,
  };
}

/** A small, intentionally overlapping corpus for relevance-ranking assertions. */
export function searchCorpus(): UseCaseRow[] {
  return [
    useCaseRow({
      id: "00000000-0000-4000-8000-00000000000a",
      slug: "invoice-fraud-detection",
      title: "Invoice fraud detection",
      summary: "Detect duplicate and fraudulent invoices before payment.",
      business_problem: "Fraudulent invoices slip through manual checks.",
      impact_score: 70,
    }),
    useCaseRow({
      id: "00000000-0000-4000-8000-00000000000b",
      slug: "procurement-assistant",
      title: "Procurement assistant",
      summary: "Answers supplier questions and flags invoice anomalies.",
      business_problem: "Buyers spend hours on invoice queries.",
      impact_score: 60,
    }),
    useCaseRow({
      id: "00000000-0000-4000-8000-00000000000c",
      slug: "citizen-permit-triage",
      title: "Citizen permit triage",
      summary: "Routes permit applications to the right case worker.",
      business_problem: "Permit backlogs delay citizens.",
      impact_score: 90,
    }),
  ];
}

/** An entitlement record shaped like the rows `effectiveTier` reads. */
export function entitlement(
  overrides: Partial<{ tier: "lite" | "pro" | "enterprise"; expiresAt: string | null }> = {},
) {
  return { tier: "pro" as const, expiresAt: "2026-12-31T23:59:59.000Z", ...overrides };
}

/** Offsets a date by whole days without mutating the input. */
export function daysFrom(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}
