import { describe, expect, it } from "vitest";

import { ROSTER_MAX_ROWS, parseParticipantRoster } from "@/lib/pilot/pilot.roster";
import {
  activeWaiver,
  applyLaunchWaiver,
  isWaiverActive,
  type LaunchWaiver,
} from "@/lib/pilot/pilot.governance";
import {
  buildPilotTimeline,
  buildTimelineMarkdown,
  countTimeline,
  pilotTimelineToCsv,
} from "@/lib/pilot/pilot.timeline";
import { planGapEmails, windowKey } from "@/lib/pilot/pilot.gap-emails.server";
import { LAUNCH_CHECKS, summarizeResults, type CheckResult } from "@/lib/qa/harness";
import type { FreezeRecommendation } from "@/lib/pilot/pilot.triage";
import type { PilotCohortRow, PilotInvitation } from "@/lib/pilot/pilot.model";

describe("participant roster parsing", () => {
  it("reads a headed CSV with names and organisations", () => {
    const result = parseParticipantRoster(
      ["email,name,organisation,notes", "A@Gov.example,Ada Lovelace,Digital Agency,cohort A"].join(
        "\n",
      ),
    );
    expect(result.participants).toEqual([
      {
        email: "a@gov.example",
        fullName: "Ada Lovelace",
        organization: "Digital Agency",
        notes: "cohort A",
      },
    ]);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts a plain list of emails without a header", () => {
    const result = parseParticipantRoster("one@example.com\ntwo@example.com");
    expect(result.participants.map((p) => p.email)).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
  });

  it("reports invalid and duplicated rows instead of enrolling them", () => {
    const result = parseParticipantRoster(
      ["email", "good@example.com", "not-an-email", "good@example.com"].join("\n"),
    );
    expect(result.participants).toHaveLength(1);
    expect(result.duplicates).toEqual(["good@example.com"]);
    expect(result.issues.map((issue) => issue.reason)).toEqual([
      "Not a valid email address.",
      "Duplicate address in this file.",
    ]);
  });

  it("caps an upload at the seat limit and reports the overflow", () => {
    const rows = Array.from({ length: ROSTER_MAX_ROWS + 3 }, (_, i) => `user${i}@example.com`);
    const result = parseParticipantRoster(rows.join("\n"));
    expect(result.participants).toHaveLength(ROSTER_MAX_ROWS);
    expect(result.truncated).toBe(true);
    expect(result.issues).toHaveLength(3);
  });

  it("handles semicolon and tab delimited files with quoted fields", () => {
    const result = parseParticipantRoster('email;name\n"x@example.com";"Doe, John"');
    expect(result.participants[0]).toMatchObject({ email: "x@example.com", fullName: "Doe, John" });
  });
});

const waiver = (patch: Partial<LaunchWaiver> = {}): LaunchWaiver => ({
  id: "w1",
  cohort: "c",
  scope: "pilot_evidence",
  reason: "Launch window fixed; evidence continues after go-live.",
  approverName: "Sam Owner",
  approverRole: "Product owner",
  approvedBy: "u1",
  expiresAt: null,
  revokedAt: null,
  revokedBy: null,
  revokeReason: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  ...patch,
});

const freeze = (patch: Partial<FreezeRecommendation> = {}): FreezeRecommendation => ({
  verdict: "insufficient_evidence",
  headline: "No-Go on evidence",
  reasons: ["Only 0 checkpoint answer(s) recorded"],
  counts: { p0: 0, p1: 0, p2: 0, education: 0, out_of_scope: 0 },
  freezeRecommended: false,
  ...patch,
});

describe("launch waivers", () => {
  it("treats revoked and expired waivers as inactive", () => {
    expect(isWaiverActive(waiver())).toBe(true);
    expect(isWaiverActive(waiver({ revokedAt: "2026-08-02T00:00:00.000Z" }))).toBe(false);
    expect(
      isWaiverActive(waiver({ expiresAt: "2026-08-02T00:00:00.000Z" }), new Date("2026-08-03")),
    ).toBe(false);
  });

  it("picks the active waiver for the scope", () => {
    const list = [waiver({ id: "old", revokedAt: "2026-08-02T00:00:00.000Z" }), waiver({ id: "new" })];
    expect(activeWaiver(list)?.id).toBe("new");
    expect(activeWaiver(list, { scope: "something_else" })).toBeNull();
  });

  it("lifts an evidence shortfall to a conditional go", () => {
    const applied = applyLaunchWaiver(freeze(), waiver());
    expect(applied.verdict).toBe("conditional_go");
    expect(applied.waived).toBe(true);
    expect(applied.freezeRecommended).toBe(true);
    expect(applied.reasons.join(" ")).toContain("Sam Owner");
  });

  it("never waives an open P0", () => {
    const applied = applyLaunchWaiver(
      freeze({ verdict: "no_go", counts: { p0: 1, p1: 0, p2: 0, education: 0, out_of_scope: 0 } }),
      waiver(),
    );
    expect(applied.verdict).toBe("no_go");
    expect(applied.waived).toBe(false);
    expect(applied.note).toContain("cannot clear open P0");
  });

  it("changes nothing when the verdict does not rest on missing evidence", () => {
    const applied = applyLaunchWaiver(freeze({ verdict: "go", reasons: [] }), waiver());
    expect(applied.verdict).toBe("go");
    expect(applied.waived).toBe(false);
  });
});

const row = (patch: Partial<PilotCohortRow> = {}): PilotCohortRow =>
  ({
    id: "i1",
    cohort: "c",
    email: "a@example.com",
    fullName: "Ada",
    organization: "Agency",
    status: "registered",
    userId: "u1",
    invitedAt: "2026-08-01T10:00:00.000Z",
    registeredAt: "2026-08-02T10:00:00.000Z",
    activatedAt: null,
    completedAt: null,
    checkpointCount: 0,
    blockersReported: 0,
    advisoryInterest: false,
    progress: { completedSteps: 0, totalSteps: 5, percent: 0, steps: [] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(patch as any),
  }) as PilotCohortRow;

describe("pilot evidence timeline", () => {
  const timeline = buildPilotTimeline({
    cohort: "c",
    rows: [row()],
    checkpoints: [],
    audit: [],
    waivers: [waiver()],
  });

  it("orders every recorded event chronologically", () => {
    expect(timeline.map((event) => event.at)).toEqual([
      "2026-08-01T00:00:00.000Z",
      "2026-08-01T10:00:00.000Z",
      "2026-08-02T10:00:00.000Z",
    ]);
  });

  it("counts events by category and never invents one", () => {
    const counts = countTimeline(timeline);
    expect(counts.seat).toBe(2);
    expect(counts.waiver).toBe(1);
    expect(counts.checkpoint).toBe(0);
  });

  it("exports CSV and Markdown from the same events", () => {
    expect(pilotTimelineToCsv(timeline).split("\r\n")).toHaveLength(timeline.length + 1);
    const markdown = buildTimelineMarkdown({
      cohort: "c",
      generatedAt: "2026-08-11T00:00:00.000Z",
      events: timeline,
    });
    expect(markdown).toContain("Events recorded: 3");
    expect(buildTimelineMarkdown({ cohort: "c", generatedAt: "x", events: [] })).toContain(
      "No pilot events have been recorded yet",
    );
  });
});

const invitation = (patch: Partial<PilotInvitation>): PilotInvitation =>
  ({
    id: "i",
    cohort: "c",
    email: "a@example.com",
    fullName: null,
    organization: null,
    notes: null,
    status: "invited",
    userId: null,
    invitedAt: "2026-08-01T00:00:00.000Z",
    registeredAt: null,
    activatedAt: null,
    completedAt: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(patch as any),
  }) as PilotInvitation;

const gap = (state: "no_invitations" | "no_registrations" | "no_answers" | "none") => ({
  state,
  triggered: true,
  windowDays: 7,
  daysOpen: 9,
  title: "t",
  detail: "d",
  action: "a",
});

describe("evidence-gap reminder planning", () => {
  it("nudges unclaimed seats when nobody registered", () => {
    const plan = planGapEmails(gap("no_registrations"), {
      invitations: [
        invitation({ id: "a", email: "unclaimed@example.com" }),
        invitation({ id: "b", email: "claimed@example.com", userId: "u1" }),
        invitation({ id: "c", email: "revoked@example.com", status: "revoked" }),
      ],
      answeredUserIds: new Set(),
    });
    expect(plan.map((row) => row.email)).toEqual(["unclaimed@example.com"]);
    expect(plan[0]!.kind).toBe("evidence_gap_claim_seat");
  });

  it("nudges registered participants who have not answered", () => {
    const plan = planGapEmails(gap("no_answers"), {
      invitations: [
        invitation({ id: "a", email: "silent@example.com", userId: "u1" }),
        invitation({ id: "b", email: "answered@example.com", userId: "u2" }),
      ],
      answeredUserIds: new Set(["u2"]),
    });
    expect(plan.map((row) => row.email)).toEqual(["silent@example.com"]);
  });

  it("plans nothing when no seats exist or the gap is closed", () => {
    expect(
      planGapEmails(gap("no_invitations"), { invitations: [], answeredUserIds: new Set() }),
    ).toEqual([]);
    expect(
      planGapEmails(gap("none"), {
        invitations: [invitation({ userId: "u1" })],
        answeredUserIds: new Set(),
      }),
    ).toEqual([]);
  });

  it("buckets the window so one run per window nudges once", () => {
    const a = windowKey(new Date("2026-08-01T00:00:00.000Z"), 7);
    const b = windowKey(new Date("2026-08-03T00:00:00.000Z"), 7);
    const c = windowKey(new Date("2026-08-20T00:00:00.000Z"), 7);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("launch check harness summary", () => {
  const result = (patch: Partial<CheckResult>): CheckResult => ({
    ...LAUNCH_CHECKS[0]!,
    status: "pass",
    observed: "ok",
    durationMs: 1,
    ...patch,
  });

  it("fails the run on any P0 failure", () => {
    const summary = summarizeResults([
      result({}),
      result({ severity: "p0", status: "fail" }),
      result({ severity: "p1", status: "error" }),
      result({ status: "skipped" }),
    ]);
    expect(summary.verdict).toBe("fail");
    expect(summary.p0Failures).toBe(1);
    expect(summary.p1Failures).toBe(1);
    expect(summary.skipped).toBe(1);
  });

  it("flags attention for P1-only problems and passes when clean", () => {
    expect(summarizeResults([result({ severity: "p1", status: "fail" })]).verdict).toBe("attention");
    expect(summarizeResults([result({}), result({ status: "skipped" })]).verdict).toBe("pass");
  });

  it("declares a unique id for every check", () => {
    expect(new Set(LAUNCH_CHECKS.map((check) => check.id)).size).toBe(LAUNCH_CHECKS.length);
  });
});