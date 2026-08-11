import { describe, expect, test } from "bun:test";

import {
  MIN_CHECKPOINTS_FOR_VERDICT,
  recommendFreeze,
  triagePilotEvidence,
  type PilotEvidence,
} from "@/lib/pilot/pilot.triage";
import type { PilotCheckpointResponse, PilotCohortSummary } from "@/lib/pilot/pilot.model";
import type { FeedbackRecord } from "@/lib/feedback/feedback.model";

const cohort = (patch: Partial<PilotCohortSummary> = {}): PilotCohortSummary => ({
  invited: 18,
  registered: 16,
  activated: 14,
  completed: 9,
  revoked: 0,
  seatTarget: 25,
  blockersReported: 0,
  advisoryInterest: 4,
  checkpointResponses: 20,
  ...patch,
});

const checkpoint = (patch: Partial<PilotCheckpointResponse> = {}): PilotCheckpointResponse => ({
  id: "c1",
  checkpoint: "scoring",
  journeyStage: "score",
  contextRoute: "/pilot",
  rating: 4,
  effortRating: 2,
  valueRating: 4,
  willingness: "team_budget",
  advisoryInterest: false,
  blocked: false,
  comment: null,
  createdAt: "2026-08-10T10:00:00.000Z",
  missionStep: "score",
  useCaseIds: [],
  portfolioId: null,
  ...patch,
});

const feedback = (patch: Partial<FeedbackRecord> = {}): FeedbackRecord => ({
  id: "f1",
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:00.000Z",
  status: "new",
  category: "bug",
  severity: "blocking",
  contextRoute: "/studio",
  entityType: null,
  entityId: null,
  message: "Cannot save",
  evidenceUrl: null,
  allowContact: false,
  userId: "u1",
  workspaceId: "w1",
  resolutionNote: null,
  resolvedAt: null,
  isRealActivity: true,
  assignedTo: null,
  assignedBy: null,
  assignedAt: null,
  priority: "p2",
  dueAt: null,
  firstResponseAt: null,
  ...patch,
});

const evidence = (patch: Partial<PilotEvidence> = {}): PilotEvidence => ({
  cohort: cohort(),
  checkpoints: [],
  feedback: [],
  aiUsage: [],
  noResultSearches: [],
  securityAlerts: [],
  ...patch,
});

describe("pilot evidence triage", () => {
  test("no signals produce no findings and no fabricated metrics", () => {
    const findings = triagePilotEvidence(evidence());
    expect(findings).toEqual([]);
  });

  test("a reported blocker is always P0", () => {
    const findings = triagePilotEvidence(
      evidence({ checkpoints: [checkpoint({ blocked: true, missionStep: "export" })] }),
    );
    const blocker = findings.find((f) => f.key === "checkpoint.blocked");
    expect(blocker?.triage).toBe("p0");
    expect(blocker?.detail).toContain("export");
    expect(blocker?.observations).toBe(1);
  });

  test("low ratings escalate to P1 only once the pattern repeats", () => {
    const one = triagePilotEvidence(evidence({ checkpoints: [checkpoint({ rating: 2 })] }));
    expect(one.find((f) => f.key === "checkpoint.low_confidence")?.triage).toBe("p2");
    const three = triagePilotEvidence(
      evidence({
        checkpoints: [
          checkpoint({ id: "a", rating: 1 }),
          checkpoint({ id: "b", rating: 2 }),
          checkpoint({ id: "c", effortRating: 5 }),
        ],
      }),
    );
    expect(three.find((f) => f.key === "checkpoint.low_confidence")?.triage).toBe("p1");
  });

  test("feedback is classified by its own category and severity", () => {
    const findings = triagePilotEvidence(
      evidence({
        feedback: [
          feedback({ id: "a", severity: "blocking", category: "bug" }),
          feedback({ id: "b", severity: "high", category: "performance" }),
          feedback({ id: "c", severity: "low", category: "usability" }),
          feedback({ id: "d", category: "missing_capability", severity: "high" }),
          feedback({ id: "e", category: "data_quality", severity: "normal" }),
          feedback({ id: "f", severity: "blocking", status: "resolved" }),
        ],
      }),
    );
    const byClass = (cls: string) =>
      findings.filter((f) => f.triage === cls && f.source === "feedback");
    expect(byClass("p0")).toHaveLength(1);
    expect(byClass("p1")).toHaveLength(1);
    expect(byClass("p2")).toHaveLength(1);
    expect(byClass("out_of_scope")).toHaveLength(1);
    expect(byClass("education")).toHaveLength(1);
    // resolved reports are excluded, so the P0 group counts one record only
    expect(byClass("p0")[0]!.observations).toBe(1);
  });

  test("AI failures below the sample floor are ignored, high ratios are P0", () => {
    const findings = triagePilotEvidence(
      evidence({
        aiUsage: [
          { task: "tiny", calls: 3, errors: 3, users: 1, avgDurationMs: 100 },
          { task: "flaky", calls: 10, errors: 3, users: 4, avgDurationMs: 100 },
          { task: "broken", calls: 10, errors: 8, users: 4, avgDurationMs: 100 },
        ],
      }),
    );
    expect(findings.find((f) => f.key === "ai.tiny")).toBeUndefined();
    expect(findings.find((f) => f.key === "ai.flaky")?.triage).toBe("p1");
    expect(findings.find((f) => f.key === "ai.broken")?.triage).toBe("p0");
  });

  test("repeated dead-end searches are content, not code", () => {
    const findings = triagePilotEvidence(
      evidence({
        noResultSearches: [
          { query: "sovereign cloud", searches: 5, zeroResultSearches: 5 },
          { query: "one off", searches: 1, zeroResultSearches: 1 },
        ],
      }),
    );
    const gap = findings.find((f) => f.key === "search.zero_results");
    expect(gap?.triage).toBe("education");
    expect(gap?.observations).toBe(5);
  });

  test("only triggered security alerts become findings", () => {
    const findings = triagePilotEvidence(
      evidence({
        securityAlerts: [
          {
            id: "cross_workspace",
            title: "Cross-workspace access attempts",
            guidance: "Review actors",
            severity: "critical",
            count: 2,
            threshold: 1,
            windowHours: 24,
            triggered: true,
            actors: [],
            lastAt: "2026-08-10T10:00:00.000Z",
          },
          {
            id: "storage_blocked",
            title: "Repeated storage blocks",
            guidance: "Check types",
            severity: "warning",
            count: 1,
            threshold: 5,
            windowHours: 24,
            triggered: false,
            actors: [],
            lastAt: null,
          },
        ],
      }),
    );
    expect(findings.map((f) => f.key)).toEqual(["security.cross_workspace"]);
    expect(findings[0]!.triage).toBe("p0");
  });

  test("findings are ordered P0 first and are deterministic", () => {
    const input = evidence({
      checkpoints: [checkpoint({ blocked: true })],
      feedback: [feedback({ severity: "low", category: "usability" })],
      noResultSearches: [{ query: "x", searches: 4, zeroResultSearches: 4 }],
    });
    const first = triagePilotEvidence(input);
    const second = triagePilotEvidence(input);
    expect(first.map((f) => f.triage)).toEqual(["p0", "p2", "education"]);
    expect(second.map((f) => f.key)).toEqual(first.map((f) => f.key));
  });
});

describe("freeze recommendation", () => {
  test("any open P0 is a No-Go", () => {
    const input = evidence({ checkpoints: [checkpoint({ blocked: true })] });
    const freeze = recommendFreeze(input, triagePilotEvidence(input));
    expect(freeze.verdict).toBe("no_go");
    expect(freeze.freezeRecommended).toBe(true);
    expect(freeze.reasons.join(" ")).toContain("P0");
  });

  test("open P1 without a P0 is a conditional go", () => {
    const input = evidence({
      aiUsage: [{ task: "flaky", calls: 10, errors: 3, users: 3, avgDurationMs: 90 }],
    });
    const freeze = recommendFreeze(input, triagePilotEvidence(input));
    expect(freeze.verdict).toBe("conditional_go");
    expect(freeze.counts.p1).toBe(1);
  });

  test("a thin evidence base can never produce a Go", () => {
    const thin = evidence({
      cohort: cohort({ checkpointResponses: MIN_CHECKPOINTS_FOR_VERDICT - 1 }),
    });
    expect(recommendFreeze(thin, []).verdict).toBe("insufficient_evidence");
    const unactivated = evidence({ cohort: cohort({ activated: 0 }) });
    expect(recommendFreeze(unactivated, []).verdict).toBe("insufficient_evidence");
  });

  test("clean evidence with enough answers is a Go", () => {
    const freeze = recommendFreeze(evidence(), []);
    expect(freeze.verdict).toBe("go");
    expect(freeze.reasons).toEqual([]);
    expect(freeze.freezeRecommended).toBe(true);
  });
});
