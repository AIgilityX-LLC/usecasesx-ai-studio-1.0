/**
 * Role → tier → action authorization matrix.
 *
 * The UI gates every destructive control through `can()`, so this suite pins the
 * rules that matter for launch: viewers can save but never edit published
 * content, editors can author but not hard-delete, and only admins reach the
 * administration surfaces. It also proves the derivation is order-independent —
 * a user holding both `viewer` and `admin` is an admin.
 */
import { describe, expect, it } from "bun:test";
import { can, tierFromRoles, type PermissionAction } from "@/lib/permissions";
import type { AppRole } from "@/lib/usecasex.roles";

describe("tier derivation", () => {
  it("maps every admin-flavoured role to the admin tier", () => {
    const adminRoles: AppRole[] = ["admin", "super_admin", "ai_hub_admin", "usecasex_admin"];
    for (const role of adminRoles) expect(tierFromRoles([role])).toBe("admin");
  });

  it("maps authoring roles to editor", () => {
    const editorRoles: AppRole[] = [
      "editor",
      "moderator",
      "content_manager",
      "reviewer",
      "contributor",
    ];
    for (const role of editorRoles) expect(tierFromRoles([role])).toBe("editor");
  });

  it("defaults to the user tier for viewers and for no roles at all", () => {
    expect(tierFromRoles(["viewer"])).toBe("user");
    expect(tierFromRoles([])).toBe("user");
  });

  it("takes the highest tier regardless of role order", () => {
    expect(tierFromRoles(["viewer", "admin"])).toBe("admin");
    expect(tierFromRoles(["admin", "viewer"])).toBe("admin");
    expect(tierFromRoles(["viewer", "contributor"])).toBe("editor");
  });
});

describe("action matrix", () => {
  it("lets every signed-in tier browse and shortlist the repository", () => {
    for (const tier of ["admin", "editor", "user"] as const) {
      expect(can(tier, "repo.view")).toBe(true);
      expect(can(tier, "repo.save")).toBe(true);
    }
  });

  it("keeps published-content authoring away from the user tier", () => {
    expect(can("user", "repo.create")).toBe(false);
    expect(can("user", "repo.edit")).toBe(false);
    expect(can("editor", "repo.create")).toBe(true);
    expect(can("editor", "repo.edit")).toBe(true);
  });

  it("reserves hard-delete and administration for admins", () => {
    for (const action of ["repo.delete", "admin.taxonomy", "admin.users"] as PermissionAction[]) {
      expect(can("admin", action)).toBe(true);
      expect(can("editor", action)).toBe(false);
      expect(can("user", action)).toBe(false);
    }
  });

  it("allows own-row saved-item management at every tier (RLS scopes the rows)", () => {
    for (const action of ["saved.create", "saved.edit", "saved.delete"] as PermissionAction[]) {
      expect(can("user", action)).toBe(true);
    }
  });

  it("lets any tier create a board but restricts editing and item removal", () => {
    expect(can("user", "boards.create")).toBe(true);
    expect(can("user", "boards.addItem")).toBe(true);
    expect(can("user", "boards.edit")).toBe(false);
    expect(can("user", "boards.delete")).toBe(false);
    expect(can("user", "boards.removeItem")).toBe(false);
  });

  it("denies unknown actions rather than defaulting open", () => {
    expect(can("admin", "not.a.real.action" as PermissionAction)).toBe(false);
  });
});