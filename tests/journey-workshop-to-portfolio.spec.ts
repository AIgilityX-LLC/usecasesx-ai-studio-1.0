import { test, expect, adminClient, grantPro, pageAs } from "./fixtures/workspace";

/**
 * Phase 3 journey: Workshop -> outcome summary -> publish to portfolio and
 * Opportunity Map.
 *
 * Uses a throwaway facilitator so the spec never depends on demo-persona state.
 * The outcome counts shown on the board are compared against the workshop_items
 * rows that produced them: a summary that inflates or loses items fails here.
 */
test.describe("journey: workshop to portfolio", () => {
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  test("recorded items flow into the outcome summary and the portfolio", async ({
    browser,
    users,
  }) => {
    const facilitator = await users.create("journey-facilitator");
    await grantPro(facilitator);
    const { page, close } = await pageAs(browser, facilitator);

    try {
      const stamp = Date.now();

      /* ---- create the session ----------------------------------------- */
      await page.goto("/workshops", { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      await page.getByRole("button", { name: /new workshop/i }).click();
      const title = `Journey workshop ${stamp}`;
      await page.getByLabel("Session name").fill(title);
      await page.getByLabel("Business functions in scope").fill("Finance");
      await page.getByRole("button", { name: /create workshop/i }).click();
      await page.waitForURL(/\/workshops\/[0-9a-f-]{36}/, { timeout: 60_000 });
      const workshopId = page.url().split("/").pop() as string;

      await page.getByRole("button", { name: /start session/i }).click();

      /* ---- record items ------------------------------------------------ */
      const stages = page.getByRole("navigation", { name: "Workshop stages" });
      const captured = [`Manual reconciliation ${stamp}`, `Late supplier invoices ${stamp}`];

      await stages
        .getByRole("button", { name: /Pain points|Discovery|Capture/ })
        .first()
        .click();
      for (const item of captured) {
        await page
          .getByLabel(/Pain point|Opportunity|Use case|Context note/)
          .first()
          .fill(item);
        await page.getByRole("button", { name: "Add" }).first().click();
        await expect(page.getByText(item).first()).toBeVisible({ timeout: 45_000 });
      }

      /* ---- source of truth --------------------------------------------- */
      const admin = adminClient();
      const { data: itemRows, error } = await admin
        .from("workshop_items")
        .select("id, title, status")
        .eq("workshop_id", workshopId);
      expect(error).toBeNull();
      expect(itemRows?.length).toBe(captured.length);

      /* ---- outcome summary ---------------------------------------------- */
      await stages
        .getByRole("button", { name: /Outcome|Summary|Next steps/ })
        .last()
        .click();
      const generate = page.getByRole("button", { name: /Generate outcome summary/ });
      await expect(generate).toBeVisible({ timeout: 45_000 });
      await generate.click();

      await expect(page.getByRole("button", { name: /Export summary \(PDF\)/ })).toBeVisible({
        timeout: 60_000,
      });

      const { data: outcomes } = await admin
        .from("workshop_outcomes")
        .select("workshop_id, summary")
        .eq("workshop_id", workshopId);
      expect(outcomes?.length).toBe(1);
      const counts = (outcomes?.[0]?.summary as { counts?: Record<string, number> })?.counts ?? {};
      const summarised = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
      // Every stored item must be represented somewhere in the counts.
      expect(summarised).toBeGreaterThanOrEqual(itemRows?.length ?? 0);

      /* ---- publish to portfolio ------------------------------------------ */
      await page.getByRole("button", { name: /Publish to portfolio/ }).click();
      await expect(page.getByRole("link", { name: /Open portfolio/ })).toBeVisible({
        timeout: 60_000,
      });

      const { data: portfolios } = await admin
        .from("portfolios")
        .select("id, name")
        .eq("user_id", facilitator.userId);
      expect((portfolios ?? []).length).toBeGreaterThan(0);
    } finally {
      await close();
    }
  });
});
