/**
 * Unit tests for privacy-conscious navigation analytics helpers.
 * Pure functions only — no network. Run with `bun run test:unit`.
 */
import { describe, expect, test } from "bun:test";

import { PRODUCT_EVENTS } from "../../src/lib/telemetry/events";
import {
  moduleFromPath,
  moduleFromSectionId,
  planFromTier,
  roleCategoryFromWorkspaceRole,
  sanitizeNavProperties,
  workspaceTypeFromPlan,
} from "../../src/lib/telemetry/navigation-analytics";

describe("navigation product catalogue", () => {
  test("nav events are namespaced and present in PRODUCT_EVENTS", () => {
    const expected = [
      PRODUCT_EVENTS.navigationClicked,
      PRODUCT_EVENTS.sidebarExpanded,
      PRODUCT_EVENTS.sidebarCollapsed,
      PRODUCT_EVENTS.workspaceSwitched,
      PRODUCT_EVENTS.commandPaletteOpened,
      PRODUCT_EVENTS.searchUsed,
      PRODUCT_EVENTS.moduleOpened,
      PRODUCT_EVENTS.navVariantActive,
      PRODUCT_EVENTS.navRenderError,
    ];
    for (const name of expected) {
      expect(name.startsWith("nav.")).toBe(true);
      expect(Object.values(PRODUCT_EVENTS)).toContain(name);
    }
  });

  test("nav.search_used is distinct from CTA search_used string", () => {
    expect(PRODUCT_EVENTS.searchUsed).toBe("nav.search_used");
    expect(PRODUCT_EVENTS.searchUsed).not.toBe("search_used");
  });
});

describe("role / plan / workspace type mapping", () => {
  test("maps workspace roles and platform flag", () => {
    expect(roleCategoryFromWorkspaceRole("owner")).toBe("owner");
    expect(roleCategoryFromWorkspaceRole("Contributor")).toBe("contributor");
    expect(roleCategoryFromWorkspaceRole("not-a-role")).toBe("unknown");
    expect(roleCategoryFromWorkspaceRole("viewer", { isPlatformAdmin: true })).toBe("viewer");
    expect(roleCategoryFromWorkspaceRole(null, { isPlatformAdmin: true })).toBe("platform");
    expect(roleCategoryFromWorkspaceRole(undefined)).toBe("unknown");
  });

  test("maps plan tiers and org plan codes", () => {
    expect(planFromTier("pro")).toBe("pro");
    expect(planFromTier("gold")).toBe("unknown");
    expect(workspaceTypeFromPlan("enterprise")).toBe("enterprise");
    expect(workspaceTypeFromPlan("sovereign")).toBe("enterprise");
    expect(workspaceTypeFromPlan(null, "lite")).toBe("lite");
  });
});

describe("module derivation", () => {
  test("resolves modules from paths and section ids", () => {
    expect(moduleFromPath("/repository")).toBe("discover");
    expect(moduleFromPath("/studio/use-case/abc")).toBe("design");
    expect(moduleFromPath("/reports/portfolio")).toBe("reports");
    expect(moduleFromPath("/unknown-route")).toBeUndefined();
    expect(moduleFromSectionId("portfolio")).toBe("portfolio");
    expect(moduleFromSectionId("workspace-admin")).toBe("workspace_admin");
  });
});

describe("property allow-list", () => {
  test("keeps only approved metadata keys and drops confidential fields", () => {
    const out = sanitizeNavProperties({
      navigationItemId: "repository",
      module: "discover",
      workspaceType: "pro",
      roleCategory: "contributor",
      plan: "pro",
      surface: "sidebar",
      resultCount: 3.9,
      openVia: "shortcut",
      // @ts-expect-error intentional forbidden keys
      title: "Secret use case title",
      // @ts-expect-error
      search_query: "payroll fraud detection",
      // @ts-expect-error
      email: "a@b.com",
      // @ts-expect-error
      roi: 120000,
    } as never);

    expect(out).toEqual({
      navigationItemId: "repository",
      module: "discover",
      workspaceType: "pro",
      roleCategory: "contributor",
      plan: "pro",
      surface: "sidebar",
      resultCount: 3,
      openVia: "shortcut",
    });
    expect(out).not.toHaveProperty("title");
    expect(out).not.toHaveProperty("search_query");
    expect(out).not.toHaveProperty("email");
    expect(out).not.toHaveProperty("roi");
  });

  test("truncates long string ids", () => {
    const out = sanitizeNavProperties({
      navigationItemId: "x".repeat(200),
    });
    expect(String(out.navigationItemId).length).toBe(64);
  });
});
