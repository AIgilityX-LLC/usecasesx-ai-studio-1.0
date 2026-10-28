import { describe, expect, test } from "bun:test";
import {
  HIERARCHY_LEVELS,
  buildHierarchyPath,
  childLevel,
  isDescendantLevel,
} from "@/lib/tenancy/hierarchy";
import { TENANCY_SCHEMA_BINDING, asTenant } from "@/lib/tenancy/models";
import {
  assertClientTenantNotAuthoritative,
  buildTenantContext,
  deriveActiveScope,
  tenantScopeIds,
} from "@/lib/tenancy/tenant-context";
import { AuthorizationService } from "@/lib/tenancy/authorization-service";
import { EntitlementService } from "@/lib/tenancy/entitlement-service";
import { PolicyService } from "@/lib/tenancy/policy-service";
import { filterByActiveWorkspace, ignoreClientTenantId, requireTenantScope } from "@/lib/tenancy/scope";
import { DomainError } from "@/lib/domain/errors";
import { DEFAULT_FOUNDING_ACCESS } from "@/lib/authz/editions";

const memberships = [
  {
    id: "ws-a",
    name: "Alpha",
    organizationId: "org-a",
    organizationName: "Acme",
    role: "admin",
    orgStatus: "active",
  },
  {
    id: "ws-b",
    name: "Beta",
    organizationId: "org-b",
    organizationName: "Other",
    role: "viewer",
    orgStatus: "active",
  },
  {
    id: "ws-s",
    name: "Suspended",
    organizationId: "org-s",
    organizationName: "Paused",
    role: "admin",
    orgStatus: "suspended",
  },
];

describe("hierarchy", () => {
  test("orders Platform → Tenant → BU → Portfolio → Program → Use Case", () => {
    expect([...HIERARCHY_LEVELS]).toEqual([
      "platform",
      "tenant",
      "business_unit",
      "portfolio",
      "program",
      "use_case",
    ]);
    expect(childLevel("tenant")).toBe("business_unit");
    expect(isDescendantLevel("tenant", "use_case")).toBe(true);
    expect(isDescendantLevel("use_case", "tenant")).toBe(false);
  });

  test("schema binding keeps organizations as tenant", () => {
    expect(TENANCY_SCHEMA_BINDING.tenant).toBe("organizations");
    expect(TENANCY_SCHEMA_BINDING.subscriptions).toBe("entitlements");
  });

  test("buildHierarchyPath prefers tenantId over organizationId alias", () => {
    const path = buildHierarchyPath({
      organizationId: "org-1",
      tenantId: "org-1",
      portfolioId: "p1",
      workspaceId: "ws-1",
    });
    expect(path.tenantId).toBe("org-1");
    expect(path.portfolioId).toBe("p1");
    expect(path.workspaceId).toBe("ws-1");
    expect(path.platform).toBe(true);
  });
});

describe("TenantContext derivation", () => {
  test("derives active scope from membership, not preferred foreign workspace", () => {
    const scope = deriveActiveScope(memberships, "ws-unknown", "ws-a");
    expect(scope.workspaceId).toBe("ws-a");
    expect(scope.organizationId).toBe("org-a");
    expect(scope.status).toBe("ready");
  });

  test("honors preferred workspace only when member", () => {
    const scope = deriveActiveScope(memberships, "ws-b", "ws-a");
    expect(scope.workspaceId).toBe("ws-b");
    expect(scope.organizationId).toBe("org-b");
  });

  test("never selects suspended org membership", () => {
    const onlySuspended = memberships.filter((m) => m.orgStatus === "suspended");
    const scope = deriveActiveScope(onlySuspended, "ws-s", "ws-s");
    expect(scope.workspaceId).toBeNull();
    expect(scope.status).toBe("suspended");
  });

  test("rejects client tenant id that disagrees with membership context", () => {
    const check = assertClientTenantNotAuthoritative(
      { tenantId: "org-forged" },
      { organizationId: "org-a", workspaceId: "ws-a" },
    );
    expect(check.ok).toBe(false);
  });

  test("buildTenantContext marks derivedFrom authenticated_membership", () => {
    const ctx = buildTenantContext({
      userId: "u1",
      organization: { id: "org-a", name: "Acme", plan: "pro" },
      workspace: { id: "ws-a", name: "Alpha" },
      orgRole: "owner",
      workspaceRole: "admin",
      orgStatus: "active",
      planCode: "pro_founding",
      expiresAt: "2026-12-31T00:00:00.000Z",
      availableWorkspaces: memberships,
      status: "ready",
    });
    expect(ctx.derivedFrom).toBe("authenticated_membership");
    expect(ctx.tenant).toEqual(asTenant({ id: "org-a", name: "Acme", plan: "pro" }));
    expect(ctx.subscription.source).toBe("entitlements");
    expect(ctx.hierarchy.tenantId).toBe("org-a");
    expect(tenantScopeIds(ctx)).toEqual({ organizationId: "org-a", workspaceId: "ws-a" });
  });
});

describe("AuthorizationService", () => {
  test("assertResourceInTenant allows matching workspace", () => {
    const ctx = buildTenantContext({
      userId: "u1",
      organization: { id: "org-a", name: "Acme", plan: null },
      workspace: { id: "ws-a", name: "Alpha" },
      orgRole: "admin",
      workspaceRole: "admin",
      orgStatus: "active",
      planCode: null,
      expiresAt: null,
      availableWorkspaces: memberships,
      status: "ready",
    });
    expect(() =>
      AuthorizationService.assertResourceInTenant({ workspace_id: "ws-a" }, ctx),
    ).not.toThrow();
    expect(() =>
      AuthorizationService.assertResourceInTenant({ workspace_id: "ws-b" }, ctx),
    ).toThrow(DomainError);
  });

  test("assertSameWorkspace blocks cross-tenant", () => {
    expect(() => AuthorizationService.assertSameWorkspace("ws-a", "ws-b")).toThrow(DomainError);
  });
});

describe("EntitlementService", () => {
  test("subscriptionFromRow maps entitlements ledger", () => {
    const sub = EntitlementService.subscriptionFromRow({
      organization_id: "org-a",
      plan_code: "enterprise",
      expires_at: null,
      source: "manual",
    });
    expect(sub?.edition).toBe("enterprise");
    expect(sub?.organizationId).toBe("org-a");
  });

  test("ignores revoked subscription rows", () => {
    expect(
      EntitlementService.subscriptionFromRow({
        organization_id: "org-a",
        plan_code: "pro",
        expires_at: null,
        revoked_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  test("quotasForEdition uses fair-use defaults", () => {
    const q = EntitlementService.quotasForEdition("pro");
    expect(q.aiPerUserPerDay).toBeGreaterThan(0);
    expect(q.edition).toBe("pro");
  });

  test("effectiveSubscriptionEdition prefers org plan when valid", () => {
    const edition = EntitlementService.effectiveSubscriptionEdition(
      { organization_id: "org-a", plan_code: "enterprise", expires_at: null },
      DEFAULT_FOUNDING_ACCESS,
      { storedTier: "lite" },
    );
    expect(edition).toBe("enterprise");
  });
});

describe("PolicyService", () => {
  test("defaultPolicy allows default AI route only", () => {
    const policy = PolicyService.defaultPolicy("org-a");
    expect(PolicyService.isRouteAllowed(policy, null)).toBe(true);
    expect(policy.allowedAiProviderRoutes).toContain("default");
  });
});

describe("scope helpers", () => {
  test("requireTenantScope needs ready membership context", () => {
    const ready = buildTenantContext({
      userId: "u1",
      organization: { id: "org-a", name: "Acme", plan: null },
      workspace: { id: "ws-a", name: "Alpha" },
      orgRole: "admin",
      workspaceRole: "admin",
      orgStatus: "active",
      planCode: null,
      expiresAt: null,
      availableWorkspaces: memberships,
      status: "ready",
    });
    expect(requireTenantScope(ready)).toEqual({
      organizationId: "org-a",
      workspaceId: "ws-a",
    });

    const empty = buildTenantContext({
      userId: "u1",
      organization: null,
      workspace: null,
      orgRole: null,
      workspaceRole: null,
      orgStatus: null,
      planCode: null,
      expiresAt: null,
      availableWorkspaces: [],
      status: "no_workspace",
    });
    expect(() => requireTenantScope(empty)).toThrow(DomainError);
  });

  test("filterByActiveWorkspace scopes lists without client tenant id", () => {
    const ctx = buildTenantContext({
      userId: "u1",
      organization: { id: "org-a", name: "Acme", plan: null },
      workspace: { id: "ws-a", name: "Alpha" },
      orgRole: "admin",
      workspaceRole: "admin",
      orgStatus: "active",
      planCode: null,
      expiresAt: null,
      availableWorkspaces: memberships,
      status: "ready",
    });
    const rows = [
      { id: 1, workspace_id: "ws-a" },
      { id: 2, workspace_id: "ws-b" },
    ];
    expect(filterByActiveWorkspace(rows, ctx).map((r) => r.id)).toEqual([1]);
  });

  test("ignoreClientTenantId strips forged tenant fields", () => {
    const cleaned = ignoreClientTenantId({
      tenant_id: "forged",
      organizationId: "forged-org",
      title: "Keep me",
    });
    expect(cleaned).toMatchObject({ title: "Keep me", _clientTenantIdIgnored: true });
    expect("tenant_id" in cleaned).toBe(false);
    expect("organizationId" in cleaned).toBe(false);
  });
});
