import { test, expect, type Page, type Request } from "@playwright/test";

/**
 * Exercises the /compare page interactive table (sorting, pagination, row
 * expansion) and asserts the corresponding module-analytics events are fired.
 *
 * Analytics are persisted via a Supabase REST insert into `module_events`.
 * Rather than depend on the database, we intercept the outbound POST and read
 * the `interaction` field from the request payload — this proves the client
 * fired the event with the expected shape regardless of RLS/auth state.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

// Two known published use cases give us a real, non-empty comparison table.
const SLUGS = [
  "defense-autonomous-isr-drone-analytics",
  "defense-predictive-maintenance-for-military-fleets",
];
const COMPARE_URL = `${BASE}/compare?ids=${SLUGS.join(",")}`;

/** Collects the `interaction` value of every module_events insert POST. */
function captureCompareEvents(page: Page): string[] {
  const interactions: string[] = [];
  page.on("request", (req: Request) => {
    if (req.method() !== "POST") return;
    if (!/\/rest\/v1\/module_events/.test(req.url())) return;
    try {
      const body = req.postData();
      if (!body) return;
      const parsed = JSON.parse(body);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        if (row?.module_key === "compare" && row?.metadata?.interaction) {
          interactions.push(row.metadata.interaction as string);
        }
      }
    } catch {
      /* ignore non-JSON payloads */
    }
  });
  return interactions;
}

async function expectEvent(interactions: string[], name: string) {
  await expect
    .poll(() => interactions.includes(name), {
      message: `expected compare analytics event "${name}" to fire`,
      timeout: 5000,
    })
    .toBe(true);
}

test.describe("/compare analytics events", () => {
  test("sorting fires sort_table", async ({ page }) => {
    const events = captureCompareEvents(page);
    await page.goto(COMPARE_URL, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Differences first" })).toBeVisible();

    await page.getByRole("button", { name: "Differences first" }).click();
    await expectEvent(events, "sort_table");

    await page.getByRole("button", { name: "A–Z" }).click();
    await expectEvent(events, "sort_table");
  });

  test("pagination fires paginate_table", async ({ page }) => {
    const events = captureCompareEvents(page);
    await page.goto(COMPARE_URL, { waitUntil: "networkidle" });

    // The attribute table paginates at 5 rows/page, so Next is present.
    const next = page.getByRole("button", { name: "Next" });
    await expect(next).toBeVisible();
    await next.click();
    await expectEvent(events, "paginate_table");

    const prev = page.getByRole("button", { name: "Prev" });
    await expect(prev).toBeEnabled();
    await prev.click();
    await expectEvent(events, "paginate_table");
  });

  test("row expansion fires row_expand", async ({ page }) => {
    const events = captureCompareEvents(page);
    await page.goto(COMPARE_URL, { waitUntil: "networkidle" });

    // Each attribute label is a toggle button; expanding it reveals a detail row.
    await page.getByRole("button", { name: /Industry/ }).first().click();
    await expectEvent(events, "row_expand");
  });
});
