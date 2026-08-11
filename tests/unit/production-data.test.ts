import { describe, expect, it } from "vitest";

import {
  buildProductionDataChecklist,
  canSignOff,
  classifyPrincipal,
  countDataStatus,
  dataVerdict,
  grantsNeedingReview,
  latestSignOff,
  productionDataCsv,
  type AdminGrantRow,
  type DataCheck,
  type ProductionDataReport,
} from "@/lib/ops/production-data";

const check = (over: Partial<DataCheck>): DataCheck => ({
  id: "x",
  area: "public_content",
  label: "Check",
  status: "pass",
  observed: "observed",
  ...over,
});

const grant = (over: Partial<AdminGrantRow>): AdminGrantRow => ({
  userId: "11111111-1111-1111-1111-111111111111",
  role: "admin",
  displayName: "Real Owner",
  email: "owner@usecasesx.ai",
  kind: "named",
  createdAt: "2026-08-01T00:00:00.000Z",
  ...over,
});

const report = (checks: DataCheck[]): ProductionDataReport => ({
  generatedAt: "2026-08-10T09:00:00.000Z",
  actor: "owner@usecasesx.ai",
  observedHost: "usecasesx.ai",
  release: { version: "v1.0.0-rc.1", marker: "rc1", targetDate: "14 August 2026" } as never,
  checks,
  admins: [grant({})],
  inventory: [{ id: "a", label: "Published", count: 54, expectation: "Launch corpus" }],
  anonymousProbes: [{ table: "profiles", outcome: "sealed", rows: 0, detail: "denied" }],
  signOffs: [],
});

describe("classifyPrincipal", () => {
  it("flags demo and test identities by name or address", () => {
    expect(classifyPrincipal("Admin Demo", null)).toBe("demo");
    expect(classifyPrincipal("QA Runner", "qa@example.com")).toBe("demo");
    expect(classifyPrincipal("Real Owner", "owner@test.local")).toBe("demo");
  });

  it("treats an account with no name and no email as unnamed", () => {
    expect(classifyPrincipal(null, null)).toBe("unnamed");
    expect(classifyPrincipal("   ", "")).toBe("unnamed");
  });

  it("does not flag ordinary owners", () => {
    expect(classifyPrincipal("Ada Byron", "ada@usecasesx.ai")).toBe("named");
  });
});

describe("grantsNeedingReview", () => {
  it("returns only grants held by demo or unnamed principals", () => {
    const rows = [
      grant({}),
      grant({ role: "moderator", displayName: "Moderator Demo", kind: "demo" }),
      grant({ role: "editor", displayName: null, email: null, kind: "unnamed" }),
    ];
    expect(grantsNeedingReview(rows).map((row) => row.role)).toEqual(["moderator", "editor"]);
  });
});

describe("verdicts", () => {
  it("blocks on any failing check", () => {
    expect(dataVerdict([check({}), check({ status: "fail" })])).toBe("blocked");
  });

  it("is conditional when something is unmeasured or needs attention", () => {
    expect(dataVerdict([check({}), check({ status: "unknown" })])).toBe("conditional");
    expect(dataVerdict([check({ status: "attention" })])).toBe("conditional");
  });

  it("is clean only when every check passes", () => {
    expect(dataVerdict([check({}), check({ id: "y" })])).toBe("clean");
  });

  it("counts each status", () => {
    expect(countDataStatus([check({}), check({ status: "fail" })])).toEqual({
      pass: 1,
      attention: 0,
      fail: 1,
      unknown: 0,
    });
  });

  it("refuses sign-off while a check is failing", () => {
    expect(canSignOff([check({ status: "fail" })])).toBe(false);
    expect(canSignOff([check({ status: "attention" })])).toBe(true);
  });
});

describe("latestSignOff", () => {
  it("returns the most recent record regardless of input order", () => {
    const latest = latestSignOff([
      { at: "2026-08-01T00:00:00.000Z", by: "a", verdict: "approved", note: "" },
      { at: "2026-08-09T00:00:00.000Z", by: "b", verdict: "rejected", note: "gap" },
    ]);
    expect(latest?.by).toBe("b");
  });

  it("returns null with no records", () => {
    expect(latestSignOff([])).toBeNull();
  });
});

describe("artifacts", () => {
  it("escapes commas and quotes in the CSV", () => {
    const csv = productionDataCsv(
      report([check({ observed: 'demo, unnamed and "other" grants' })]),
    );
    expect(csv.split("\n")[0]).toBe("Area,Check,Status,Observed,Action");
    expect(csv).toContain('"demo, unnamed and ""other"" grants"');
  });

  it("states the verdict, the sign-off state and the no-deletion rule", () => {
    const markdown = buildProductionDataChecklist(report([check({ status: "fail" })]));
    expect(markdown).toContain("**BLOCKED**");
    expect(markdown).toContain("not signed off");
    expect(markdown).toContain("No record is deleted");
  });
});
