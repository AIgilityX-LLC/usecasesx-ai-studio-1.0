import { describe, expect, it } from "vitest";
import {
  REVIEW_STATUS_META,
  REVIEW_STATUSES,
  seatLimitFor,
  seatUsage,
  summariseAuditEvent,
  inviteInputSchema,
  commentInputSchema,
} from "@/lib/collab";

describe("collaboration seats", () => {
  it("caps Lite at a single seat and Pro at the founding fair-use limit", () => {
    expect(seatLimitFor("lite")).toBe(1);
    expect(seatLimitFor("pro")).toBe(8);
    expect(seatLimitFor("enterprise")).toBeNull();
  });

  it("counts pending invitations against the limit", () => {
    const usage = seatUsage("pro", 6, 2);
    expect(usage.remaining).toBe(0);
    expect(usage.atLimit).toBe(true);
  });

  it("never reports a limit for Enterprise", () => {
    const usage = seatUsage("enterprise", 40, 5);
    expect(usage.remaining).toBeNull();
    expect(usage.atLimit).toBe(false);
  });
});

describe("review statuses", () => {
  it("describes every status without claiming regulatory approval", () => {
    for (const status of REVIEW_STATUSES) {
      const meta = REVIEW_STATUS_META[status];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.toLowerCase()).not.toContain("regulator");
    }
  });
});

describe("audit summaries", () => {
  it("renders attributable summaries for collaboration events", () => {
    expect(summariseAuditEvent("collab.comment.added", null)).toBe("Added a review note");
    expect(summariseAuditEvent("collab.review_status.changed", { status: "reviewed" })).toBe(
      "Moved to Reviewed",
    );
    expect(summariseAuditEvent("membership.invited", { email: "a@b.com", role: "viewer" })).toContain(
      "a@b.com",
    );
  });
});

describe("input validation", () => {
  it("rejects empty review notes", () => {
    expect(() =>
      commentInputSchema.parse({
        entityType: "use_case",
        entityId: "00000000-0000-0000-0000-000000000000",
        body: "   ",
      }),
    ).toThrow();
  });

  it("defaults invitations to contributor for 14 days", () => {
    const parsed = inviteInputSchema.parse({ email: "a@b.com" });
    expect(parsed.role).toBe("contributor");
    expect(parsed.expiresInDays).toBe(14);
  });
});
