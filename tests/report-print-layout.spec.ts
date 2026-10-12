/**
 * Paper-fit checks for the generated reports, run in Chromium, Firefox and
 * WebKit (see the `*-print` projects in playwright.config.ts).
 *
 * Clipping is a horizontal-overflow problem: the print pipeline scales the
 * page to the paper width and cuts anything wider than the printable area. So
 * each engine renders the report at the CSS pixel width of A4 and Letter under
 * print media emulation, and the spec asserts nothing inside the report
 * document exceeds its container. Line breaking and text metrics differ per
 * engine, which is exactly why this runs three times.
 *
 * `page.pdf()` is Chromium-only, so the real PDF byte check additionally runs
 * there.
 *
 * Run: bunx playwright test tests/report-print-layout.spec.ts
 *
 * Env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, E2E_EMAIL, E2E_PASSWORD,
 * E2E_BASE_URL (default http://localhost:8080).
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "pro@demo.usecasex.app";
const PASSWORD = process.env.E2E_PASSWORD ?? "Demo@123";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

/** Printable width in CSS px at 96dpi, less 12mm margins on each side. */
const PAPERS = [
  { name: "A4", format: "A4" as const, cssWidth: 794 - 91 },
  { name: "Letter", format: "Letter" as const, cssWidth: 816 - 91 },
];

const LONG_NARRATIVE = `${"Sustained multi-year transformation across every operating region and shared service centre. ".repeat(
  40,
)}Supercalifragilisticexpialidocious-benefit-realisation-workstream-identifier-000000001`;

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
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
    key: `sb-${ref}-auth-token`,
    value: JSON.stringify(session),
  });
}

async function generateReport(page: Page) {
  await page.goto(`${BASE}/reports/use-case-business-case`, { waitUntil: "domcontentloaded" });
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
      // A horizontally scrollable box looks fine on screen and clips on paper.
      const overflow = Math.max(rect.right - limit, el.scrollWidth - el.clientWidth - 1);
      if (overflow > 1) {
        bad.push({
          tag: `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`,
          text: (el.textContent ?? "").trim().slice(0, 60),
          overflow: Math.round(overflow),
        });
      }
    }
    return bad;
  });
}

for (const paper of PAPERS) {
  test(`report fits ${paper.name} without clipping`, async ({ page, browserName }) => {
    await signIn(page);
    await page.setViewportSize({ width: paper.cssWidth, height: 1400 });
    await generateReport(page);
    await page.emulateMedia({ media: "print" });

    expect(await overflowingElements(page)).toEqual([]);

    if (browserName !== "chromium") return; // page.pdf() is Chromium-only
    const pdf = await page.pdf({
      format: paper.format,
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  });

  test(`long narrative and table-heavy portfolio still fit ${paper.name}`, async ({
    page,
    browserName,
  }) => {
    await signIn(page);
    await page.setViewportSize({ width: paper.cssWidth, height: 1400 });
    await page.goto(`${BASE}/reports/use-case-business-case`, { waitUntil: "domcontentloaded" });

    // Prefer the portfolio-led report: it carries the matrix and the widest tables.
    const typeSelect = page.getByLabel(/report type/i);
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.click();
      const option = page.getByRole("option", { name: /portfolio/i }).first();
      if (await option.isVisible().catch(() => false)) await option.click();
    }

    // Select every available use case so the tables are as long as the data allows.
    const selectAll = page.getByRole("button", { name: /select all/i }).first();
    if (await selectAll.isVisible().catch(() => false)) await selectAll.click();

    const generate = page.getByRole("button", { name: /generate report/i });
    await expect(generate).toBeVisible({ timeout: 20_000 });
    await generate.click();
    await expect(page.locator("#usecasex-report")).toBeVisible({ timeout: 20_000 });

    // Unbroken prose and a very long token must wrap, not widen the page.
    const narrative = page.getByLabel("Executive narrative");
    if (await narrative.isVisible().catch(() => false)) await narrative.fill(LONG_NARRATIVE);

    await page.emulateMedia({ media: "print" });
    expect(await overflowingElements(page)).toEqual([]);

    if (browserName !== "chromium") return;
    const pdf = await page.pdf({ format: paper.format, printBackground: true });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
}
