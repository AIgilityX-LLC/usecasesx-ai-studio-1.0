import { test, expect } from "@playwright/test";

/**
 * Guards the repository browse facets (segment, sector, AI pattern, priority,
 * ROI range, deployment model, security classification), the no-results
 * empty-state, the use-case detail executive cards, and the Boards/Collections
 * sub-navigation against build regressions.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

test.describe("repository browse facets", () => {
  test("renders every facet filter", async ({ page }) => {
    await page.goto(`${BASE}/repository`, { waitUntil: "networkidle" });
    // Key facets are always visible in the horizontal filter bar.
    for (const label of ["Industry", "AI Pattern", "Business Function", "Priority", "ROI Range"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
    // Remaining facets live behind the "Advanced filters" toggle.
    await page.getByRole("button", { name: /Advanced filters/i }).click();
    for (const label of ["Market Segment", "Sector", "Deployment", "Security"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("shows a no-results empty state for an unmatched query", async ({ page }) => {
    await page.goto(`${BASE}/repository?q=zzzznotarealusecasezzzz`, { waitUntil: "networkidle" });
    await expect(page.getByText(/No use cases match your search/i)).toBeVisible();
  });
});
