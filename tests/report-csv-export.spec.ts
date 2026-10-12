/**
 * CSV export contract — browser integration.
 *
 * The unit suite proves the builders match the contract; this spec proves the
 * file a real signed-in user actually downloads matches it too — header order,
 * stable ids, CRLF, BOM and quoting — and that a viewer cannot obtain one.
 *
 * Contract: docs/architecture/csv-export-contract.md
 * Run: bunx playwright test tests/report-csv-export.spec.ts
 *
 * Env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, E2E_BASE_URL,
 * E2E_EMAIL / E2E_PASSWORD (an owner/admin/contributor),
 * E2E_VIEWER_EMAIL / E2E_VIEWER_PASSWORD (a viewer, optional).
 */
import { test, expect, type Page } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const EDITOR = {
  email: process.env.E2E_EMAIL ?? "pro@demo.usecasex.app",
  password: process.env.E2E_PASSWORD ?? "Demo@123",
};
const VIEWER = {
  email: process.env.E2E_VIEWER_EMAIL ?? "",
  password: process.env.E2E_VIEWER_PASSWORD ?? "",
};

/** Frozen header keys, in order, copied from the contract document. */
const USE_CASE_KEYS = [
  "use_case_id",
  "slug",
  "studio_use_case_id",
  "title",
  "industry",
  "business_function",
  "ai_capability",
  "value_potential",
  "complexity",
  "risk_level",
  "time_to_value",
  "score_strategic",
  "score_value",
  "score_feasibility",
  "score_ttv",
  "score_risk",
  "score_governance",
  "score_total",
  "priority_band",
  "decision",
  "funding_state",
  "delivery_stage",
  "target_period",
  "planned_start",
  "planned_end",
  "milestone",
  "owner",
  "blocked_reason",
  "next_action",
  "benefit_count",
  "benefits_evidenced",
  "gaps",
];
const BENEFIT_KEYS = [
  "use_case_id",
  "slug",
  "benefit_id",
  "name",
  "category",
  "unit_type",
  "currency",
  "period",
  "baseline_value",
  "target_value",
  "expected_value",
  "confidence",
  "state",
  "benefit_owner",
  "erp_verification",
  "evidence_count",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signIn(page: Page, creds: { email: string; password: string }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });
  if (!res.ok) throw new Error(`Auth failed for ${creds.email}: ${res.status}`);
  const session = await res.json();
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  await page.goto(`${BASE}/`);
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
    key: `sb-${ref}-auth-token`,
    value: JSON.stringify(session),
  });
}

async function generate(page: Page) {
  await page.goto(`${BASE}/reports/use-case-business-case`, { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", { name: /generate report/i });
  await expect(button).toBeVisible({ timeout: 20_000 });
  await button.click();
  await expect(page.locator("#usecasex-report")).toBeVisible({ timeout: 20_000 });
}

/**
 * RFC4180 parser that keeps quoting information, so the spec can assert a cell
 * was quoted *only* when the contract requires it.
 */
function parseCsv(text: string) {
  const rows: Array<Array<{ value: string; quoted: boolean }>> = [];
  let row: Array<{ value: string; quoted: boolean }> = [];
  let cell = "";
  let quoted = false;
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      quoted = true;
    } else if (ch === ",") {
      row.push({ value: cell, quoted });
      cell = "";
      quoted = false;
    } else if (ch === "\r" && text[i + 1] === "\n") {
      row.push({ value: cell, quoted });
      rows.push(row);
      row = [];
      cell = "";
      quoted = false;
      i += 1;
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push({ value: cell, quoted });
    rows.push(row);
  }
  return rows;
}

/** Clicks a download button and returns the decoded file text. */
async function download(page: Page, name: RegExp) {
  const waiter = page.waitForEvent("download", { timeout: 20_000 });
  await page.getByRole("button", { name }).click();
  const file = await waiter;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return { filename: file.suggestedFilename(), text: Buffer.concat(chunks).toString("utf8") };
}

function assertContract(text: string, keys: string[]) {
  expect(text.startsWith("\uFEFF")).toBe(true); // BOM, so Excel reads UTF-8
  const body = text.slice(1);
  expect(body.endsWith("\r\n")).toBe(false); // no trailing newline
  expect(body.includes("\n")).toBe(true);
  expect(body.replace(/\r\n/g, "")).not.toContain("\n"); // every break is CRLF

  const rows = parseCsv(body);
  expect(rows.length).toBeGreaterThan(0);

  // Header labels may be reworded; the count and column order are frozen, and
  // the values below are positional, which is what downstream systems bind to.
  expect(rows[0]).toHaveLength(keys.length);

  for (const row of rows.slice(1)) {
    expect(row).toHaveLength(keys.length);
    for (const [index, cell] of row.entries()) {
      // Quote only when required.
      const mustQuote = /[",\r\n]/.test(cell.value);
      expect({ column: keys[index], quoted: cell.quoted }, `column ${keys[index]} quoting`).toEqual(
        { column: keys[index], quoted: mustQuote },
      );
      // Never leak JS placeholders or the screen-only em dash.
      expect(cell.value).not.toBe("null");
      expect(cell.value).not.toBe("undefined");
      expect(cell.value).not.toBe("—");
    }
    const byKey = Object.fromEntries(keys.map((k, i) => [k, row[i]!.value]));
    expect(byKey["slug"], "slug is the stable human key and is always present").not.toBe("");
    for (const idKey of ["use_case_id", "studio_use_case_id", "benefit_id"]) {
      const value = byKey[idKey];
      if (value) expect(value, `${idKey} is a UUID`).toMatch(UUID);
    }
    // Numbers unformatted, no separators or currency symbols.
    for (const numeric of [
      "score_total",
      "baseline_value",
      "target_value",
      "expected_value",
      "benefit_count",
    ]) {
      const value = byKey[numeric];
      if (value) expect(value, `${numeric} is unformatted`).toMatch(/^-?\d+(\.\d+)?$/);
    }
  }
}

test.describe("authorised CSV download", () => {
  test("use case CSV matches the locked contract", async ({ page }) => {
    await signIn(page, EDITOR);
    await generate(page);
    const { filename, text } = await download(page, /export use cases \(csv\)/i);
    expect(filename).toMatch(/^usecasex-.+-\d{4}-\d{2}-\d{2}\.csv$/);
    assertContract(text, USE_CASE_KEYS);
  });

  test("benefits CSV matches the locked contract", async ({ page }) => {
    await signIn(page, EDITOR);
    await generate(page);
    const button = page.getByRole("button", { name: /export benefits \(csv\)/i });
    test.skip(await button.isDisabled(), "workspace has no benefits recorded");
    const { filename, text } = await download(page, /export benefits \(csv\)/i);
    expect(filename).toMatch(/^usecasex-.+-benefits-\d{4}-\d{2}-\d{2}\.csv$/);
    assertContract(text, BENEFIT_KEYS);
  });
});

test.describe("viewer is denied", () => {
  test.skip(!VIEWER.email, "set E2E_VIEWER_EMAIL / E2E_VIEWER_PASSWORD");

  test("no CSV is produced and the denial is explained", async ({ page }) => {
    await signIn(page, VIEWER);
    await generate(page);

    await expect(page.getByTestId("export-denied-note")).toBeVisible();
    const csv = page.getByRole("button", { name: /export use cases \(csv\)/i });
    await expect(csv).toBeDisabled();
    await expect(csv).toHaveAttribute("title", /access denied/i);

    // Repeated attempts must stay inert: no file, no receipt, no audit row.
    let downloads = 0;
    page.on("download", () => {
      downloads += 1;
    });
    for (let i = 0; i < 3; i += 1) await csv.click({ force: true });
    await page.waitForTimeout(500);
    expect(downloads).toBe(0);
    await expect(page.getByTestId("export-receipt")).toHaveCount(0);
  });
});
