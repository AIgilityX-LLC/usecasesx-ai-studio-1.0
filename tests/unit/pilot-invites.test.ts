import { describe, expect, it } from "bun:test";
import {
  describeDispatch,
  invitationLink,
  invitationLinksCsv,
  invitationMessage,
  planInvitationDispatch,
  type InviteDispatchResult,
} from "@/lib/pilot/pilot.invites";
import type { PilotInvitation } from "@/lib/pilot/pilot.model";

function seat(overrides: Partial<PilotInvitation> = {}): PilotInvitation {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    cohort: "founding-pilot-2026-08",
    email: "ada@example.gov",
    fullName: "Ada Lovelace",
    organization: "Ministry",
    status: "invited",
    userId: null,
    notes: null,
    inviteToken: "tok_abcdefghijklmnop",
    invitedAt: "2026-08-11T00:00:00.000Z",
    registeredAt: null,
    activatedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("pilot invitation delivery", () => {
  it("builds a claim link on the serving origin without a double slash", () => {
    expect(invitationLink("https://usecasesx.aigilityx.com/", "tok 1")).toBe(
      "https://usecasesx.aigilityx.com/pilot?invite=tok%201",
    );
  });

  it("addresses the participant and carries the claim link", () => {
    const message = invitationMessage({
      fullName: "Ada Lovelace",
      organization: "Ministry",
      cohort: "c1",
      link: "https://x.test/pilot?invite=t",
    });
    expect(message.body).toContain("Hello Ada Lovelace,");
    expect(message.body).toContain("https://x.test/pilot?invite=t");
    expect(message.body).toContain("c1");
  });

  it("skips revoked seats, claimed seats and seats without a token", () => {
    const { rows, skipped } = planInvitationDispatch(
      [
        seat(),
        seat({ id: "2", email: "revoked@example.gov", status: "revoked" }),
        seat({ id: "3", email: "claimed@example.gov", userId: "user-1" }),
        seat({ id: "4", email: "notoken@example.gov", inviteToken: null }),
      ],
      { origin: "https://x.test" },
    );
    expect(rows.map((r) => r.email)).toEqual(["ada@example.gov"]);
    expect(skipped.map((s) => s.email)).toEqual([
      "revoked@example.gov",
      "claimed@example.gov",
      "notoken@example.gov",
    ]);
  });

  it("includes claimed seats on a resend but never revoked ones", () => {
    const { rows } = planInvitationDispatch(
      [seat({ userId: "user-1" }), seat({ id: "2", status: "revoked" })],
      { origin: "https://x.test", includeClaimed: true },
    );
    expect(rows).toHaveLength(1);
  });

  it("honours an explicit seat selection", () => {
    const { rows } = planInvitationDispatch([seat(), seat({ id: "2", email: "b@example.gov" })], {
      origin: "https://x.test",
      invitationIds: ["2"],
    });
    expect(rows.map((r) => r.email)).toEqual(["b@example.gov"]);
  });

  it("quotes CSV handout rows", () => {
    const csv = invitationLinksCsv([
      { email: "a@example.gov", fullName: 'Ada "A" L', link: "https://x.test/pilot?invite=t" },
    ]);
    expect(csv.split("\n")[0]).toBe("Email,Name,Claim link");
    expect(csv).toContain('"Ada ""A"" L"');
  });

  it("summarises a dispatch run", () => {
    const result: InviteDispatchResult = {
      cohort: "c1",
      planned: 3,
      sent: 0,
      blocked: 3,
      alreadySent: 1,
      failed: 0,
      skipped: [{ email: "x@example.gov", reason: "Seat is revoked." }],
      blockedReason: "no sender domain",
      links: [],
    };
    expect(describeDispatch(result)).toBe("3 planned · 3 link-only · 1 already sent · 1 skipped");
  });
});
