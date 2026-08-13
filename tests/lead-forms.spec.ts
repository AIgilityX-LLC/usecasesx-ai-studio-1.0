import { test, expect } from "@playwright/test";

/**
 * Verifies the two footer conversion flows end to end: client validation,
 * submission into the lead pipeline, and the confirmation state with a
 * reference code the visitor can quote.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const REFERENCE = /^UCX-[0-9A-F]{8}$/;

async function openFooterCtas(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/?utm_source=e2e&utm_medium=test&utm_campaign=lead-forms`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

test.describe("waitlist CTA", () => {
  test("validates input, submits and shows a reference code", async ({ page }) => {
    await openFooterCtas(page);
    await page
      .getByRole("button", { name: /Join the Waitlist/i })
      .first()
      .click();

    const dialog = page.locator('[aria-labelledby="lead-capture-title"]');
    await expect(dialog).toBeVisible();

    // Empty submit must be blocked client-side with a visible message.
    await dialog
      .getByRole("button", { name: /submit|join|request/i })
      .first()
      .click();
    await expect(dialog.getByText(/required|enter/i).first()).toBeVisible();

    const stamp = Date.now();
    await dialog.getByLabel(/Full name/i).fill("Pilot Executive");
    await dialog.getByLabel(/Work email/i).fill(`waitlist.${stamp}@e2e.usecasesx.test`);
    await dialog.getByLabel(/Organization/i).fill("Public Sector Agency");
    const consent = dialog.getByRole("checkbox").first();
    if (await consent.isVisible().catch(() => false)) await consent.check();
    await dialog
      .getByRole("button", { name: /submit|join|request/i })
      .first()
      .click();

    await expect(dialog.getByText(/Thank you/i)).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByTestId("lead-reference")).toHaveText(REFERENCE);
  });
});

test.describe("advisor CTA", () => {
  test("rejects an invalid email then confirms with a reference code", async ({ page }) => {
    await openFooterCtas(page);
    await page
      .getByRole("button", { name: /Talk to Our Advisor/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Talk to our advisor/i)).toBeVisible();

    await dialog.getByLabel(/Full name/i).fill("Agency CIO");
    await dialog.getByLabel(/Work email/i).fill("not-an-email");
    await dialog.getByLabel(/Organization/i).fill("Ministry of Digital");
    await dialog.getByRole("button", { name: /Request an advisor session/i }).click();
    await expect(dialog.getByText(/valid work email/i)).toBeVisible();

    await dialog.getByLabel(/Work email/i).fill(`advisor.${Date.now()}@e2e.usecasesx.test`);
    await dialog.getByRole("button", { name: /Request an advisor session/i }).click();

    await expect(dialog.getByText(/Request received/i)).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByTestId("advisor-reference")).toHaveText(REFERENCE);
  });
});
