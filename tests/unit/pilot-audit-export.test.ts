import { describe, expect, test } from "bun:test";

import {
  buildFunnelSummaryLines,
  pilotAdvisoryInterestToCsv,
  pilotAuditToCsv,
  pilotCheckpointsToCsv,
  pilotFunnelToCsv,
  toCsvCell,
} from "@/lib/pilot/pilot.export";
import {
  buildReminderDrafts,
  checkpointDeepLinks,
  computeMissionProgress,
  summarizeCohort,
  type PilotAuditEvent,
  type PilotCheckpointResponse,
  type PilotCohortRow,
} from "@/lib/pilot/pilot.model";

const response = (patch: Partial<PilotCheckpointResponse> = {}): PilotCheckpointResponse => ({
  id: "r1",
  checkpoint: "final",
  journeyStage: "export",
  contextRoute: "/pilot",
  rating: 4,
  effortRating: 3,
  valueRating: 5,
  willingness: "department_budget",
  advisoryInterest: true,
  blocked: false,
  comment: "Board-ready, needs a summary page",
  createdAt: "2026-08-01T10:00:00.000Z",
  userId: "user-1",
  missionStep: "export",
  useCaseIds: ["11111111-1111-4111-8111-111111111111"],
  portfolioId: "22222222-2222-4222-8222-222222222222",
  ...patch,
});

const row = (patch: Partial<PilotCohortRow> = {}): PilotCohortRow => ({
  id: "i1",
  cohort: "pilot-2026-08",
  email: "lead@example.com",
  fullName: "Alex Lead",
  organization: "Example, Ltd",
  status: "completed",
  invitedAt: "2026-07-01T09:00:00.000Z",
  registeredAt: "2026-07-02T09:00:00.000Z",
  activatedAt: "2026-07-03T09:00:00.000Z",
  completedAt: "2026-07-05T09:00:00.000Z",
  userId: "user-1",
  progress: computeMissionProgress({}),
  checkpointCount: 3,
  blockersReported: 0,
  advisoryInterest: true,
  ...patch,
});

describe("pilot csv cells", () => {
  test("quotes separators, quotes and newlines", () => {
    expect(toCsvCell('Example, Ltd "HQ"')).toBe('"Example, Ltd ""HQ"""');
    expect(toCsvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(toCsvCell(null)).toBe("");
    expect(toCsvCell(true)).toBe("yes");
  });
});

describe("pilot funnel export", () => {
  test("emits one header and one row per participant", () => {
    const lines = pilotFunnelToCsv([row(), row({ id: "i2", email: "b@example.com" })]).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Mission percent");
    expect(lines[1]).toContain("lead@example.com");
  });

  test("summary lines report every funnel stage", () => {
    const summary = summarizeCohort([row()], 25);
    const lines = buildFunnelSummaryLines(summary);
    expect(lines.join("\n")).toContain("Seats invited: 1 of 25");
    expect(lines).toHaveLength(8);
  });
});

describe("pilot checkpoint export", () => {
  test("carries mission references and resolves the participant email", () => {
    const csv = pilotCheckpointsToCsv([response()], { "user-1": "lead@example.com" });
    expect(csv).toContain("lead@example.com");
    expect(csv).toContain("11111111-1111-4111-8111-111111111111");
    expect(csv).toContain("22222222-2222-4222-8222-222222222222");
  });

  test("advisory export lists only interested participants with their funding answer", () => {
    const csv = pilotAdvisoryInterestToCsv(
      [row(), row({ id: "i2", email: "quiet@example.com", advisoryInterest: false })],
      [response()],
    );
    expect(csv).toContain("lead@example.com");
    expect(csv).not.toContain("quiet@example.com");
    expect(csv).toContain("department budget");
  });
});

describe("pilot audit export", () => {
  test("records actor, transition and reason", () => {
    const event: PilotAuditEvent = {
      id: "a1",
      cohort: "pilot-2026-08",
      invitationId: "i1",
      subjectEmail: "lead@example.com",
      subjectUserId: "user-1",
      action: "invitation.status_changed",
      fromStatus: "registered",
      toStatus: "completed",
      reason: "finished mission on call",
      actorId: "admin-1",
      actorKind: "admin",
      createdAt: "2026-08-01T12:00:00.000Z",
    };
    const csv = pilotAuditToCsv([event]);
    expect(csv).toContain("invitation.status_changed");
    expect(csv).toContain("finished mission on call");
    expect(csv).toContain("admin-1");
  });
});

describe("checkpoint deep links", () => {
  test("links back to the mission step, use cases and portfolio", () => {
    const links = checkpointDeepLinks(response());
    expect(links.some((link) => link.kind === "step")).toBe(true);
    expect(links.find((link) => link.kind === "use-case")?.params?.["id"]).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(links.some((link) => link.kind === "portfolio")).toBe(true);
  });

  test("falls back to the recorded route when no mission step is known", () => {
    const links = checkpointDeepLinks(
      response({ missionStep: null, useCaseIds: [], portfolioId: null }),
    );
    expect(links).toHaveLength(1);
    expect(links[0]?.kind).toBe("context");
  });
});

describe("reminder drafts", () => {
  test("nudge the next pending step and never a completed one", () => {
    const progress = computeMissionProgress({});
    const drafts = buildReminderDrafts(progress, []);
    const stepDrafts = drafts.filter((draft) => draft.kind === "mission_step");
    expect(stepDrafts).toHaveLength(1);
    expect(stepDrafts[0]?.missionStep).toBe(progress.nextStep?.key);
  });

  test("do not re-ask a checkpoint that was already answered", () => {
    const progress = computeMissionProgress({});
    const answered = buildReminderDrafts(progress, [])
      .filter((draft) => draft.kind === "checkpoint")
      .map((draft) => draft.checkpoint as string);
    const drafts = buildReminderDrafts(progress, answered);
    expect(drafts.filter((draft) => draft.kind === "checkpoint")).toHaveLength(0);
  });
});
