import { describe, expect, test } from "bun:test";

import {
  buildFunnelBreakdown,
  buildFunnelSeries,
  buildParticipantTimeline,
  conversionPercent,
  funnelAnalyticsToCsv,
  participantTimelineToCsv,
  NOT_RECORDED,
  type CohortOnboardingProfile,
} from "@/lib/pilot/pilot.enrollment-analytics";
import {
  computeMissionProgress,
  type PilotAuditEvent,
  type PilotCohortRow,
} from "@/lib/pilot/pilot.model";

const row = (patch: Partial<PilotCohortRow> = {}): PilotCohortRow => ({
  id: "11111111-1111-4111-8111-111111111111",
  cohort: "founding-pilot-2026-08",
  email: "lead@example.com",
  fullName: "Alex Lead",
  organization: "Example, Ltd",
  status: "activated",
  userId: "user-1",
  notes: null,
  inviteToken: null,
  invitedAt: "2026-08-01T09:00:00.000Z",
  registeredAt: "2026-08-02T09:00:00.000Z",
  activatedAt: "2026-08-03T09:00:00.000Z",
  completedAt: null,
  progress: computeMissionProgress({}),
  checkpointCount: 2,
  advisoryInterest: false,
  blockersReported: 0,
  ...patch,
});

const profile = (patch: Partial<CohortOnboardingProfile> = {}): CohortOnboardingProfile => ({
  id: "p1",
  cohort: "founding-pilot-2026-08",
  invitationId: "11111111-1111-4111-8111-111111111111",
  userId: "user-1",
  fullName: "Alex Lead",
  roleTitle: "Director of Digital",
  organization: "Example, Ltd",
  sector: "Central government",
  country: "Netherlands",
  teamSize: "6–20",
  aiExperience: "piloting",
  primaryGoal: "Build a defensible portfolio before budget season.",
  expectedUseCases: null,
  availability: "1_3h",
  contactConsent: true,
  completedAt: "2026-08-03T08:59:00.000Z",
  updatedAt: "2026-08-05T10:00:00.000Z",
  ...patch,
});

describe("participant audit timeline", () => {
  test("covers invite, claim, onboarding, update and activation in order", () => {
    const events = buildParticipantTimeline({ row: row(), audit: [], onboarding: profile() });
    expect(events.map((e) => e.kind)).toEqual([
      "invited",
      "claimed",
      "onboarded",
      "activated",
      "onboarding_updated",
    ]);
    expect(events.map((e) => e.at)).toEqual([...events.map((e) => e.at)].sort());
  });

  test("recorded admin actions win over the seat timestamp, keeping actor and reason", () => {
    const audit: PilotAuditEvent[] = [
      {
        id: "a1",
        cohort: "founding-pilot-2026-08",
        invitationId: "11111111-1111-4111-8111-111111111111",
        subjectEmail: "lead@example.com",
        subjectUserId: "user-1",
        action: "invitation.status_changed",
        fromStatus: "registered",
        toStatus: "revoked",
        reason: "withdrew after kickoff",
        actorId: "admin-1",
        actorKind: "admin",
        createdAt: "2026-08-06T09:00:00.000Z",
      },
    ];
    const events = buildParticipantTimeline({
      row: row({ status: "revoked", activatedAt: null }),
      audit,
      onboarding: null,
    });
    const revoked = events.find((e) => e.kind === "revoked");
    expect(revoked?.actor).toBe("admin-1");
    expect(revoked?.detail).toContain("withdrew after kickoff");
  });

  test("ignores audit rows that belong to another participant", () => {
    const audit: PilotAuditEvent[] = [
      {
        id: "a2",
        cohort: "founding-pilot-2026-08",
        invitationId: "22222222-2222-4222-8222-222222222222",
        subjectEmail: "other@example.com",
        subjectUserId: "user-2",
        action: "invitation.created",
        fromStatus: null,
        toStatus: "invited",
        reason: null,
        actorId: "admin-1",
        actorKind: "admin",
        createdAt: "2026-08-01T09:00:00.000Z",
      },
    ];
    const events = buildParticipantTimeline({ row: row(), audit, onboarding: null });
    expect(events.every((e) => !e.detail.includes("other@example.com"))).toBe(true);
    expect(events).toHaveLength(3);
  });

  test("csv carries the participant, timestamp and actor", () => {
    const events = buildParticipantTimeline({ row: row(), audit: [], onboarding: profile() });
    const csv = participantTimelineToCsv("lead@example.com", events);
    expect(csv.split("\r\n")).toHaveLength(events.length + 1);
    expect(csv).toContain("lead@example.com");
    expect(csv).toContain("Onboarding completed");
  });
});

describe("funnel series", () => {
  test("accumulates each stage by day and excludes revoked seats", () => {
    const series = buildFunnelSeries(
      [row(), row({ id: "i2", email: "b@example.com", userId: "user-2", status: "revoked" })],
      [profile()],
    );
    expect(series.map((p) => p.date)).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
    const last = series[series.length - 1]!;
    expect(last).toMatchObject({ invited: 1, claimed: 1, onboarded: 1, activated: 1 });
  });

  test("empty cohort produces no fabricated points", () => {
    expect(buildFunnelSeries([], [])).toEqual([]);
  });
});

describe("funnel breakdown", () => {
  test("splits by sector and country from the intake", () => {
    const bySector = buildFunnelBreakdown([row()], [profile()], "sector");
    expect(bySector).toEqual([
      { key: "Central government", invited: 1, claimed: 1, onboarded: 1, activated: 1 },
    ]);
    const byCountry = buildFunnelBreakdown([row()], [profile()], "country");
    expect(byCountry[0]?.key).toBe("Netherlands");
  });

  test("seats without an intake are grouped, not dropped", () => {
    const rows = [
      row(),
      row({
        id: "i2",
        email: "b@example.com",
        userId: null,
        registeredAt: null,
        activatedAt: null,
      }),
    ];
    const bySector = buildFunnelBreakdown(rows, [profile()], "sector");
    expect(bySector.reduce((sum, r) => sum + r.invited, 0)).toBe(2);
    expect(bySector.some((r) => r.key === NOT_RECORDED)).toBe(true);
  });

  test("conversion percent guards an empty denominator", () => {
    expect(conversionPercent(3, 0)).toBe(0);
    expect(conversionPercent(1, 4)).toBe(25);
  });

  test("analytics csv contains a section per view", () => {
    const csv = funnelAnalyticsToCsv({
      series: buildFunnelSeries([row()], [profile()]),
      bySector: buildFunnelBreakdown([row()], [profile()], "sector"),
      byCountry: buildFunnelBreakdown([row()], [profile()], "country"),
    });
    expect(csv).toContain("Cumulative by day");
    expect(csv).toContain("By sector");
    expect(csv).toContain("By country");
  });
});
