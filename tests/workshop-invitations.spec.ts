import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end coverage of the participant invitation flow.
 *
 * Two join paths are exercised against a live session:
 *  - workspace share link  → anyone already inside the host workspace
 *  - email invitation      → a named outsider, who gains scoped access to that
 *                            one workspace only
 *
 * The negative case in between proves the scope is enforced: an outsider who
 * gets hold of a workspace share link is refused.
 */
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@123-UCX";
const FACILITATOR = "facilitator@demo.usecasex.app";
const INSIDER = "participant1@demo.usecasex.app";
const OUTSIDER = "tenantadmin@demo.usecasex.app";

async function signIn(page: Page, email: string) {
  await page.goto("/auth", { waitUntil: "networkidle" });
  // The form only works once React has hydrated the controlled inputs.
  await page.waitForTimeout(2500);
  await page.getByPlaceholder("you@org.com").fill(email);
  await page.getByPlaceholder(/^Password/).fill(PASSWORD);
  await page.locator("button[type=submit]").first().click();
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 45_000 });
}

/** Copies the newest invitation link out of the facilitator panel. */
async function copyNewestInviteLink(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Copy invitation link" }).first().click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("/workshops/join/");
  return new URL(link).pathname;
}

test.describe("workshop invitations", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  let workshopPath = "";
  let shareLinkPath = "";
  let emailInvitePath = "";

  test("facilitator issues a workspace share link and an email invitation", async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    await signIn(page, FACILITATOR);

    await page.goto("/workshops", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: /new workshop/i }).click();
    await page.getByLabel("Session name").fill(`Invitation probe ${Date.now()}`);
    await page.getByRole("button", { name: /create workshop/i }).click();
    await page.waitForURL(/\/workshops\/[0-9a-f-]{36}/, { timeout: 30_000 });
    workshopPath = new URL(page.url()).pathname;

    // 1. Workspace share link (no email).
    await page.getByRole("button", { name: /create share link/i }).click();
    await expect(page.getByText("Workspace share link").first()).toBeVisible({ timeout: 20_000 });
    shareLinkPath = await copyNewestInviteLink(page);

    // 2. Email invitation addressed to a user outside the host workspace.
    await page.getByPlaceholder(/Email \(leave blank/i).fill(OUTSIDER);
    await page.getByRole("button", { name: /create email invite/i }).click();
    await expect(page.getByText(OUTSIDER).first()).toBeVisible({ timeout: 20_000 });
    emailInvitePath = await page
      .locator("li", { hasText: OUTSIDER })
      .first()
      .getByRole("button", { name: "Copy invitation link" })
      .click()
      .then(() => page.evaluate(() => navigator.clipboard.readText()))
      .then((link) => new URL(link).pathname);
    expect(emailInvitePath).not.toBe(shareLinkPath);

    await page.getByRole("button", { name: /start session/i }).click();
    await context.close();
  });

  test("workspace member joins through the share link", async ({ browser }) => {
    test.skip(!shareLinkPath, "No share link was issued");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, INSIDER);

    await page.goto(shareLinkPath, { waitUntil: "networkidle" });
    await page.waitForURL(/\/workshops\/[0-9a-f-]{36}/, { timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe(workshopPath);
    await expect(page.getByText(/Audit trail/).first()).toBeVisible();
    // Joining does not grant facilitation.
    await expect(page.getByRole("heading", { name: /invitations/i })).toHaveCount(0);
    await context.close();
  });

  test("outsider with a workspace share link is refused", async ({ browser }) => {
    test.skip(!shareLinkPath, "No share link was issued");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, OUTSIDER);

    await page.goto(shareLinkPath, { waitUntil: "networkidle" });
    await expect(page.getByText(/scoped to the host workspace/i)).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe(shareLinkPath);
    await context.close();
  });

  test("outsider joins through their email invitation", async ({ browser }) => {
    test.skip(!emailInvitePath, "No email invitation was issued");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, OUTSIDER);

    await page.goto(emailInvitePath, { waitUntil: "networkidle" });
    await page.waitForURL(/\/workshops\/[0-9a-f-]{36}/, { timeout: 30_000 });
    expect(new URL(page.url()).pathname).toBe(workshopPath);
    await expect(page.getByText(/Audit trail/).first()).toBeVisible();
    await context.close();
  });

  test("a revoked invitation stops working", async ({ browser }) => {
    test.skip(!workshopPath, "No workshop was created");
    const facilitatorContext = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const facilitatorPage = await facilitatorContext.newPage();
    await signIn(facilitatorPage, FACILITATOR);
    await facilitatorPage.goto(workshopPath, { waitUntil: "networkidle" });
    await facilitatorPage.waitForTimeout(2500);

    await facilitatorPage.getByRole("button", { name: /create share link/i }).click();
    await facilitatorPage.waitForTimeout(2000);
    const revokedPath = await copyNewestInviteLink(facilitatorPage);
    await facilitatorPage
      .getByRole("button", { name: /^revoke$/i })
      .first()
      .click();
    await facilitatorPage.waitForTimeout(2000);
    await facilitatorContext.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, INSIDER);
    await page.goto(revokedPath, { waitUntil: "networkidle" });
    await expect(page.getByText(/revoked|not valid/i).first()).toBeVisible({ timeout: 30_000 });
    await context.close();
  });
});
