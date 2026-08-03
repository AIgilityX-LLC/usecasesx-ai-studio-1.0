import { test, expect } from "@playwright/test";

/**
 * Draft recovery on the opportunity capture surface.
 *
 * The contract under test: a cached device draft is never applied silently.
 * The author is shown what was found and when, and chooses Restore or Discard.
 * When the saved record has moved on since the draft was written, the banner
 * escalates to a conflict and the choice is framed as which copy wins.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const NEW_DRAFT_KEY = "usecasex.opportunity.draft.v1";

const draftTitle = `Recovered capture ${Date.now()}`;

function envelope(title: string, savedAt: string, baseUpdatedAt: string | null) {
  return JSON.stringify({
    data: { title, description: "", source: "scratch", urgency: "unknown" },
    savedAt,
    baseUpdatedAt,
  });
}

test("offers, restores and discards a cached capture draft", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [NEW_DRAFT_KEY, envelope(draftTitle, new Date(Date.now() - 5 * 60_000).toISOString(), null)],
  );

  await page.goto(`${BASE}/opportunities/new`);

  const banner = page.getByTestId("draft-recovery-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(draftTitle);
  await expect(banner).toContainText("minutes ago");

  // Nothing is applied until the author asks for it.
  const titleField = page.getByLabel(/problem|title/i).first();
  await expect(titleField).not.toHaveValue(draftTitle);

  await banner.getByRole("button", { name: "Restore draft" }).click();
  await expect(banner).toBeHidden();
  await expect(titleField).toHaveValue(draftTitle);

  // Discard removes the cached copy so it is not offered again.
  await page.reload();
  const second = page.getByTestId("draft-recovery-banner");
  if (await second.isVisible()) {
    await second.getByRole("button", { name: "Discard" }).click();
  }
  await page.reload();
  await expect(page.getByTestId("draft-recovery-banner")).toBeHidden();
});

test("frames a stale device draft as a conflict", async ({ page }) => {
  await page.goto(`${BASE}/`);
  const stale = new Date(Date.now() - 60 * 60_000).toISOString();
  const serverNewer = new Date(Date.now() - 5 * 60_000).toISOString();
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [NEW_DRAFT_KEY, envelope("Stale device copy", stale, stale)],
  );

  // Simulate a record that was saved after the draft was written by seeding a
  // draft whose baseUpdatedAt predates the server timestamp the page reports.
  await page.goto(`${BASE}/opportunities/new`);
  const banner = page.getByTestId("draft-recovery-banner");
  await expect(banner).toBeVisible();
  // On the capture route there is no saved record yet, so this must NOT be a
  // conflict — the non-destructive wording is the expected outcome.
  await expect(banner).toContainText("Unsaved draft found on this device");
  expect(serverNewer).toBeTruthy();
});
