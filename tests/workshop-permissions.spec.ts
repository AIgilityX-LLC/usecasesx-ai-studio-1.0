import { test, expect, type Page } from "@playwright/test";

/**
 * Facilitator vs participant permissions across the workshop journey.
 *
 * Uses the demonstration personas (see scripts/seed/demo-personas.mjs). The
 * facilitator and both participants share one demo workspace, so invitations
 * resolve through the workspace-scoped join path.
 */
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@123-UCX";
const FACILITATOR = "facilitator@demo.usecasex.app";
const PARTICIPANT = "participant1@demo.usecasex.app";

async function signIn(page: Page, email: string) {
  await page.goto("/auth", { waitUntil: "networkidle" });
  // The form only works once React has hydrated the controlled inputs.
  await page.waitForTimeout(2500);
  await page.getByPlaceholder("you@org.com").fill(email);
  await page.getByPlaceholder(/^Password/).fill(PASSWORD);
  await page.locator("button[type=submit]").first().click();

  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 45_000 });
}

test.describe("workshop permissions", () => {
  test.describe.configure({ mode: "serial" });

  let workshopUrl = "";
  let joinUrl = "";

  test("facilitator can set up a session and issue an invitation", async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    await signIn(page, FACILITATOR);

    await page.goto("/workshops", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: /new workshop/i }).click();
    const title = `Permissions probe ${Date.now()}`;
    await page.getByLabel("Session name").fill(title);
    await page.getByLabel("Business functions in scope").fill("Finance, Supply Chain");
    await page.getByRole("button", { name: /create workshop/i }).click();

    await page.waitForURL(/\/workshops\/[0-9a-f-]{36}/, { timeout: 30_000 });
    workshopUrl = new URL(page.url()).pathname;

    // Facilitator-only controls are present.
    await expect(page.getByRole("button", { name: /start session/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /invitations/i })).toBeVisible();

    await page.getByRole("button", { name: /create share link/i }).click();
    await expect(page.getByText("Workspace share link").first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Copy invitation link" }).first().click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain("/workshops/join/");
    joinUrl = new URL(link).pathname;

    await page.getByRole("button", { name: /start session/i }).click();
    await context.close();
  });

  test("participant joins via invitation and sees a scoped board", async ({ browser }) => {
    test.skip(!joinUrl, "No invitation was issued");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, PARTICIPANT);

    await page.goto(joinUrl, { waitUntil: "networkidle" });
    await page.waitForURL(/\/workshops\/[0-9a-f-]{36}/, { timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe(workshopUrl);

    // Participant badge, no facilitator controls, no invitation panel.
    await expect(page.getByText("Participant", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /start session/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /close session/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /invitations/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /add participant/i })).toHaveCount(0);

    // The audit trail is visible to participants — traceability is shared.
    await expect(page.getByText(/Audit trail/).first()).toBeVisible();
    await context.close();
  });

  test("participant can submit and score but cannot curate or convert", async ({ browser }) => {
    test.skip(!workshopUrl, "No workshop was created");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, PARTICIPANT);
    await page.goto(workshopUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    await page.getByRole("button", { name: /2\. Pain points/i }).click();
    const painTitle = `Manual invoice matching ${Date.now()}`;
    await page.getByLabel(/title/i).first().fill(painTitle);
    await page
      .getByRole("button", { name: /add|submit/i })
      .first()
      .click();
    await expect(page.getByText(painTitle)).toBeVisible({ timeout: 20_000 });

    // Curation and conversion remain facilitator-only.
    await expect(page.getByRole("button", { name: /^accept$/i })).toHaveCount(0);
    await page.getByRole("button", { name: /7\. Portfolio/i }).click();
    await expect(page.getByRole("button", { name: /convert/i })).toHaveCount(0);
    await context.close();
  });

  test("facilitator sees traceable audit entries for participant activity", async ({ browser }) => {
    test.skip(!workshopUrl, "No workshop was created");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, FACILITATOR);
    await page.goto(workshopUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    await expect(page.getByText(/Audit trail/).first()).toBeVisible();
    await page.getByRole("button", { name: /2\. Pain points/i }).click();
    await expect(page.getByText(/Submission/i).first()).toBeVisible({ timeout: 20_000 });
    await context.close();
  });
});
