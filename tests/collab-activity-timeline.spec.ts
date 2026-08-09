import {
  test,
  expect,
  pageAs,
  openTeam,
  createInvitation,
  captureOpportunity,
} from "./fixtures/workspace";
import { ACTIVITY_PAGE_SIZE } from "../src/lib/collab";

/**
 * Activity timeline at volume: many events from two different people on the
 * same item. Verifies attribution, newest-first ordering, category filtering
 * and "show more" pagination.
 */
test.describe("collaboration activity timeline", () => {
  test.setTimeout(300_000);

  test("orders, attributes, filters and paginates a busy timeline", async ({ browser, users }) => {
    const host = await users.create("tlhost");
    const mate = await users.create("tlmate");

    const hostSession = await pageAs(browser, host);
    const opportunityPath = await captureOpportunity(
      hostSession.page,
      `Timeline probe ${Date.now()}`,
    );

    // Bring the teammate into the workspace so both can write.
    await openTeam(hostSession.page);
    const sharePath = await createInvitation(hostSession.page);
    const mateSession = await pageAs(browser, mate);
    await mateSession.page.goto(sharePath, { waitUntil: "networkidle" });
    await expect(mateSession.page.getByText("You are in.")).toBeVisible({ timeout: 60_000 });

    // --- host writes a batch of notes and review-state changes -------------
    await hostSession.page.goto(opportunityPath, { waitUntil: "networkidle" });
    await expect(hostSession.page.getByLabel("Review note")).toBeVisible({ timeout: 45_000 });
    for (let i = 1; i <= 6; i += 1) {
      await hostSession.page.getByLabel("Review note").fill(`Host note ${i}`);
      await hostSession.page.getByRole("button", { name: "Add note" }).click();
      await expect(hostSession.page.getByText(`Host note ${i}`)).toBeVisible({ timeout: 45_000 });
    }
    for (const state of ["Ready for review", "Reviewed", "Approved for portfolio"]) {
      await hostSession.page.getByLabel("Review state").click();
      await hostSession.page.getByRole("option", { name: state }).click();
      await hostSession.page.waitForTimeout(1500);
    }

    // --- teammate adds their own notes and an assignment -------------------
    await mateSession.page.goto(opportunityPath, { waitUntil: "networkidle" });
    await expect(mateSession.page.getByLabel("Review note")).toBeVisible({ timeout: 60_000 });
    for (let i = 1; i <= 4; i += 1) {
      await mateSession.page.getByLabel("Review note").fill(`Mate note ${i}`);
      await mateSession.page.getByRole("button", { name: "Add note" }).click();
      await expect(mateSession.page.getByText(`Mate note ${i}`)).toBeVisible({ timeout: 45_000 });
    }
    await mateSession.page.getByRole("tab", { name: /People/ }).click();
    await mateSession.page.getByLabel("Assign teammate").click();
    await mateSession.page.getByRole("option").first().click();
    await mateSession.page.waitForTimeout(2500);
    await mateSession.close();

    // --- assertions on the host's view -------------------------------------
    await hostSession.page.reload({ waitUntil: "networkidle" });
    await hostSession.page.getByRole("tab", { name: "Activity" }).click();
    const panel = hostSession.page.locator('[role="tabpanel"][data-state="active"]');
    const entries = panel.locator("ol > li");
    await expect(entries.first()).toBeVisible({ timeout: 45_000 });

    // Pagination: the first page is capped, and the counter reports the total.
    const countText = await panel.getByTestId("activity-count").innerText();
    const total = Number(countText.match(/of (\d+) events/)?.[1] ?? 0);
    expect(total).toBeGreaterThan(ACTIVITY_PAGE_SIZE);
    expect(await entries.count()).toBe(ACTIVITY_PAGE_SIZE);

    const showMore = panel.getByRole("button", { name: "Show more activity" });
    await expect(showMore).toBeVisible();
    await showMore.click();
    await expect
      .poll(async () => entries.count(), { timeout: 20_000 })
      .toBeGreaterThan(ACTIVITY_PAGE_SIZE);

    // Reveal everything so ordering and attribution can be checked in full.
    for (let i = 0; i < 8; i += 1) {
      if ((await showMore.count()) === 0) break;
      await showMore.click();
      await hostSession.page.waitForTimeout(400);
    }
    expect(await entries.count()).toBe(total);

    const all = await entries.allInnerTexts();
    // Attribution: both people appear, and every row names an actor.
    expect(all.some((t) => t.includes(host.fullName))).toBeTruthy();
    expect(all.some((t) => t.includes(mate.fullName))).toBeTruthy();
    for (const text of all) {
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).toMatch(new RegExp(`${host.fullName}|${mate.fullName}|System|Teammate`));
    }

    // Ordering: newest first — the teammate's assignment precedes the host's
    // first note, which was written earliest.
    const assignmentIndex = all.findIndex((t) => t.includes("Assigned"));
    const firstNoteIndex = all.map((t) => t.includes("Added a review note")).lastIndexOf(true);
    expect(assignmentIndex).toBeGreaterThanOrEqual(0);
    expect(assignmentIndex).toBeLessThan(firstNoteIndex);

    // Filtering: each bucket shows only its own event types.
    const filter = panel.getByLabel("Activity filter");

    await filter.click();
    await hostSession.page.getByRole("option", { name: "Review notes" }).click();
    await hostSession.page.waitForTimeout(500);
    const noteEvents = await entries.evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-event") ?? ""),
    );
    expect(noteEvents.length).toBeGreaterThan(0);
    expect(noteEvents.every((e) => e.startsWith("collab.comment."))).toBeTruthy();

    await filter.click();
    await hostSession.page.getByRole("option", { name: "Review states" }).click();
    await hostSession.page.waitForTimeout(500);
    const stateEvents = await entries.evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-event") ?? ""),
    );
    expect(stateEvents.length).toBeGreaterThan(0);
    expect(stateEvents.every((e) => e.startsWith("collab.review_status."))).toBeTruthy();

    await filter.click();
    await hostSession.page.getByRole("option", { name: "People" }).click();
    await hostSession.page.waitForTimeout(500);
    const peopleEvents = await entries.evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-event") ?? ""),
    );
    expect(peopleEvents.length).toBeGreaterThan(0);
    expect(
      peopleEvents.every((e) => e.startsWith("collab.assignment.") || e.startsWith("membership.")),
    ).toBeTruthy();

    // Switching filters resets pagination back to the first page.
    await filter.click();
    await hostSession.page.getByRole("option", { name: "All activity" }).click();
    await hostSession.page.waitForTimeout(500);
    expect(await entries.count()).toBe(ACTIVITY_PAGE_SIZE);

    await hostSession.close();
  });
});
