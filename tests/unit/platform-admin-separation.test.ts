import { describe, expect, it } from "bun:test";
import {
  PLATFORM_ADMIN_NAV_SECTIONS,
  PLATFORM_ADMIN_REDIRECTS,
  collectPlatformAdminNavTargets,
} from "@/lib/navigation/platform-admin-nav";
import { ENTERPRISE_NAV_SECTIONS, collectEnterpriseNavTargets } from "@/lib/navigation/enterprise-nav";
import { EXPECTED_REDIRECTS } from "@/lib/nav-integrity";
import { capabilityForRoute, hasNavCapability } from "@/lib/authz/nav-capabilities";
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";

describe("platform admin separation", () => {
  it("does not leak platform-admin destinations into the customer sidebar", () => {
    const customer = collectEnterpriseNavTargets();
    const platform = collectPlatformAdminNavTargets();
    for (const t of platform) {
      expect(customer).not.toContain(t);
    }
    expect(ENTERPRISE_NAV_SECTIONS.some((s) => s.requireCapability === "platform.manage")).toBe(
      false,
    );
  });

  it("keeps Review Inbox as tenant workspace functionality", () => {
    const govern = ENTERPRISE_NAV_SECTIONS.find((s) => s.id === "govern");
    expect(govern?.items?.some((i) => i.to === "/reviews")).toBe(true);
    expect(capabilityForRoute("/reviews")).toBe("decision.read");
  });

  it("classifies Export & AI Activity as workspace administration", () => {
    expect(capabilityForRoute("/admin-observability")).toBe("workspace.manage");
  });

  it("requires platform.manage for every platform-admin nav target", () => {
    for (const to of collectPlatformAdminNavTargets()) {
      expect(capabilityForRoute(to)).toBe("platform.manage");
    }
  });

  it("registers legacy redirects for migrated routes", () => {
    for (const [from, to] of Object.entries(PLATFORM_ADMIN_REDIRECTS)) {
      expect(EXPECTED_REDIRECTS[from]).toBe(to);
    }
  });

  it("denies platform.manage to workspace owners without platform roles", () => {
    const tenantOwner = {
      userId: "owner-1",
      workspaceRole: "owner" as const,
      isPlatformAdminTier: false,
      appRoles: [] as const,
    };
    expect(hasNavCapability(tenantOwner, "platform.manage")).toBe(false);
    expect(hasNavCapability(tenantOwner, "workspace.manage")).toBe(true);
  });

  it("exposes a non-empty platform nav and known platform roles", () => {
    expect(PLATFORM_ADMIN_NAV_SECTIONS.length).toBeGreaterThan(2);
    expect(PLATFORM_ADMIN_ROLES).toContain("super_admin");
    expect(PLATFORM_ADMIN_ROLES).toContain("usecasex_admin");
  });
});
