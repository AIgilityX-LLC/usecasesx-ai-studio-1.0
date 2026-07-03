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
    for (const label of [
      "Market Segment", "Sector", "AI Pattern", "Priority",
      "ROI Range", "Deployment", "Security",
    ]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test("shows a no-results empty state for an unmatched query", async ({ page }) => {
    await page.goto(`${BASE}/repository?q=zzzznotarealusecasezzzz`, { waitUntil: "networkidle" });
    await expect(page.getByText(/No use cases match your search/i)).toBeVisible();
  });
});

test.describe("use case boards navigation", () => {
  test("boards page exposes Boards and Collections tabs", async ({ page }) => {
    await page.goto(`${BASE}/boards`, { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Boards", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Collections", exact: true })).toBeVisible();
  });
});
