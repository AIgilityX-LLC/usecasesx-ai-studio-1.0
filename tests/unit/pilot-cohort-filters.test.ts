import { describe, expect, it } from "bun:test";

import {
  ANY,
  EMPTY_COHORT_FILTERS,
  cohortFilterOptions,
  filterCohortRows,
  hasActiveCohortFilters,
} from "@/lib/pilot/pilot.cohort-filters";
import { audienceReadiness } from "@/lib/release/readiness";
import type { ReadinessGate } from "@/lib/release/readiness";

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: "inv-1",
    email: "ada@gov.example",
    fullName: "Ada Lovelace",
    organization: "Cabinet Office",
    status: "registered",
    userId: "user-1",
    invitedAt: "2026-08-10T09:00:00.000Z",
    registeredAt: null,
    activatedAt: null,
    completedAt: null,
    progress: { completedSteps: 0, totalSteps: 5, percent: 0, activated: false, complete: false },
    checkpointCount: 0,
    advisoryInterest: false,
    blockersReported: 0,
    ...over,
  }) as never;

const profile = (over: Record<string, unknown> = {}) =>
  ({
    userId: "user-1",
    sector: "Central government",
    country: "United Kingdom",
    fullName: "Ada Lovelace",
    organization: "Cabinet Office",
    roleTitle: "Head of Digital",
    completedAt: "2026-08-11T09:00:00.000Z",
    updatedAt: "2026-08-11T09:00:00.000Z",
  }) as never;

describe("cohort filters", () => {
  const rows = [
    row(),
    row({
      id: "inv-2",
      email: "bo@health.example",
      userId: "user-2",
      fullName: "Bo Chen",
      organization: "Health Agency",
    }),
  ];
  const byUser = { "user-1": profile() } as never;

  it("treats empty state as inactive", () => {
    expect(hasActiveCohortFilters(EMPTY_COHORT_FILTERS)).toBe(false);
    expect(filterCohortRows(rows, byUser, EMPTY_COHORT_FILTERS)).toHaveLength(2);
  });

  it("matches free text across name, email and organisation", () => {
    const found = filterCohortRows(rows, byUser, { ...EMPTY_COHORT_FILTERS, query: "cabinet ada" });
    expect(found.map((r) => r.id)).toEqual(["inv-1"]);
    expect(
      filterCohortRows(rows, byUser, { ...EMPTY_COHORT_FILTERS, query: "health" }).map((r) => r.id),
    ).toEqual(["inv-2"]);
  });

  it("filters by declared sector and country only", () => {
    expect(
      filterCohortRows(rows, byUser, { ...EMPTY_COHORT_FILTERS, sector: "Central government" }).map(
        (r) => r.id,
      ),
    ).toEqual(["inv-1"]);
    expect(
      filterCohortRows(rows, byUser, { ...EMPTY_COHORT_FILTERS, country: "France" }),
    ).toHaveLength(0);
  });

  it("filters by invited date range inclusively", () => {
    expect(
      filterCohortRows(rows, byUser, {
        ...EMPTY_COHORT_FILTERS,
        from: "2026-08-10",
        to: "2026-08-10",
      }),
    ).toHaveLength(2);
    expect(
      filterCohortRows(rows, byUser, { ...EMPTY_COHORT_FILTERS, from: "2026-08-11" }),
    ).toHaveLength(0);
  });

  it("lists distinct intake options", () => {
    expect(cohortFilterOptions([profile()], "sector")).toEqual(["Central government"]);
    expect(cohortFilterOptions([profile()], "country")).toEqual(["United Kingdom"]);
    expect(EMPTY_COHORT_FILTERS.sector).toBe(ANY);
  });
});

describe("audience readiness", () => {
  const gate = (id: string, status: ReadinessGate["status"]): ReadinessGate => ({
    id,
    label: id,
    status,
    detail: "",
  });

  it("scores 100% when every in-scope gate passes", () => {
    const gates = [
      gate("checks.p0", "pass"),
      gate("checks.p1", "pass"),
      gate("pipeline.verification", "pass"),
      gate("pilot.seats", "pass"),
      gate("pilot.evidence", "pass"),
    ];
    for (const entry of audienceReadiness(gates)) {
      expect(entry.percent).toBe(100);
      expect(entry.verdict).toBe("ready");
    }
  });

  it("excludes out-of-scope gates from the demo score", () => {
    const gates = [
      gate("checks.p0", "pass"),
      gate("checks.p1", "pass"),
      gate("pipeline.verification", "pass"),
      gate("pilot.seats", "fail"),
      gate("pilot.evidence", "fail"),
    ];
    const byAudience = Object.fromEntries(audienceReadiness(gates).map((e) => [e.audience, e]));
    expect(byAudience["demo"]!.percent).toBe(100);
    expect(byAudience["client"]!.verdict).toBe("blocked");
    expect(byAudience["production"]!.percent).toBeLessThan(100);
  });
});
