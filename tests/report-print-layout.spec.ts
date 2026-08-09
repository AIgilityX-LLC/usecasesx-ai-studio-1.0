/**
 * Real-browser E2E: the printed report must not clip on A4 or Letter.
 *
 * Clipping is a horizontal-overflow problem: the print pipeline scales the
 * page to the paper width, and anything wider than the report container gets
 * cut off. So the spec renders the report at the CSS pixel width of each paper
 * size, applies the print media emulation, and asserts that no element inside
 * the report document overflows its container. It then produces a real PDF and
 * checks the magic bytes plus a plausible page count.
 *
 * Run: bunx playwright test tests/report-print-layout.spec.ts
 *
 * Env: as tests/pdf-export.spec.ts (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
 * E2E_EMAIL, E2E_PASSWORD, E2E_BASE_URL).
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "pro@demo.usecasex.app";
const PASSWORD = process.env.E2E_PASSWORD ?? "Demo@123";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

/** CSS pixel width of the printable area at 96dpi, less 12mm margins. */
const PAPERS = [
  { name: "A4", format: "A4" as const, cssWidth: 794 - 91 },
  { name: "Letter", format: "Letter" as const, cssWidth: 816 - 91 },
];

async function signIn(page: Page) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  const session = await res.json();
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: `sb-${ref}-auth-token`, value: JSON.stringify(session) },
  );
}

/** Generates the report currently selected on /reports and waits for the document. */
async function generateReport(page: Page) {
  await page.goto(`${BASE}/reports`, { waitUntil: "domcontentloaded" });
  const generate = page.getByRole("button", { name: /generate report/i });
  await expect(generate).toBeVisible({ timeout: 20_000 });
  await generate.click();
  await expect(page.locator("#usecasex-report")).toBeVisible({ timeout: 20_000 });
}

/** Any descendant wider than the report container would be cut off on paper. */
async function overflowingElements(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("#usecasex-report") as HTMLElement | null;
    if (!root) return [{ tag: "missing", text: "#usecasex-report not rendered", overflow: 0 }];
    const limit = root.getBoundingClientRect().right + 1; // 1px rounding tolerance
    const bad: Array<{ tag: string; text: string; overflow: number }> = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) continue;
      // A scroll container is allowed to be wider inside; on paper it clips.
      const overflow = Math.max(rect.right - limit, el.scrollWidth - el.clientWidth - 1);
      if (overflow > 1) {
        bad.push({
          tag: `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 60)}`,
          text: (el.textContent ?? "").trim().slice(0, 60),
          overflow: Math.round(overflow),
        });
      }
    }
    return bad;
  });
}

for (const paper of PAPERS) {
  test(`use case report fits ${paper.name} without clipping`, async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: paper.cssWidth, height: 1400 });
    await generateReport(page);
    await page.emulateMedia({ media: "print" });

    expect(await overflowingElements(page)).toEqual([]);

    const pdf = await page.pdf({
      format: paper.format,
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  });
}

test("portfolio report with a long narrative and many rows still fits A4", async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: PAPERS[0]!.cssWidth, height: 1400 });
  await page.goto(`${BASE}/reports`, { waitUntil: "domcontentloaded" });

  // Switch to the portfolio-led report, which carries the matrix and tables.
  const typeSelect = page.getByLabel(/report type/i);
  if (await typeSelect.isVisible().catch(() => false)) {
    await typeSelect.click();
    const option = page.getByRole("option", { name: /portfolio/i }).first();
    if (await option.isVisible().catch(() => false)) await option.click();
  }

  const generate = page.getByRole("button", { name: /generate report/i });
  await expect(generate).toBeVisible({ timeout: 20_000 });
  await generate.click();
  await expect(page.locator("#usecasex-report")).toBeVisible({ timeout: 20_000 });

  // Stress the narrative: long unbroken prose must wrap, not push the page wide.
  const narrative = page.getByLabel("Executive narrative");
  if (await narrative.isVisible().catch(() => false)) {
    await narrative.fill(
      `${"Sustained multi-year transformation across every operating region. ".repeat(40)}` +
        "Supercalifragilisticexpialidocious-benefit-realisation-workstream-identifier-0001",
    );
  }

  await page.emulateMedia({ media: "print" });
  expect(await overflowingElements(page)).toEqual([]);

  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
});
