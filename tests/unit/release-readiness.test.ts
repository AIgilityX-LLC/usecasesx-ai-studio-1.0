import { describe, expect, it } from "vitest";
import {
  buildReadinessGates,
  buildReadinessMarkdown,
  failingAssertions,
  readinessToCsv,
  readinessVerdict,
  type ReadinessInput,
} from "@/lib/release/readiness";
import type { LaunchCheckRun } from "@/lib/qa/launch-runs";
import type { PilotCohortSummary } from "@/lib/pilot/pilot.model";

const cohort = (over: Partial<PilotCohortSummary> = {}): PilotCohortSummary => ({
  invited: 18,
  registered: 18,
  activated: 15,
  completed: 9,
  revoked: 0,
  seatTarget: 25,
  blockersReported: 1,
  advisoryInterest: 4,
  checkpointResponses: 22,
  ...over,
});

const run = (over: Partial<LaunchCheckRun> = {}): LaunchCheckRun => ({
  id: "run-1",
  cohort: "founding-pilot-2026-08",
  trigger: "manual",
  triggerDetail: null,
  actorId: "user-1",
  actorEmail: "admin@example.com",
  total: 13,
  passed: 13,
  failed: 0,
  skipped: 0,
  errored: 0,
  p0Failures: 0,
  results: [],
  createdAt: "2026-08-11T07:00:00.000Z",
  ...over,
});

const input = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  run: run(),
  cohort: cohort(),
  waiverActive: false,
  generatedAt: "2026-08-11T07:30:00.000Z",
  actor: "admin@example.com",
  ...over,
});

describe("launch readiness", () => {
  it("is conditional when the browser suite only runs in CI", () => {
    const gates = buildReadinessGates(input());
    expect(gates.find((g) => g.id === "pilot.seats")?.status).toBe("pass");
    expect(readinessVerdict(gates)).toBe("conditional");
  });

  it("blocks when P0 checks fail", () => {
    const gates = buildReadinessGates(
      input({ run: run({ p0Failures: 2, failed: 2, passed: 11 }) }),
    );
    expect(gates.find((g) => g.id === "checks.p0")?.status).toBe("fail");
    expect(readinessVerdict(gates)).toBe("blocked");
  });

  it("blocks an empty cohort and softens it under a waiver", () => {
    const empty = cohort({
      invited: 0,
      registered: 0,
      activated: 0,
      completed: 0,
      checkpointResponses: 0,
    });
    expect(readinessVerdict(buildReadinessGates(input({ cohort: empty })))).toBe("blocked");
    const waived = buildReadinessGates(input({ cohort: empty, waiverActive: true }));
    expect(waived.find((g) => g.id === "pilot.evidence")?.status).toBe("attention");
    expect(readinessVerdict(waived)).toBe("conditional");
  });

  it("never claims a pass without a measurement", () => {
    const gates = buildReadinessGates(input({ run: null, cohort: null }));
    expect(gates.filter((g) => g.status === "unknown")).toHaveLength(4);
    expect(failingAssertions(null)).toEqual([]);
  });

  it("exports markdown and CSV artifacts", () => {
    const md = buildReadinessMarkdown(input());
    expect(md).toContain("# Launch readiness report");
    expect(md).toContain("release/2026-08-14");
    const csv = readinessToCsv(input());
    expect(csv.split("\r\n")[0]).toBe("Section,Item,Status,Detail");
    expect(csv).toContain("bun run verify:release");
  });
});
