/**
 * Real-browser E2E: verifies the Portfolio PDF export actually downloads
 * a valid PDF file (starts with the "%PDF-" magic bytes).
 *
 * Run: bunx playwright test tests/pdf-export.spec.ts
 *
 * Env:
 *   E2E_BASE_URL   default http://localhost:8080
 *   E2E_EMAIL      default pro@demo.usecasex.app
 *   E2E_PASSWORD   default Demo@123
 */
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const EMAIL = process.env.E2E_EMAIL ?? "pro@demo.usecasex.app";
const PASSWORD = process.env.E2E_PASSWORD ?? "Demo@123";

async function signIn(page: Page) {
  await page.goto("/auth");
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 20_000 });
}

test("portfolio PDF export downloads a valid PDF", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/studio/portfolio");
  const btn = page.getByRole("button", { name: /export portfolio pdf/i });
  await expect(btn).toBeVisible({ timeout: 20_000 });

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 20_000 }),
    btn.click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const buf = await readFile(path!);
  expect(buf.slice(0, 5).toString("utf8")).toBe("%PDF-");
  expect(buf.byteLength).toBeGreaterThan(500);
});
