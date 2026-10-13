import { describe, expect, it } from "bun:test";
import {
  isOrgMembershipActive,
  pickActiveWorkspace,
  type WorkspaceMembershipOption,
} from "@/lib/workspace-selection";

const ws = (
  partial: Partial<WorkspaceMembershipOption> & Pick<WorkspaceMembershipOption, "id" | "name">,
): WorkspaceMembershipOption => ({
  organizationId: partial.organizationId ?? "org-1",
  organizationName: partial.organizationName ?? "ACME Group",
  role: partial.role ?? "contributor",
  orgStatus: partial.orgStatus ?? "active",
  ...partial,
});

describe("workspace selection", () => {
  it("treats missing org status as active", () => {
    expect(isOrgMembershipActive(undefined)).toBe(true);
    expect(isOrgMembershipActive("suspended")).toBe(false);
  });

  it("returns no_workspace when the user has no memberships", () => {
    const result = pickActiveWorkspace([], "any", null);
    expect(result.status).toBe("no_workspace");
    expect(result.active).toBeNull();
  });

  it("returns suspended when every membership org is suspended", () => {
    const result = pickActiveWorkspace(
      [ws({ id: "w1", name: "A", orgStatus: "suspended" })],
      "w1",
      "w1",
    );
    expect(result.status).toBe("suspended");
    expect(result.active).toBeNull();
    expect(result.selectable).toHaveLength(0);
  });

  it("prefers the last-selected workspace when it is still a member", () => {
    const available = [
      ws({ id: "w1", name: "Alpha" }),
      ws({ id: "w2", name: "Enterprise AI Portfolio" }),
    ];
    const result = pickActiveWorkspace(available, "w2", "w1");
    expect(result.active?.id).toBe("w2");
    expect(result.status).toBe("ready");
  });

  it("ignores a preferred id the user is not a member of", () => {
    const available = [ws({ id: "w1", name: "Alpha" })];
    const result = pickActiveWorkspace(available, "not-a-member", "w1");
    expect(result.active?.id).toBe("w1");
  });

  it("falls back to the provisioned workspace then the first selectable", () => {
    const available = [ws({ id: "w1", name: "Alpha" }), ws({ id: "w2", name: "Beta" })];
    expect(pickActiveWorkspace(available, null, "w2").active?.id).toBe("w2");
    expect(pickActiveWorkspace(available, null, null).active?.id).toBe("w1");
  });
});
