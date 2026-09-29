/**
 * V2-03 — Canonical lifecycle transitions, scoped permissions, SoD, tenancy.
 */
import { describe, expect, it } from "bun:test";
import {
  assertTransition,
  canTransition,
  ForbiddenTransitionError,
  MissingPermissionError,
  permissionForTransition,
  prepareLifecycleTransition,
  mapStatus,
  allKnownMappings,
  UNMAPPED_STATUS_VALUES,
  assertTransitionTableComplete,
  CANONICAL_STATES,
} from "@/lib/lifecycle";
import {
  hasScopedPermission,
  permissionsForSubject,
  assertSameTenantMembership,
  BUNDLE_SCOPED_PERMISSIONS,
  type PermissionSubject,
} from "@/lib/authz/scoped-permissions";
import { assertNotSelfReview, SELF_REVIEW_DENIED } from "@/lib/submissions";

describe("canonical transition table", () => {
  it("covers every canonical state", () => {
    expect(() => assertTransitionTableComplete()).not.toThrow();
    expect(CANONICAL_STATES.length).toBe(14);
  });

  it("allows under_review → approved_pilot and requires decide", () => {
    expect(canTransition("under_review", "approved_pilot")).toBe(true);
    expect(permissionForTransition("under_review", "approved_pilot")).toBe("decide");
  });

  it("forbids archived → production", () => {
    expect(canTransition("archived", "production")).toBe(false);
    expect(() => assertTransition("archived", "production", () => true)).toThrow(
      ForbiddenTransitionError,
    );
  });

  it("rejects a viewer attempting a decide transition", () => {
    expect(() =>
      assertTransition("under_review", "rejected", (p) => p === "view"),
    ).toThrow(MissingPermissionError);
  });
});

describe("status mapping preserves records", () => {
  it("maps known opportunity statuses", () => {
    expect(mapStatus("opportunity", "signal").canonical).toBe("idea");
    expect(mapStatus("opportunity", "deferred").canonical).toBe("on_hold");
  });

  it("maps use_case published → production", () => {
    expect(mapStatus("use_case", "published").canonical).toBe("production");
  });

  it("reports unmapped values without coercing", () => {
    const bad = mapStatus("use_case", "not_a_real_status");
    expect(bad.ok).toBe(false);
    expect(bad.canonical).toBeNull();
  });

  it("exports an explicit unmapped inventory", () => {
    expect(UNMAPPED_STATUS_VALUES.length).toBeGreaterThan(0);
    expect(allKnownMappings().length).toBeGreaterThan(20);
  });
});

describe("scoped permissions + Enterprise bundles", () => {
  it("keeps launch viewer read-only", () => {
    const subject: PermissionSubject = { workspaceRole: "viewer" };
    expect(hasScopedPermission(subject, "view")).toBe(true);
    expect(hasScopedPermission(subject, "edit")).toBe(false);
    expect(hasScopedPermission(subject, "decide")).toBe(false);
  });

  it("does not replace admin with contributor", () => {
    const subject: PermissionSubject = { workspaceRole: "contributor" };
    expect(hasScopedPermission(subject, "edit")).toBe(true);
    expect(hasScopedPermission(subject, "admin")).toBe(false);
    expect(hasScopedPermission(subject, "decide")).toBe(false);
  });

  it("adds executive_reviewer decide without granting admin", () => {
    const subject: PermissionSubject = {
      workspaceRole: "contributor",
      bundles: ["executive_reviewer"],
    };
    expect(hasScopedPermission(subject, "decide")).toBe(true);
    expect(hasScopedPermission(subject, "admin")).toBe(false);
    expect([...permissionsForSubject(subject)]).toEqual(
      expect.arrayContaining([...BUNDLE_SCOPED_PERMISSIONS.executive_reviewer]),
    );
  });

  it("technical_reviewer can review but not decide", () => {
    const subject: PermissionSubject = {
      workspaceRole: "viewer",
      bundles: ["technical_reviewer"],
    };
    expect(hasScopedPermission(subject, "review")).toBe(true);
    expect(hasScopedPermission(subject, "decide")).toBe(false);
  });
});

describe("self-approval restriction", () => {
  it("denies decide when actor owns the record", () => {
    const actor = "user-a";
    expect(() =>
      prepareLifecycleTransition({
        from: "under_review",
        to: "approved_pilot",
        subject: { workspaceRole: "admin" },
        subjectUserId: actor,
        actorUserId: actor,
        entityType: "use_case",
        entityId: "uc-1",
        workspaceId: "ws-1",
        actorWorkspaceId: "ws-1",
      }),
    ).toThrow(SELF_REVIEW_DENIED);
  });

  it("allows decide when a different reviewer acts", () => {
    const result = prepareLifecycleTransition({
      from: "under_review",
      to: "approved_pilot",
      subject: { workspaceRole: "admin" },
      subjectUserId: "author",
      actorUserId: "reviewer",
      entityType: "use_case",
      entityId: "uc-1",
      workspaceId: "ws-1",
      actorWorkspaceId: "ws-1",
    });
    expect(result.requiredPermission).toBe("decide");
    expect(result.auditEvents.some((e) => e.event === "lifecycle.transitioned")).toBe(true);
  });

  it("assertNotSelfReview still rejects equal ids", () => {
    expect(() => assertNotSelfReview("x", "x")).toThrow();
  });
});

describe("cross-tenant access", () => {
  it("denies when workspace ids differ", () => {
    expect(() =>
      assertSameTenantMembership({ workspaceRole: "admin" }, "ws-a", "ws-b"),
    ).toThrow(/Cross-tenant/);
  });

  it("denies when the actor has no membership", () => {
    expect(() =>
      assertSameTenantMembership({ workspaceRole: null }, "ws-a", "ws-a"),
    ).toThrow(/membership/);
  });

  it("blocks prepareLifecycleTransition across tenants", () => {
    expect(() =>
      prepareLifecycleTransition({
        from: "designing",
        to: "review_ready",
        subject: { workspaceRole: "contributor" },
        actorUserId: "u1",
        entityType: "use_case",
        entityId: "uc-1",
        workspaceId: "ws-a",
        actorWorkspaceId: "ws-b",
      }),
    ).toThrow(/Cross-tenant/);
  });
});
