/**
 * Real-browser E2E: verifies the Portfolio PDF export actually downloads
 * a valid PDF file (starts with the "%PDF-" magic bytes).
 *
 * Run: bun run test:pdf   (or `bunx playwright test tests/pdf-export.spec.ts`)
 *
 * Env:
 *   E2E_BASE_URL   default http://localhost:8080
 *   E2E_EMAIL      default pro@demo.usecasex.app
 *   E2E_PASSWORD   default Demo@123
 */
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const EMAIL = process.env.E2E_EMAIL ?? "pro@demo.usecasex.app";
const PASSWORD = process.env.E2E_PASSWORD ?? "Demo@123";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page.getByLabel(/email/i).first().fill(EMAIL);
  await page.getByLabel(/password/i).first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 15_000 });
}

test("portfolio PDF export downloads a valid PDF", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  await page.goto("/studio/portfolio");
  await expect(page.getByRole("button", { name: /export portfolio pdf/i })).toBeVisible({ timeout: 15_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /export portfolio pdf/i }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const buf = await readFile(path!);
  expect(buf.slice(0, 5).toString("utf8")).toBe("%PDF-");
  expect(buf.byteLength).toBeGreaterThan(1000);
});

test("lite PDF lead modal opens on use-case detail page", async ({ page }) => {
  // The Lite PDF is gated behind a lead-capture modal — verify the modal
  // opens (the modal submit path is covered by the lead-capture unit tests).
  await page.goto("/repository");
  const firstCard = page.locator("a[href^='/use-cases/']").first();
  await expect(firstCard).toBeVisible({ timeout: 15_000 });
  await firstCard.click();
  await page.waitForURL(/\/use-cases\//);
  const btn = page.getByRole("button", { name: /download lite pdf/i });
  await expect(btn).toBeVisible({ timeout: 15_000 });
  await btn.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
});
