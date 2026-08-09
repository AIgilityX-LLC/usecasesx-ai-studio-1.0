/**
 * Authenticated handoff lifecycle.
 *
 * Raises a real SARPI request from the queue surface, proves the consent
 * record is captured (and enforced where the target is confidential), and
 * checks the stored row carries the provenance the queue displays.
 */
import { adminClient, expect, pageAs, test } from "./fixtures/workspace";

test.describe.configure({ mode: "serial" });

async function openHandoffs(page: import("@playwright/test").Page) {
  await page.goto("/handoffs", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Suite handoffs" })).toBeVisible({
    timeout: 45_000,
  });
  // Controlled inputs in the dialog only accept text after hydration.
  await page.waitForTimeout(1500);
}

async function chooseRequestType(page: import("@playwright/test").Page, label: string) {
  await page.locator("#handoff-type").click();
  await page.getByRole("option", { name: label }).click();
}

test("raises a SARPI request, captures consent, and shows it in the queue with provenance", async ({
  browser,
  users,
}) => {
  const user = await users.create("handoff");
  const session = await pageAs(browser, user);
  const page = session.page;

  try {
    await openHandoffs(page);

    const title = `Readiness review ${Date.now().toString(36)}`;
    await page.getByRole("button", { name: "Request" }).first().click();

    await expect(page.getByText("What are you asking for?")).toBeVisible({ timeout: 20_000 });
    await chooseRequestType(page, "AI readiness assessment");
    await page.locator("#handoff-title").fill(title);
    await page.locator("#handoff-summary").fill("Confirm data and process readiness.");
    await page.locator("#sarpi-org").fill("E2E Test Organization");
    await page.locator("#sarpi-assessment").fill("Data & process readiness");
    await page.locator("#sarpi-readiness").fill("Data is centralised but ungoverned.");

    // The request must name the records it is about before it can be sent.
    await expect(page.getByText("This request references")).toBeVisible();

    await page.getByRole("button", { name: "Send request" }).click();

    // The new request appears in the queue with its status and provenance.
    const row = page.locator('[data-testid^="handoff-row-"]', { hasText: title });
    await expect(row).toBeVisible({ timeout: 45_000 });
    await expect(row).toContainText("SARPI");
    await expect(row).toContainText("AI readiness assessment");
    await expect(row).toContainText("Queued");
    await expect(row).toContainText("Consent confirmed");
    await expect(row).not.toContainText("Source version unknown");

    // The stored row carries the same provenance the queue displays.
    const admin = adminClient();
    const { data } = await admin
      .from("suite_handoff_requests")
      .select("target, request_type, status, consent, source_version, subject_refs, payload")
      .eq("title", title)
      .maybeSingle();

    expect(data, "the request was persisted").toBeTruthy();
    const record = data as Record<string, any>;
    expect(record["target"]).toBe("sarpi");
    expect(record["request_type"]).toBe("readiness_assessment");
    expect(record["status"]).toBe("queued");
    expect(record["consent"]?.confirmed).toBe(true);
    expect(String(record["consent"]?.statement ?? "")).toContain("SARPI");
    expect(record["source_version"]?.fingerprint).toBeTruthy();
    expect(Array.isArray(record["subject_refs"])).toBe(true);
    expect((record["subject_refs"] as unknown[]).length).toBeGreaterThan(0);
    expect(record["payload"]?.organizationName).toBe("E2E Test Organization");
  } finally {
    await session.close();
  }
});

test("a confidential target refuses to send until sharing consent is confirmed", async ({
  browser,
  users,
}) => {
  const user = await users.create("handoff-consent");
  const session = await pageAs(browser, user);
  const page = session.page;

  try {
    await openHandoffs(page);

    const title = `Governance gate ${Date.now().toString(36)}`;
    await page.getByRole("button", { name: "Request" }).nth(1).click();
    await expect(page.getByText("What are you asking for?")).toBeVisible({ timeout: 20_000 });

    await chooseRequestType(page, "Governance gate check");
    await page.locator("#handoff-title").fill(title);
    await page.locator("#c3g-ref").fill("UC-001");
    await page.locator("#c3g-stage").click();
    await page.getByRole("option", { name: "Pilot" }).click();
    await page.locator("label", { hasText: "Model drift" }).first().click();

    const consent = page.getByLabel("Confirm sharing consent");
    await expect(consent).toBeVisible();

    // Sending without consent is refused and nothing is written.
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/consent/i).first()).toBeVisible();
    await expect(page.locator('[data-testid^="handoff-row-"]', { hasText: title })).toHaveCount(0);

    // Confirming consent lets the same request through, with the record kept.
    await consent.click();
    await page.getByRole("button", { name: "Send request" }).click();

    const row = page.locator('[data-testid^="handoff-row-"]', { hasText: title });
    await expect(row).toBeVisible({ timeout: 45_000 });
    await expect(row).toContainText("Consent confirmed");

    const admin = adminClient();
    const { data } = await admin
      .from("suite_handoff_requests")
      .select("consent")
      .eq("title", title)
      .maybeSingle();
    expect((data as any)?.consent?.confirmed).toBe(true);
    expect((data as any)?.consent?.confirmedAt).toBeTruthy();
  } finally {
    await session.close();
  }
});

test("the queue filters by target and status, and bulk-moves a selection", async ({
  browser,
  users,
}) => {
  const user = await users.create("handoff-queue");
  const session = await pageAs(browser, user);
  const page = session.page;

  try {
    await openHandoffs(page);

    const title = `Value validation ${Date.now().toString(36)}`;
    await page.getByRole("button", { name: "Request" }).first().click();
    await expect(page.getByText("What are you asking for?")).toBeVisible({ timeout: 20_000 });
    await chooseRequestType(page, "Value assumption validation");
    await page.locator("#handoff-title").fill(title);
    await page.locator("#sarpi-org").fill("E2E Test Organization");
    await page.locator("#sarpi-assessment").fill("Value validation");
    await page.getByRole("button", { name: "Send request" }).click();

    const row = page.locator('[data-testid^="handoff-row-"]', { hasText: title });
    await expect(row).toBeVisible({ timeout: 45_000 });

    // A non-matching target filter hides it; the matching one brings it back.
    await page.getByTestId("queue-target").click();
    await page.getByRole("option", { name: /AdvisorX/ }).click();
    await expect(row).toHaveCount(0);
    await page.getByTestId("queue-target").click();
    await page.getByRole("option", { name: /SARPI/ }).click();
    await expect(row).toBeVisible();

    // Bulk move the selection to "In review" and confirm the row follows.
    await page.getByTestId("queue-select-all").click();
    await page.getByTestId("bulk-in_review").click();
    await expect(row).toContainText("In review", { timeout: 45_000 });

    // Analytics reads the same records, so the request is counted there too.
    await page.getByRole("tab", { name: "Analytics" }).click();
    await expect(page.getByTestId("handoff-analytics")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("metric-total")).not.toHaveText("0");
    await expect(page.getByTestId("target-sarpi")).toContainText("1 total");
  } finally {
    await session.close();
  }
});
