import { describe, expect, it } from "bun:test";
import {
  ENTERPRISE_NAV_SECTIONS,
  collectEnterpriseNavTargets,
  sectionContainsPath,
  isNavItemActive,
} from "@/lib/navigation/enterprise-nav";

describe("enterprise nav config", () => {
  it("places Overview and Reports as body single-link sections", () => {
    const overview = ENTERPRISE_NAV_SECTIONS.find((s) => s.id === "overview");
    const reports = ENTERPRISE_NAV_SECTIONS.find((s) => s.id === "reports");
    expect(overview?.link?.to).toBe("/dashboard");
    expect(reports?.link?.to).toBe("/reports");
  });

  it("hides Integrations when the capability flag is off (no disabled stubs)", () => {
    const integrations = ENTERPRISE_NAV_SECTIONS.find((s) => s.id === "integrations");
    expect(integrations?.flag).toBe(false);
  });

  it("keeps platform ops out of the customer sidebar", () => {
    const admin = ENTERPRISE_NAV_SECTIONS.find((s) => s.id === "administration");
    expect(admin).toBeUndefined();
    const targets = collectEnterpriseNavTargets();
    expect(targets.some((t) => t.startsWith("/platform-admin"))).toBe(false);
    expect(targets.some((t) => t.startsWith("/administration"))).toBe(false);
  });

  it("keeps Export & AI Activity as workspace administration", () => {
    const ws = ENTERPRISE_NAV_SECTIONS.find((s) => s.id === "workspace-admin");
    expect(ws?.requireCapability).toBe("workspace.manage");
    expect(ws?.items?.some((i) => i.to === "/admin-observability")).toBe(true);
  });

  it("collects unique navigable targets", () => {
    const targets = collectEnterpriseNavTargets();
    expect(targets).toContain("/dashboard");
    expect(targets).toContain("/repository");
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("highlights parent section for nested studio routes", () => {
    const design = ENTERPRISE_NAV_SECTIONS.find((s) => s.id === "design")!;
    expect(sectionContainsPath(design, "/studio/use-case/abc")).toBe(true);
    expect(isNavItemActive("/studio", "/studio/use-case/abc")).toBe(true);
  });
});
