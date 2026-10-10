/**
 * Navigation Role × Capability matrix.
 *
 * Pins that tenant personas never receive platform.manage, and that sidebar /
 * route capability resolution stays aligned with ROLE_CAPABILITY_MAP.
 */
import { describe, expect, it } from "bun:test";
import {
  AUTHENTICATED_BASELINE,
  NAV_ROUTE_CAPABILITIES,
  ROLE_CAPABILITY_MAP,
  capabilityForRoute,
  hasNavCapability,
  resolveNavCapabilities,
  resolveNavPersonas,
  type NavCapability,
  type NavPersona,
} from "@/lib/authz/nav-capabilities";

const MATRIX_PERSONAS: NavPersona[] = [
  "EXECUTIVE",
  "AI_LEADER",
  "BUSINESS_OWNER",
  "PORTFOLIO_MANAGER",
  "FINANCE_REVIEWER",
  "GOVERNANCE_REVIEWER",
  "WORKSPACE_ADMIN",
  "PLATFORM_ADMIN",
];

function personaHas(persona: NavPersona, cap: NavCapability): boolean {
  return ROLE_CAPABILITY_MAP[persona].includes(cap);
}

describe("ROLE_CAPABILITY_MAP — platform isolation", () => {
  it("never grants platform.manage to tenant personas", () => {
    const tenant: NavPersona[] = [
      "EXECUTIVE",
      "AI_LEADER",
      "PORTFOLIO_MANAGER",
      "BUSINESS_OWNER",
      "USE_CASE_OWNER",
      "FINANCE_REVIEWER",
      "GOVERNANCE_REVIEWER",
      "WORKSPACE_ADMIN",
    ];
    for (const persona of tenant) {
      expect(personaHas(persona, "platform.manage")).toBe(false);
    }
  });

  it("grants platform.manage only to PLATFORM_ADMIN and SUPER_ADMIN", () => {
    expect(personaHas("PLATFORM_ADMIN", "platform.manage")).toBe(true);
    expect(personaHas("SUPER_ADMIN", "platform.manage")).toBe(true);
  });

  it("grants workspace.manage to workspace and platform admins only", () => {
    expect(personaHas("WORKSPACE_ADMIN", "workspace.manage")).toBe(true);
    expect(personaHas("PLATFORM_ADMIN", "workspace.manage")).toBe(true);
    expect(personaHas("USE_CASE_OWNER", "workspace.manage")).toBe(false);
    expect(personaHas("EXECUTIVE", "workspace.manage")).toBe(false);
  });
});

describe("doc matrix spot-checks", () => {
  const cases: Array<[NavCapability, Record<NavPersona, boolean>]> = [
    [
      "dashboard.read",
      {
        EXECUTIVE: true,
        AI_LEADER: true,
        BUSINESS_OWNER: true,
        PORTFOLIO_MANAGER: true,
        FINANCE_REVIEWER: true,
        GOVERNANCE_REVIEWER: true,
        WORKSPACE_ADMIN: true,
        PLATFORM_ADMIN: true,
        USE_CASE_OWNER: true,
        SUPER_ADMIN: true,
      },
    ],
    [
      "decision.approve",
      {
        EXECUTIVE: false,
        AI_LEADER: true,
        BUSINESS_OWNER: false,
        PORTFOLIO_MANAGER: false,
        FINANCE_REVIEWER: false,
        GOVERNANCE_REVIEWER: true,
        WORKSPACE_ADMIN: true,
        PLATFORM_ADMIN: true,
        USE_CASE_OWNER: false,
        SUPER_ADMIN: true,
      },
    ],
    [
      "platform.manage",
      {
        EXECUTIVE: false,
        AI_LEADER: false,
        BUSINESS_OWNER: false,
        PORTFOLIO_MANAGER: false,
        FINANCE_REVIEWER: false,
        GOVERNANCE_REVIEWER: false,
        WORKSPACE_ADMIN: false,
        PLATFORM_ADMIN: true,
        USE_CASE_OWNER: false,
        SUPER_ADMIN: true,
      },
    ],
  ];

  for (const [cap, expected] of cases) {
    it(`maps ${cap} across personas`, () => {
      for (const persona of MATRIX_PERSONAS) {
        expect(personaHas(persona, cap)).toBe(expected[persona]!);
      }
    });
  }
});

describe("resolveNavPersonas / capabilities from existing roles", () => {
  it("maps workspace viewer → EXECUTIVE without platform.manage", () => {
    const ctx = {
      userId: "u1",
      workspaceRole: "viewer" as const,
      appRoles: ["user" as const],
      isPlatformAdminTier: false,
    };
    expect(resolveNavPersonas(ctx)).toContain("EXECUTIVE");
    expect(hasNavCapability(ctx, "platform.manage")).toBe(false);
    expect(hasNavCapability(ctx, "dashboard.read")).toBe(true);
    expect(hasNavCapability(ctx, "decision.read")).toBe(true);
  });

  it("maps workspace owner → WORKSPACE_ADMIN + AI_LEADER with workspace.manage", () => {
    const ctx = {
      userId: "u1",
      workspaceRole: "owner" as const,
      appRoles: [] as const,
      isPlatformAdminTier: false,
    };
    const personas = resolveNavPersonas(ctx);
    expect(personas).toContain("WORKSPACE_ADMIN");
    expect(personas).toContain("AI_LEADER");
    expect(hasNavCapability(ctx, "workspace.manage")).toBe(true);
    expect(hasNavCapability(ctx, "platform.manage")).toBe(false);
  });

  it("maps ADMIN_TIER → PLATFORM_ADMIN with platform.manage", () => {
    const ctx = {
      userId: "u1",
      workspaceRole: "contributor" as const,
      appRoles: ["usecasex_admin" as const],
      isPlatformAdminTier: true,
    };
    expect(resolveNavPersonas(ctx)).toContain("PLATFORM_ADMIN");
    expect(hasNavCapability(ctx, "platform.manage")).toBe(true);
  });

  it("maps super_admin → SUPER_ADMIN with full set", () => {
    const ctx = {
      userId: "u1",
      workspaceRole: null,
      appRoles: ["super_admin" as const],
      isPlatformAdminTier: true,
    };
    expect(resolveNavPersonas(ctx)).toEqual(["SUPER_ADMIN"]);
    expect(hasNavCapability(ctx, "platform.manage")).toBe(true);
    expect(resolveNavCapabilities(ctx).size).toBeGreaterThan(20);
  });

  it("keeps authenticated baseline for members without a workspace role", () => {
    const ctx = {
      userId: "u1",
      workspaceRole: null,
      appRoles: ["user" as const],
      isPlatformAdminTier: false,
    };
    for (const cap of AUTHENTICATED_BASELINE) {
      expect(hasNavCapability(ctx, cap)).toBe(true);
    }
    expect(hasNavCapability(ctx, "platform.manage")).toBe(false);
    expect(hasNavCapability(ctx, "workspace.manage")).toBe(false);
  });

  it("adds GOVERNANCE_REVIEWER from risk_reviewer bundle", () => {
    const ctx = {
      userId: "u1",
      workspaceRole: "viewer" as const,
      appRoles: [] as const,
      bundles: ["risk_reviewer" as const],
    };
    expect(resolveNavPersonas(ctx)).toContain("GOVERNANCE_REVIEWER");
    expect(hasNavCapability(ctx, "decision.approve")).toBe(true);
  });
});

describe("NAV_ROUTE_CAPABILITIES alignment", () => {
  it("keeps platform administration on platform.manage", () => {
    expect(NAV_ROUTE_CAPABILITIES["/administration"]).toBe("platform.manage");
    expect(NAV_ROUTE_CAPABILITIES["/admin-submissions"]).toBe("platform.manage");
    expect(NAV_ROUTE_CAPABILITIES["/admin-observability"]).toBe("workspace.manage");
    expect(NAV_ROUTE_CAPABILITIES["/reviews"]).toBe("decision.read");
    expect(NAV_ROUTE_CAPABILITIES["/reports"]).toBe("report.read");
  });

  it("resolves nested administration paths via prefix", () => {
    expect(capabilityForRoute("/administration/leads")).toBe("platform.manage");
    expect(capabilityForRoute("/administration/founding-access")).toBe("platform.manage");
  });

  it("denies platform routes for plain contributor", () => {
    const ctx = {
      userId: "u1",
      workspaceRole: "contributor" as const,
      isPlatformAdminTier: false,
      appRoles: ["user" as const],
    };
    expect(hasNavCapability(ctx, capabilityForRoute("/administration")!)).toBe(false);
    expect(hasNavCapability(ctx, capabilityForRoute("/admin-observability")!)).toBe(false);
    expect(hasNavCapability(ctx, capabilityForRoute("/reviews")!)).toBe(true);
    expect(hasNavCapability(ctx, capabilityForRoute("/reports")!)).toBe(true);
  });
});
