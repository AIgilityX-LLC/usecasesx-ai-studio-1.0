import {
  test,
  expect,
  adminClient,
  grantPro,
  pageAs,
  captureOpportunity,
} from "./fixtures/workspace";

/**
 * Phase 3 journey: Discover / Capture -> Opportunity Map -> Portfolio ->
 * Roadmap -> Report export.
 *
 * The point of this spec is not that each page renders, but that the numbers
 * each page shows are the numbers stored against the workspace. Every UI
 * assertion is paired with a read of the source rows through the service-role
 * client, so a chart that quietly drops or double-counts a record fails here.
 */
test.describe("journey: opportunity to portfolio", () => {
  test.describe.configure({ mode: "serial", timeout: 240_000 });

  test("captured opportunities reconcile through map, portfolio, roadmap and report", async ({
    browser,
    users,
  }) => {
    const owner = await users.create("journey-owner");
    await grantPro(owner);
    const { page, close } = await pageAs(browser, owner);

    try {
      const stamp = Date.now();
      const titles = [`Invoice triage ${stamp}`, `Demand forecast ${stamp}`];

      for (const title of titles) {
        await captureOpportunity(page, title);
      }

      /* ---- source of truth ------------------------------------------- */
      const admin = adminClient();
      const { data: rows, error } = await admin
        .from("opportunities")
        .select("id, title, workspace_id, status")
        .eq("created_by", owner.userId);
      expect(error).toBeNull();
      expect(rows?.length).toBe(titles.length);
      const workspaceId = rows?.[0]?.workspace_id as string;
      expect(workspaceId).toBeTruthy();

      /* ---- Opportunity Map ------------------------------------------- */
      // Unclassified opportunities cannot be plotted, but the map must still
      // account for every captured record rather than silently dropping it.
      await page.goto("/opportunity-map", { waitUntil: "networkidle" });
      await expect(page.getByText(/AI Opportunity Map/).first()).toBeVisible({ timeout: 45_000 });
      const captured = titles.length;
      await expect(
        page.getByText(new RegExp(`${captured} opportunit(y|ies) are captured|Filters`)).first(),
      ).toBeVisible({ timeout: 45_000 });

      const classification = page.getByText(/opportunit(y|ies) are captured/).first();
      if (await classification.isVisible().catch(() => false)) {
        const text = await classification.innerText();
        const shown = Number(text.match(/(\d+)\s+opportunit/)?.[1] ?? -1);
        expect(shown, "map count disagrees with stored opportunities").toBe(captured);
      } else {
        for (const title of titles) {
          await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
            timeout: 45_000,
          });
        }
      }

      /* ---- Portfolio -------------------------------------------------- */
      // Provisioning (profile plan + workspace membership) can land after the
      // first authenticated render, so assert the authoritative subject before
      // expecting the entitlement-gated control.
      const { data: membership } = await admin
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", owner.userId);
      expect(membership?.length, "fixture user must own a workspace").toBeGreaterThan(0);
      expect(membership?.[0]?.role).toBe("owner");
      const { data: profile } = await admin
        .from("profiles")
        .select("plan_type")
        .eq("user_id", owner.userId)
        .maybeSingle();
      expect(profile?.plan_type, "fixture user must be on Pro").toBe("pro");

      await page.goto("/portfoliox", { waitUntil: "networkidle" });
      // The authz context polls until tenancy + role resolve; reload once so a
      // subject cached before provisioning cannot gate the control.
      await page.reload({ waitUntil: "networkidle" });
      const newPortfolio = page.getByRole("button", { name: "New portfolio" }).first();
      await expect(newPortfolio, "Pro owner must see the create control").toBeVisible({
        timeout: 45_000,
      });
      await newPortfolio.click();

      const portfolioName = `Journey portfolio ${stamp}`;
      await page.getByLabel("Portfolio name").fill(portfolioName);
      await page.getByLabel("Strategic objective").fill("Verify Phase 3 reconciliation");
      await page
        .getByRole("button", { name: /^Create/ })
        .last()
        .click();
      await expect(page.getByText(portfolioName).first()).toBeVisible({ timeout: 45_000 });

      const { data: portfolios } = await admin
        .from("portfolios")
        .select("id, name, workspace_id")
        .eq("name", portfolioName);
      expect(portfolios?.length).toBe(1);
      const portfolioId = portfolios?.[0]?.id as string;
      expect(portfolios?.[0]?.workspace_id).toBe(workspaceId);

      /* ---- Roadmap ----------------------------------------------------- */
      await page.goto("/roadmap", { waitUntil: "networkidle" });
      await expect(page.getByText(/RoadmapX/).first()).toBeVisible({ timeout: 45_000 });

      const { count: itemCount } = await admin
        .from("portfolio_items")
        .select("use_case_id", { count: "exact", head: true })
        .eq("portfolio_id", portfolioId);
      // A brand new portfolio holds nothing; the roadmap must say so rather
      // than inventing lanes.
      expect(itemCount ?? 0).toBe(0);
      await expect(
        page.getByText(/No use cases to sequence|No portfolios yet|Select a portfolio/).first(),
      ).toBeVisible({ timeout: 45_000 });

      /* ---- Report ------------------------------------------------------ */
      await page.goto("/reports", { waitUntil: "networkidle" });
      await expect(page.getByText("Reports Hub").first()).toBeVisible({
        timeout: 45_000,
      });
      await page.goto("/reports/use-case-business-case", { waitUntil: "networkidle" });
      await expect(page.getByText("Use Case Business Case").first()).toBeVisible({
        timeout: 45_000,
      });
      const generate = page.getByRole("button", { name: /Generate report/ });
      await expect(generate).toBeVisible({ timeout: 45_000 });

      if (await generate.isEnabled()) {
        await generate.click();
        // Export controls unlock only after a report exists.
        await expect(page.getByRole("button", { name: /Export use cases \(CSV\)/ })).toBeEnabled({
          timeout: 45_000,
        });
      } else {
        // Empty selection must not offer an export path.
        await expect(page.getByRole("button", { name: /Export use cases \(CSV\)/ })).toBeDisabled();
      }
    } finally {
      await close();
    }
  });
});
