import { describe, expect, test } from "bun:test";
import { assertCanApproveUseCase, canApproveUseCase } from "@/lib/authz/abac";
import { mappingForEnterpriseRole } from "@/lib/authz/enterprise-roles";
import { permissionsForSubject } from "@/lib/authz/scoped-permissions";

describe("enterprise role catalogue", () => {
  test("maps portfolio admin onto admin + portfolio_manager bundle", () => {
    const m = mappingForEnterpriseRole("portfolio_admin");
    expect(m.workspaceRole).toBe("admin");
    expect(m.bundles).toContain("portfolio_manager");
    expect(m.isPlatformAdmin).toBe(false);
  });

  test("platform super admin is platform-only", () => {
    const m = mappingForEnterpriseRole("platform_super_admin");
    expect(m.workspaceRole).toBeNull();
    expect(m.isPlatformAdmin).toBe(true);
  });

  test("approver mapping yields decide via executive_reviewer bundle", () => {
    const m = mappingForEnterpriseRole("approver");
    const perms = permissionsForSubject({
      workspaceRole: m.workspaceRole,
      bundles: m.bundles,
      isPlatformAdmin: m.isPlatformAdmin,
    });
    expect(perms.has("decide")).toBe(true);
  });
});

describe("ABAC approve use case", () => {
  const baseSubject = {
    workspaceRole: "admin" as const,
    bundles: ["portfolio_manager" as const],
    actorWorkspaceId: "ws-a",
    authorizedBusinessUnitIds: ["bu-finance"],
    approvalValueLimit: 250_000,
  };

  test("allows when unit and value are in authority", () => {
    expect(
      canApproveUseCase(baseSubject, {
        workspaceId: "ws-a",
        businessUnitId: "bu-finance",
        estimatedValue: 100_000,
      }),
    ).toEqual({ ok: true });
  });

  test("denies cross-tenant", () => {
    const d = canApproveUseCase(baseSubject, {
      workspaceId: "ws-b",
      businessUnitId: "bu-finance",
      estimatedValue: 10,
    });
    expect(d.ok).toBe(false);
  });

  test("denies wrong business unit", () => {
    const d = canApproveUseCase(baseSubject, {
      workspaceId: "ws-a",
      businessUnitId: "bu-hr",
      estimatedValue: 10,
    });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toMatch(/Business unit/i);
  });

  test("denies value above threshold", () => {
    const d = canApproveUseCase(baseSubject, {
      workspaceId: "ws-a",
      businessUnitId: "bu-finance",
      estimatedValue: 500_000,
    });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toMatch(/exceeds/i);
  });

  test("denies without decide permission", () => {
    const d = canApproveUseCase(
      { ...baseSubject, workspaceRole: "viewer", bundles: [] },
      {
        workspaceId: "ws-a",
        businessUnitId: "bu-finance",
        estimatedValue: 10,
      },
    );
    expect(d.ok).toBe(false);
  });

  test("assert throws on denial", () => {
    expect(() =>
      assertCanApproveUseCase(baseSubject, {
        workspaceId: "ws-a",
        businessUnitId: "bu-hr",
        estimatedValue: 1,
      }),
    ).toThrow();
  });
});
