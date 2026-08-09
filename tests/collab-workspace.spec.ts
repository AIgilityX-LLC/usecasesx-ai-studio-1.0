import {
  test,
  expect,
  pageAs,
  openTeam,
  createInvitation,
  captureOpportunity,
} from "./fixtures/workspace";

/**
 * End-to-end coverage of lightweight Pro collaboration.
 *
 * Every spec provisions its own throwaway users (see tests/fixtures/workspace.ts).
 * Each user gets their own organization + workspace on first sign-in, so the
 * suite carries no shared demo state, needs no cleanup of seeded personas and
 * can run in any order.
 */

const PRO_SEAT_LIMIT = 8;

test.describe("workspace collaboration", () => {
  test.setTimeout(240_000);

  test("collaboration activity is attributed to its author and ordered newest first", async ({
    browser,
    users,
  }) => {
    const host = await users.create("host");
    const { page, close } = await pageAs(browser, host);

    await captureOpportunity(page, `Collaboration probe ${Date.now()}`);
    const noteBody = `Baseline agreed with finance ${Date.now()}`;

    await expect(page.getByText("Collaboration").first()).toBeVisible({ timeout: 45_000 });

    await page.getByLabel("Review note").fill(noteBody);
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText(noteBody)).toBeVisible({ timeout: 45_000 });

    await page.getByLabel("Review state").click();
    await page.getByRole("option", { name: "Ready for review" }).click();
    await expect(page.getByText("Ready for review").first()).toBeVisible({ timeout: 45_000 });

    await page.getByRole("tab", { name: /People/ }).click();
    await page.getByLabel("Assign teammate").click();
    await page.getByRole("option").first().click();
    await page.waitForTimeout(2500);

    await page.getByRole("tab", { name: "Activity" }).click();
    const entries = page.locator('[role="tabpanel"][data-state="active"] ol > li');
    await expect(entries.first()).toBeVisible({ timeout: 45_000 });

    const summaries = await entries.allInnerTexts();
    const joined = summaries.join("\n");
    expect(joined).toContain("Added a review note");
    expect(joined).toContain("Moved to Ready for review");
    expect(joined).toContain("Assigned owner");

    for (const text of summaries) {
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).toContain(host.fullName);
    }

    const assignmentIndex = summaries.findIndex((s) => s.includes("Assigned owner"));
    const statusIndex = summaries.findIndex((s) => s.includes("Moved to Ready for review"));
    const noteIndex = summaries.findIndex((s) => s.includes("Added a review note"));
    expect(assignmentIndex).toBeLessThan(statusIndex);
    expect(statusIndex).toBeLessThan(noteIndex);

    await close();
  });

  test("a share link invitation grants workspace-scoped access", async ({ browser, users }) => {
    const host = await users.create("host");
    const joiner = await users.create("linkjoin");

    const hostSession = await pageAs(browser, host);
    const noteBody = `Share link note ${Date.now()}`;
    const opportunityPath = await captureOpportunity(
      hostSession.page,
      `Share link probe ${Date.now()}`,
    );
    await hostSession.page.getByLabel("Review note").fill(noteBody);
    await hostSession.page.getByRole("button", { name: "Add note" }).click();
    await expect(hostSession.page.getByText(noteBody)).toBeVisible({ timeout: 45_000 });

    await openTeam(hostSession.page);
    const sharePath = await createInvitation(hostSession.page);
    expect(sharePath).toMatch(/^\/invite\/.+/);
    await expect(hostSession.page.getByText("Share link").first()).toBeVisible({ timeout: 30_000 });
    await hostSession.close();

    const joinerSession = await pageAs(browser, joiner);
    // Before joining, the host's item is out of reach.
    await joinerSession.page.goto(opportunityPath, { waitUntil: "networkidle" });
    await joinerSession.page.waitForTimeout(3000);
    await expect(joinerSession.page.getByText(noteBody)).toHaveCount(0);

    await joinerSession.page.goto(sharePath, { waitUntil: "networkidle" });
    await expect(joinerSession.page.getByText("You are in.")).toBeVisible({ timeout: 60_000 });

    await joinerSession.page.goto(opportunityPath, { waitUntil: "networkidle" });
    await expect(joinerSession.page.getByText(noteBody)).toBeVisible({ timeout: 60_000 });

    // A joiner is not an admin of the host workspace: no invitation controls.
    await openTeam(joinerSession.page);
    await expect(joinerSession.page.getByRole("button", { name: "Create invitation" })).toHaveCount(
      0,
    );
    await joinerSession.close();
  });

  test("an email invitation is bound to its recipient", async ({ browser, users }) => {
    const host = await users.create("host");
    const invited = await users.create("invited");
    const stranger = await users.create("stranger");

    const hostSession = await pageAs(browser, host);
    const noteBody = `Email invite note ${Date.now()}`;
    const opportunityPath = await captureOpportunity(
      hostSession.page,
      `Email invite probe ${Date.now()}`,
    );
    await hostSession.page.getByLabel("Review note").fill(noteBody);
    await hostSession.page.getByRole("button", { name: "Add note" }).click();
    await expect(hostSession.page.getByText(noteBody)).toBeVisible({ timeout: 45_000 });

    await openTeam(hostSession.page);
    const invitePath = await createInvitation(hostSession.page, invited.email);
    await expect(hostSession.page.getByText(invited.email).first()).toBeVisible({
      timeout: 30_000,
    });
    await hostSession.close();

    // The wrong account cannot redeem it.
    const strangerSession = await pageAs(browser, stranger);
    await strangerSession.page.goto(invitePath, { waitUntil: "networkidle" });
    await expect(
      strangerSession.page.getByText(/different email address|already been used|not valid/i),
    ).toBeVisible({ timeout: 60_000 });
    await strangerSession.close();

    // The intended recipient can.
    const invitedSession = await pageAs(browser, invited);
    await invitedSession.page.goto(invitePath, { waitUntil: "networkidle" });
    await expect(invitedSession.page.getByText("You are in.")).toBeVisible({ timeout: 60_000 });
    await invitedSession.page.goto(opportunityPath, { waitUntil: "networkidle" });
    await expect(invitedSession.page.getByText(noteBody)).toBeVisible({ timeout: 60_000 });
    await invitedSession.close();
  });

  test("removing a member revokes their access immediately", async ({ browser, users }) => {
    const host = await users.create("host");
    const member = await users.create("member");

    const hostSession = await pageAs(browser, host);
    const noteBody = `Removal note ${Date.now()}`;
    const opportunityPath = await captureOpportunity(
      hostSession.page,
      `Removal probe ${Date.now()}`,
    );
    await hostSession.page.getByLabel("Review note").fill(noteBody);
    await hostSession.page.getByRole("button", { name: "Add note" }).click();
    await expect(hostSession.page.getByText(noteBody)).toBeVisible({ timeout: 45_000 });

    await openTeam(hostSession.page);
    const sharePath = await createInvitation(hostSession.page);

    const memberSession = await pageAs(browser, member);
    await memberSession.page.goto(sharePath, { waitUntil: "networkidle" });
    await expect(memberSession.page.getByText("You are in.")).toBeVisible({ timeout: 60_000 });
    await memberSession.page.goto(opportunityPath, { waitUntil: "networkidle" });
    await expect(memberSession.page.getByText(noteBody)).toBeVisible({ timeout: 60_000 });

    // The host removes them.
    await openTeam(hostSession.page);
    const removeButton = hostSession.page
      .getByRole("button", { name: new RegExp(`^Remove .*${member.fullName}`, "i") })
      .first();
    await expect(removeButton).toBeVisible({ timeout: 45_000 });
    await removeButton.click();
    await expect(hostSession.page.getByText(member.fullName)).toHaveCount(0, { timeout: 45_000 });
    await hostSession.close();

    // Access is gone on the next load: no data, no protected actions.
    await memberSession.page.goto(opportunityPath, { waitUntil: "networkidle" });
    await memberSession.page.waitForTimeout(4000);
    await expect(memberSession.page.getByText(noteBody)).toHaveCount(0);
    await expect(memberSession.page.getByRole("button", { name: "Add note" })).toHaveCount(0);

    await openTeam(memberSession.page);
    await expect(memberSession.page.getByText(host.fullName)).toHaveCount(0);
    await memberSession.close();
  });

  test("the Pro seat cap blocks new invitations and shows the Enterprise CTA", async ({
    browser,
    users,
  }) => {
    const host = await users.create("cap");
    const { page, close } = await pageAs(browser, host);
    await openTeam(page);

    const capNotice = page.getByText("You have reached your plan's fair-use team size.");
    for (let i = 0; i < PRO_SEAT_LIMIT + 2; i += 1) {
      if ((await capNotice.count()) > 0) break;
      await createInvitation(page);
      await page.waitForTimeout(800);
    }

    await expect(capNotice).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByText(/Enterprise Design Partner engagement for larger teams/),
    ).toBeVisible();
    const cta = page.getByRole("link", { name: "Talk to us about Enterprise" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/pricing");
    await expect(page.getByRole("button", { name: "Create invitation" })).toBeDisabled();

    await close();
  });
});
