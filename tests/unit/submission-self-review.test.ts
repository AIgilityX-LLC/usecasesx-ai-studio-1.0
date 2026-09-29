/**
 * Segregation of duties — self-approval must be denied on review paths.
 */
import { describe, expect, it } from "bun:test";
import { assertNotSelfReview, SELF_REVIEW_DENIED } from "@/lib/submissions";
import { decideMilestone } from "@/lib/pilot/pilot.milestones.server";

describe("assertNotSelfReview (submission SoD)", () => {
  const owner = "11111111-1111-1111-1111-111111111111";
  const other = "22222222-2222-2222-2222-222222222222";

  it("denies when the reviewer is the submission owner (self-approval)", () => {
    expect(() => assertNotSelfReview(owner, owner)).toThrow(SELF_REVIEW_DENIED);
  });

  it("denies self-reject with the same message", () => {
    expect(() => assertNotSelfReview(owner, owner)).toThrow(/Segregation of duties/);
  });

  it("allows a different reviewer", () => {
    expect(() => assertNotSelfReview(owner, other)).not.toThrow();
  });

  it("no-ops when subject id is missing (caller still must load the row)", () => {
    expect(() => assertNotSelfReview(null, other)).not.toThrow();
    expect(() => assertNotSelfReview(undefined, other)).not.toThrow();
  });
});

describe("decideMilestone SoD", () => {
  it("denies when admin decides their own milestone without touching the DB", async () => {
    const uid = "33333333-3333-3333-3333-333333333333";
    // Stub client — SoD returns before any query.
    const supabase = {} as never;
    const result = await decideMilestone(supabase, {
      userId: uid,
      cohort: "test",
      key: "kickoff",
      decision: "approved",
      note: null,
      reviewerId: uid,
      reviewerLabel: "self@example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Segregation of duties/);
      expect(result.error).toMatch(/own pilot milestone/);
    }
  });
});
