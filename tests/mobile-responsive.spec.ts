/**
 * Mobile viewport smoke — 375×812 (iPhone 12 mini).
 * Verifies core signed-out surfaces render without horizontal overflow and
 * primary CTAs are tappable on mobile.
 */
import { test, expect, devices } from "@playwright/test";

// iPhone 12 viewport/touch emulation on Chromium. The device descriptor
// defaults to WebKit, which is unavailable in some sandbox/CI images; the
// viewport smoke assertions here are engine-independent.
const { defaultBrowserType: _ignored, ...iphone12 } = devices["iPhone 12"];
test.use({ ...iphone12, defaultBrowserType: "chromium" });

const SURFACES = [
  { path: "/", label: "Landing" },
  { path: "/repository", label: "Repository" },
  { path: "/pricing", label: "Pricing" },
  { path: "/patterns", label: "Patterns" },
  { path: "/insights", label: "Insights" },
];

for (const { path, label } of SURFACES) {
  test(`${label} renders on mobile without horizontal overflow`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    // No horizontal scroll: document width should not exceed viewport width
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow, `${label} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(2);

    // Primary CTA / Sign in link should be visible (mobile header)
    const primaryCta = page.getByRole("link", { name: /get pro|plans|sign in|pricing/i }).first();
    await expect(primaryCta).toBeVisible();
  });
}

test("Mobile navigation: repository page shows a filter affordance", async ({ page }) => {
  await page.goto("/repository", { waitUntil: "domcontentloaded" });
  // Either an inline filter panel or a Filters button — one should be present.
  const filtersButton = page.getByRole("button", { name: /filter/i }).first();
  const anyFacet = page
    .locator("[data-facet], input[type='search'], input[placeholder*='Search' i]")
    .first();
  const hasFilters = await filtersButton.isVisible().catch(() => false);
  const hasSearch = await anyFacet.isVisible().catch(() => false);
  expect(hasFilters || hasSearch).toBeTruthy();
});
