/**
 * Export receipt ↔ audit trail.
 *
 * The receipt is only worth showing if it points at the row governance
 * actually stored. This spec exports as an authorised user, reads the audit
 * event id off the receipt, fetches that row back through the Data API as the
 * same user, and asserts the stored record agrees with what was displayed.
 *
 * Run: bunx playwright test tests/report-export-receipt.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.E2E_EMAIL ?? "pro@demo.usecasex.app";
const PASSWORD = process.env.E2E_PASSWORD ?? "Demo@123";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authenticate(page: Page) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const session = await res.json();
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  await page.goto(`${BASE}/`);
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
    key: `sb-${ref}-auth-token`,
    value: JSON.stringify(session),
  });
  return session.access_token as string;
}

async function fetchAuditEvent(token: string, id: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/audit_events?id=eq.${id}&select=id,event_type,request_id,created_at,new_value,severity`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
  );
  expect(res.ok, `audit fetch ${res.status}`).toBe(true);
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows[0];
}

test("receipt identifies the audit row that was appended", async ({ page }) => {
  const token = await authenticate(page);

  await page.goto(`${BASE}/reports/use-case-business-case`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /generate report/i }).click();
  await expect(page.locator("#usecasex-report")).toBeVisible({ timeout: 20_000 });

  const waiter = page.waitForEvent("download", { timeout: 20_000 });
  await page.getByRole("button", { name: /export use cases \(csv\)/i }).click();
  const file = await waiter;

  const receipt = page.getByTestId("export-receipt");
  await expect(receipt).toBeVisible();

  const auditId = (await page.getByTestId("receipt-audit-id").innerText()).trim();
  const requestId = (await page.getByTestId("receipt-request-id").innerText()).trim();
  const shownFile = (await page.getByTestId("receipt-file").innerText()).trim();
  expect(auditId).toMatch(UUID);
  expect(shownFile).toBe(file.suggestedFilename());

  const row = await fetchAuditEvent(token, auditId);
  expect(row, "the receipt points at a real audit row").toBeTruthy();
  expect(row["event_type"]).toBe("export.generated");
  expect(row["request_id"]).toBe(requestId);

  const next = row["new_value"] as Record<string, unknown>;
  expect(next["format"]).toBe("csv");
  expect(next["outcome"]).toBe("completed");
  expect(next["filename"]).toBe(shownFile);

  // The provenance lines on screen are the provenance lines in the record.
  const shownProvenance = await page
    .getByTestId("receipt-provenance")
    .locator("li")
    .allInnerTexts();
  expect(next["provenance"]).toEqual(shownProvenance.map((line) => line.trim()));

  // And the recorded timestamp is the one displayed.
  const recordedAt = (await page.getByTestId("receipt-recorded-at").innerText()).trim();
  expect(new Date(recordedAt).getTime()).toBe(new Date(String(row["created_at"])).getTime());
});
