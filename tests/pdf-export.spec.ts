/**
 * Real-browser E2E: verifies the Portfolio PDF export actually downloads
 * a valid PDF (starts with the "%PDF-" magic bytes).
 *
 * Signs in via the Supabase Auth REST API and injects the resulting session
 * into localStorage before navigating — the UI form's onAuthStateChange
 * redirect is racy under Playwright, so we bypass it.
 *
 * Run: bunx playwright test tests/pdf-export.spec.ts
 *
 * Env:
 *   E2E_BASE_URL              default http://localhost:8080
 *   SUPABASE_URL              required
 *   SUPABASE_PUBLISHABLE_KEY  required
 *   E2E_EMAIL                 default pro@demo.usecasex.app
 *   E2E_PASSWORD              default Demo@123
 */
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const EMAIL = process.env.E2E_EMAIL ?? "pro@demo.usecasex.app";
const PASSWORD = process.env.E2E_PASSWORD ?? "Demo@123";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

async function mintSession(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function signInViaStorage(page: Page, email: string, password: string) {
  const session = await mintSession(email, password);
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const key = `sb-${ref}-auth-token`;
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key, value: JSON.stringify(session) },
  );
}

async function seedOnePortfolioItem(session: { access_token: string; user: { id: string } }) {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const wsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_user_workspace`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const workspaceId = (await wsRes.json()) as string;
  const boardRes = await fetch(`${SUPABASE_URL}/rest/v1/use_case_boards`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      workspace_id: workspaceId,
      title: `PDF-Test board ${Date.now()}`,
      board_type: "studio",
      status: "active",
      created_by: session.user.id,
    }),
  });
  const boardJson = await boardRes.json();
  const board = Array.isArray(boardJson) ? boardJson[0] : boardJson;
  if (!board?.id) throw new Error(`board insert failed: ${JSON.stringify(boardJson)}`);
  const ucRes = await fetch(`${SUPABASE_URL}/rest/v1/ai_use_cases`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      board_id: board.id,
      title: "PDF export smoke case",
      problem_statement: "Ensure Portfolio PDF export renders at least one row.",
      status: "approved",
      priority_score: 82,
      risk_level: "Medium",
      created_by: session.user.id,
    }),
  });
  if (!ucRes.ok) throw new Error(`use_case insert failed: ${ucRes.status} ${await ucRes.text()}`);
}

test("portfolio PDF export downloads a valid PDF", async ({ page }) => {
  test.setTimeout(90_000);
  if (!SUPABASE_URL || !SUPABASE_KEY) test.skip(true, "Supabase env not set");

  const session = await mintSession(EMAIL, PASSWORD);
  await seedOnePortfolioItem(session);
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: `sb-${ref}-auth-token`, value: JSON.stringify(session) },
  );
  await page.goto(`${BASE}/studio/portfolio`);
  const btn = page.getByRole("button", { name: /export portfolio pdf/i });
  await expect(btn).toBeVisible({ timeout: 20_000 });

  // Wait for the portfolio data to load (Total counter > 0)
  await expect(page.locator('text=/Ranked by priority|1\\s*Total|Total\\s*1/').first()).toBeVisible({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    btn.click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const buf = await readFile(path!);
  expect(buf.slice(0, 5).toString("utf8")).toBe("%PDF-");
  expect(buf.byteLength).toBeGreaterThan(500);
});
