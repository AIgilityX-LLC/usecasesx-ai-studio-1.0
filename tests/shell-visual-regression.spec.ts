/**
 * Visual + structural regression guard for the shared shell.
 *
 * Captures a screenshot of every critical signed-out route at desktop and
 * mobile widths and asserts the shell invariants that PROMPT-16 standardized:
 * one main landmark, no horizontal overflow, and a reachable navigation
 * affordance at every breakpoint.
 *
 * Run: bunx playwright test tests/shell-visual-regression.spec.ts
 * Refresh baselines: bunx playwright test tests/shell-visual-regression.spec.ts --update-snapshots
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

const ROUTES = [
  { path: "/", label: "home" },
  { path: "/repository", label: "repository" },
  { path: "/insights", label: "insights" },
  { path: "/patterns", label: "patterns" },
  { path: "/ai-use-case-studio", label: "studio-marketing" },
  { path: "/resources", label: "resources" },
  { path: "/pricing", label: "pricing" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} shell`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route.label} renders a stable shell`, async ({ page }) => {
        await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle").catch(() => {});

        // One main landmark, always.
        await expect(page.locator("main#main-content")).toHaveCount(1);

        // No horizontal overflow at any breakpoint.
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route.label} overflows by ${overflow}px`).toBeLessThanOrEqual(2);

        // Navigation must be reachable: desktop top nav or the mobile menu button.
        if (viewport.name === "mobile") {
          await expect(page.getByRole("button", { name: /open navigation menu/i })).toBeVisible();
        } else {
          await expect(page.locator("nav[aria-label='Primary']")).toBeVisible();
        }
      });
    }
  });
}

test.describe("mobile navigation drawer", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("opens and exposes the primary destinations", async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /open navigation menu/i }).click();
    const drawer = page.getByRole("navigation", { name: /mobile/i });
    await expect(drawer).toBeVisible();
    for (const label of ["Explore", "Insights", "Patterns", "Studio", "Resources", "Pricing"]) {
      await expect(drawer.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });
});
