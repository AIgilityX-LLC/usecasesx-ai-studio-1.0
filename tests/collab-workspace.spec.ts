import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end coverage of lightweight Pro collaboration:
 *
 *  1. workspace invitations accepted through a share link and an email invite,
 *     across two personas, with workspace-scoped access enforced;
 *  2. member removal revoking access to invitations, collaboration data and
 *     protected actions immediately;
 *  3. the activity timeline attributing events to their author, ordered newest
 *     first, and reflecting comment / review-state / assignment changes;
 *  4. the Pro fair-use seat cap blocking new invitations and surfacing the
 *     Enterprise conversation CTA.
 *
 * The specs run serially against the seeded demo personas and clean up after
 * themselves (joined members are removed, spare invitations revoked) so the
 * demo workspace is left as it was found.
 */
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@123-UCX";
const HOST = "facilitator@demo.usecasex.app";
const LINK_JOINER = "superadmin@demo.usecasex.app";
const EMAIL_JOINER = "tenantadmin@demo.usecasex.app";

const PRO_SEAT_LIMIT = 8;

async function signIn(page: Page, email: string) {
  await page.goto("/auth", { waitUntil: "networkidle" });
  // The controlled inputs only accept text once React has hydrated.
  await page.waitForTimeout(2500);
  await page.getByPlaceholder("you@org.com").fill(email);
  await page.getByPlaceholder(/^Password/).fill(PASSWORD);
  await page.locator("button[type=submit]").first().click();
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 45_000 });
}

async function openTeam(page: Page) {
  await page.goto("/account/team", { waitUntil: "networkidle" });
  await expect(page.getByText("Team size")).toBeVisible({ timeout: 30_000 });
}

/** Creates an invitation and returns its /invite/<token> path. */
async function createInvitation(page: Page, email?: string): Promise<string> {
  await page.getByLabel("Email (optional for a share link)").fill(email ?? "");
  await page.getByRole("button", { name: "Create invitation" }).click();
  const link = page.locator("code", { hasText: "/invite/" }).first();
  await expect(link).toBeVisible({ timeout: 30_000 });
  const href = (await link.innerText()).trim();
  return new URL(href).pathname;
}

/** Revokes every pending invitation so the workspace is left clean. */
async function revokeAllInvitations(page: Page) {
  for (let i = 0; i < 12; i += 1) {
    const revoke = page.getByRole("button", { name: /^revoke$/i }).first();
    if ((await revoke.count()) === 0) break;
    await revoke.click();
    await page.waitForTimeout(1200);
  }
}

async function removeMemberIfPresent(page: Page, label: RegExp) {
  const button = page.getByRole("button", { name: label }).first();
  if ((await button.count()) === 0) return false;
  await button.click();
  await page.waitForTimeout(2000);
  return true;
}

test.describe("workspace collaboration", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  let opportunityPath = "";
  let shareLinkPath = "";
  let emailInvitePath = "";
  const noteBody = `Baseline agreed with finance ${Date.now()}`;

  test("host captures an opportunity and records collaboration activity", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, HOST);

    await page.goto("/opportunities/new", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.getByLabel(/Problem name/).fill(`Collaboration probe ${Date.now()}`);
    await page.getByRole("button", { name: "Save opportunity" }).click();
    await page.waitForURL(/\/opportunities\/[0-9a-f-]{36}/, { timeout: 45_000 });
    opportunityPath = new URL(page.url()).pathname;

    const panel = page
      .locator("div")
      .filter({ hasText: /^Collaboration/ })
      .first();
    await expect(page.getByText("Collaboration").first()).toBeVisible({ timeout: 30_000 });
    void panel;

    // 1. A review note.
    await page.getByLabel("Review note").fill(noteBody);
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText(noteBody)).toBeVisible({ timeout: 30_000 });

    // 2. A review-state change.
    await page.getByLabel("Review state").click();
    await page.getByRole("option", { name: "Ready for review" }).click();
    await expect(page.getByText("Ready for review").first()).toBeVisible({ timeout: 30_000 });

    // 3. An owner assignment.
    await page.getByRole("tab", { name: /People/ }).click();
    await page.getByLabel("Assign teammate").click();
    await page.getByRole("option").first().click();
    await page.waitForTimeout(2500);

    // The timeline attributes each event and orders it newest first.
    await page.getByRole("tab", { name: "Activity" }).click();
    const entries = page.locator('[role="tabpanel"][data-state="active"] ol > li');
    await expect(entries.first()).toBeVisible({ timeout: 30_000 });

    const summaries = await entries.allInnerTexts();
    const joined = summaries.join("\n");
    expect(joined).toContain("Added a review note");
    expect(joined).toContain("Moved to Ready for review");
    expect(joined).toContain("Assigned owner");
    // Every entry names its author.
    for (const text of summaries) {
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).toMatch(/Facilitator|Trainer|facilitator/i);
    }
    // Newest first: the assignment happened after the note.
    const assignmentIndex = summaries.findIndex((s) => s.includes("Assigned owner"));
    const noteIndex = summaries.findIndex((s) => s.includes("Added a review note"));
    const statusIndex = summaries.findIndex((s) => s.includes("Moved to Ready for review"));
    expect(assignmentIndex).toBeLessThan(statusIndex);
    expect(statusIndex).toBeLessThan(noteIndex);

    await context.close();
  });

  test("host issues a share link and an email invitation", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, HOST);
    await openTeam(page);

    shareLinkPath = await createInvitation(page);
    expect(shareLinkPath).toMatch(/^\/invite\/.+/);
    await expect(page.getByText("Share link").first()).toBeVisible({ timeout: 20_000 });

    emailInvitePath = await createInvitation(page, EMAIL_JOINER);
    expect(emailInvitePath).not.toBe(shareLinkPath);
    await expect(page.getByText(EMAIL_JOINER).first()).toBeVisible({ timeout: 20_000 });

    await context.close();
  });

  test("second persona joins through the share link and sees workspace data", async ({
    browser,
  }) => {
    test.skip(!shareLinkPath, "No share link was issued");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, LINK_JOINER);

    await page.goto(shareLinkPath, { waitUntil: "networkidle" });
    await expect(page.getByText("You are in.")).toBeVisible({ timeout: 45_000 });

    // Scoped access: the host's opportunity and its review trail are readable.
    await page.goto(opportunityPath, { waitUntil: "networkidle" });
    await expect(page.getByText(noteBody)).toBeVisible({ timeout: 45_000 });
    await context.close();
  });

  test("third persona joins through their email invitation", async ({ browser }) => {
    test.skip(!emailInvitePath, "No email invitation was issued");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, EMAIL_JOINER);

    await page.goto(emailInvitePath, { waitUntil: "networkidle" });
    await expect(page.getByText("You are in.")).toBeVisible({ timeout: 45_000 });

    await page.goto(opportunityPath, { waitUntil: "networkidle" });
    await expect(page.getByText(noteBody)).toBeVisible({ timeout: 45_000 });

    // A joiner is not an admin of the host workspace: no invitation controls.
    await openTeam(page);
    await expect(page.getByRole("button", { name: "Create invitation" })).toHaveCount(0);
    await context.close();
  });

  test("an email invitation cannot be redeemed by a different account", async ({ browser }) => {
    test.skip(!emailInvitePath, "No email invitation was issued");
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, "participant2@demo.usecasex.app");

    await page.goto(emailInvitePath, { waitUntil: "networkidle" });
    await expect(
      page.getByText(/different email address|already been used|not valid/i),
    ).toBeVisible({ timeout: 45_000 });
    await context.close();
  });

  test("Pro seat cap blocks new invitations and shows the Enterprise CTA", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, HOST);
    await openTeam(page);

    // Fill the remaining fair-use seats with pending invitations.
    for (let i = 0; i < PRO_SEAT_LIMIT + 2; i += 1) {
      const capReached = await page
        .getByText("You have reached your plan's fair-use team size.")
        .count();
      if (capReached > 0) break;
      await createInvitation(page);
      await page.waitForTimeout(1200);
    }

    await expect(page.getByText("You have reached your plan's fair-use team size.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(/Enterprise Design Partner engagement for larger teams/),
    ).toBeVisible();
    const cta = page.getByRole("link", { name: "Talk to us about Enterprise" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/contact");
    await expect(page.getByRole("button", { name: "Create invitation" })).toBeDisabled();

    // Clean up the spare invitations so the cap is released.
    await revokeAllInvitations(page);
    await expect(page.getByText("No invitations are waiting.")).toBeVisible({ timeout: 30_000 });
    await context.close();
  });

  test("removing a member revokes their access immediately", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await signIn(hostPage, HOST);
    await openTeam(hostPage);

    const removedLink = await removeMemberIfPresent(hostPage, /^Remove .*Super/i);
    const removedEmail = await removeMemberIfPresent(hostPage, /^Remove .*(Tenant|tenantadmin)/i);
    expect(removedLink || removedEmail).toBeTruthy();
    await hostContext.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, EMAIL_JOINER);

    // Collaboration data for the host's item is no longer reachable.
    await page.goto(opportunityPath, { waitUntil: "networkidle" });
    await page.waitForTimeout(4000);
    await expect(page.getByText(noteBody)).toHaveCount(0);

    // Protected action: the review-note composer for that item is gone too.
    await expect(page.getByRole("button", { name: "Add note" })).toHaveCount(0);

    // Their own team page shows their own workspace, not the host's invitations.
    await openTeam(page);
    await expect(page.getByText("Facilitator / Trainer")).toHaveCount(0);
    await context.close();
  });
});
