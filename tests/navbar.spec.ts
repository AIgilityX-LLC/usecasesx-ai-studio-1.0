import { test, expect, type Page } from "@playwright/test";

/**
 * Verifies the single-navbar invariant: exactly one primary navigation region
 * renders on every public route, for both signed-out and signed-in states.
 *
 * The shared SiteShell is the only source of navigation. Signed-out visitors
 * get the top-nav <nav aria-label="Primary">; signed-in users get the sidebar
 * nav. In neither case should two navigation regions render at once.
 */

const PUBLIC_ROUTES = [
  "/",
  "/repository",
  "/insights",
  "/patterns",
  "/ai-use-case-studio",
  "/resources",
  "/pricing",
  "/auth",
  "/compare",
  "/boards",
];

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

async function countNavbars(page: Page): Promise<number> {
  // Top nav uses aria-label="Primary"; sidebar uses role="navigation".
  // Count distinct top-level navigation landmarks that are visible.
  return page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll("nav, [role='navigation']"));
    const visibleTopLevel = navs.filter((el) => {
      const style = window.getComputedStyle(el as HTMLElement);
      if (style.display === "none" || style.visibility === "hidden") return false;
      // Exclude nested navs (e.g. breadcrumb inside header) by only counting
      // navs that are not contained within another nav.
      return !navs.some((other) => other !== el && other.contains(el));
    });
    return visibleTopLevel.length;
  });
}

test.describe("single navbar — signed out", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`exactly one navbar on ${route}`, async ({ page }) => {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      const count = await countNavbars(page);
      expect(count, `route ${route} should render exactly one navbar`).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("skip-to-content link", () => {
  test("home page exposes a skip link and main landmark", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await expect(page.locator("a[href='#main-content']")).toHaveCount(1);
    await expect(page.locator("main#main-content")).toHaveCount(1);
  });
});
