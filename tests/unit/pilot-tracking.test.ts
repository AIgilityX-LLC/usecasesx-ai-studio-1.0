/**
 * Pilot tracking: lead counts, approval rate, sector/role grouping and
 * cohort step progress.
 */
import { describe, expect, test } from "bun:test";

import type { PilotApplication } from "@/lib/pilot/pilot.applications";
import {
  NOT_GIVEN,
  buildLeadTracking,
  buildMemberProgress,
  roleLevel,
  sectorLabel,
  sortByNeedsAttention,
  summarizeCohortProgress,
  weekStartUtc,
  type CohortMemberInput,
} from "@/lib/pilot/pilot.tracking";
import type { PilotProgressSummary } from "@/lib/pilot/pilot.milestones";

const NOW = new Date("2026-11-04T09:00:00Z"); // Wednesday

function app(over: Partial<PilotApplication> & { id: string }): PilotApplication {
  return {
    cohort: "founding-2026",
    fullName: "Test Person",
    email: `${over.id}@example.org`,
    organization: "Org",
    roleTitle: null,
    sector: null,
    country: null,
    goals: null,
    status: "requested",
    decisionReason: null,
    decidedAt: null,
    invitationId: null,
    createdAt: "2026-11-03T10:00:00Z",
    ...over,
  };
}

describe("lead tracking", () => {
  const rows = [
    app({ id: "a", status: "approved", sector: "Banking", roleTitle: "Chief Data Officer" }),
    app({ id: "b", status: "approved", sector: " banking ", roleTitle: "Head of AI" }),
    app({ id: "c", status: "declined", sector: "Healthcare", roleTitle: "Product Manager" }),
    app({ id: "d", status: "requested", sector: "", createdAt: "2026-10-01T10:00:00Z" }),
  ];
  const t = buildLeadTracking(rows, NOW);

  test("counts leads by status", () => {
    expect(t.total).toBe(4);
    expect(t.approved).toBe(2);
    expect(t.declined).toBe(1);
    expect(t.awaitingReview).toBe(1);
  });

  test("approval rate is approved over decided, not over all leads", () => {
    expect(t.approvalRate).toBe(67);
    expect(buildLeadTracking([app({ id: "x" })], NOW).approvalRate).toBeNull();
  });

  test("recent windows", () => {
    expect(t.last7Days).toBe(3);
    expect(t.last30Days).toBe(3);
  });

  test("sector grouping ignores case and spacing; blanks go last", () => {
    expect(t.bySector[0]).toEqual({ label: "Banking", total: 2, approved: 2 });
    expect(t.bySector.at(-1)?.label).toBe(NOT_GIVEN);
  });

  test("role titles are grouped into levels", () => {
    expect(roleLevel("Chief Data Officer")).toBe("Executive / C-suite");
    expect(roleLevel("CEO")).toBe("Executive / C-suite");
    expect(roleLevel("Head of AI")).toBe("Head / Director");
    expect(roleLevel("Product Owner")).toBe("Manager / Lead");
    expect(roleLevel("AI Consultant")).toBe("Consultant / Advisor");
    expect(roleLevel("Data Analyst")).toBe("Specialist / Analyst");
    expect(roleLevel("  ")).toBe(NOT_GIVEN);
    expect(sectorLabel(null)).toBe(NOT_GIVEN);
  });

  test("weekly buckets start on Monday and cover 8 weeks", () => {
    expect(weekStartUtc(NOW)).toBe("2026-11-02");
    expect(t.weekly).toHaveLength(8);
    expect(t.weekly.at(-1)).toEqual({ weekStart: "2026-11-02", total: 3, approved: 2 });
  });
});

const EMPTY: PilotProgressSummary = {
  useCases: 0,
  scores: 0,
  portfolios: 0,
  portfolioItems: 0,
  roadmapItems: 0,
  checkpoints: 0,
  onboarded: false,
};

function member(over: Partial<CohortMemberInput> & { invitationId: string }): CohortMemberInput {
  return {
    userId: `u-${over.invitationId}`,
    email: `${over.invitationId}@example.org`,
    fullName: over.invitationId,
    organization: null,
    sector: null,
    roleTitle: null,
    seatStatus: "registered",
    invitedAt: "2026-10-01T00:00:00Z",
    joinedAt: "2026-10-02T00:00:00Z",
    progress: EMPTY,
    approvals: {},
    ...over,
  };
}

describe("cohort progress", () => {
  test("evidence marks steps done; admin approval marks them approved", () => {
    const m = buildMemberProgress(
      member({
        invitationId: "a",
        progress: { ...EMPTY, onboarded: true, useCases: 2, scores: 1 },
        approvals: { onboarding: "approved", first_use_case: "submitted" },
      }),
    );
    expect(m.steps.map((s) => s.status)).toEqual([
      "approved",
      "submitted",
      "ready",
      "locked",
      "locked",
      "locked",
    ]);
    expect(m.stepsDone).toBe(3);
    expect(m.percent).toBe(50);
    expect(m.nextStep).toBe("first_use_case");
    expect(m.awaitingApproval).toBe(1);
  });

  test("an invited seat that has not joined shows no progress", () => {
    const m = buildMemberProgress(member({ invitationId: "b", userId: null, progress: null }));
    expect(m.joined).toBe(false);
    expect(m.stepsDone).toBe(0);
  });

  test("summary averages joined members only and counts each step", () => {
    const rows = [
      buildMemberProgress(
        member({
          invitationId: "a",
          progress: {
            ...EMPTY,
            onboarded: true,
            useCases: 1,
            scores: 1,
            portfolioItems: 1,
            roadmapItems: 1,
            checkpoints: 1,
          },
        }),
      ),
      buildMemberProgress(member({ invitationId: "b" })),
      buildMemberProgress(member({ invitationId: "c", userId: null, progress: null })),
    ];
    const s = summarizeCohortProgress(rows);
    expect(s.seats).toBe(3);
    expect(s.joined).toBe(2);
    expect(s.notJoined).toBe(1);
    expect(s.finished).toBe(1);
    expect(s.averagePercent).toBe(50);
    expect(s.funnel[0]).toMatchObject({ key: "onboarding", reached: 1, approved: 0 });
  });

  test("members waiting for approval are listed first", () => {
    const sorted = sortByNeedsAttention([
      buildMemberProgress(member({ invitationId: "low" })),
      buildMemberProgress(
        member({
          invitationId: "waiting",
          progress: { ...EMPTY, onboarded: true },
          approvals: { onboarding: "submitted" },
        }),
      ),
    ]);
    expect(sorted[0]!.invitationId).toBe("waiting");
  });
});
