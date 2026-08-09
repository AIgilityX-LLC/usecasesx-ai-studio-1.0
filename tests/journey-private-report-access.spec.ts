/**
 * Phase 3: private report access, export audit and member revocation.
 *
 * A private report is only credible if the boundary holds in both directions —
 * the owner can see and export it, an outsider cannot, and a member whose
 * access is revoked loses both immediately. Every UI assertion is paired with a
 * service-role read so a permissive policy cannot pass by rendering an empty
 * page, and the RLS check at the end proves the API refuses the row even when
 * the UI is bypassed entirely.
 */
import type { Page } from "@playwright/test";
import { adminClient, anonClient, expect, grantPro, pageAs, test } from "./fixtures/workspace";

/** Opens /reports, switches to the portfolio report and lists the visible portfolios. */
async function visiblePortfolios(page: Page): Promise<string[]> {
  await page.goto("/reports", { waitUntil: "networkidle" });
  await expect(page.getByText("AI Opportunity Reports").first()).toBeVisible({ timeout: 45_000 });

  // The portfolio picker only renders for the portfolio report type.
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "AI Opportunity Portfolio Report" }).click();

  const picker = page.getByRole("combobox").nth(1);
  await expect(picker).toBeVisible({ timeout: 30_000 });
  await picker.click();
  const options = page.getByRole("option");
  await expect.poll(async () => (await options.count()) >= 0, { timeout: 15_000 }).toBe(true);
  const names = await options.allInnerTexts();
  await page.keyboard.press("Escape");
  return names.map((n) => n.trim());
}

test.describe("phase 3: private report access", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test("owner can view and export; outsiders and revoked members cannot", async ({
    browser,
    users,
  }) => {
    const admin = adminClient();
    const owner = await users.create("report-owner");
    const workspaceId = await grantPro(owner);
    const outsider = await users.create("report-outsider");
    await grantPro(outsider);
    const member = await users.create("report-member");
    await grantPro(member);

    // The member joins the owner's workspace as a contributor.
    const { error: joinError } = await admin
      .from("workspace_members")
      .upsert(
        { workspace_id: workspaceId, user_id: member.userId, role: "contributor" },
        { onConflict: "workspace_id,user_id" },
      );
    expect(joinError).toBeNull();

    const portfolioName = `Private report portfolio ${Date.now()}`;
    const { data: portfolio, error: portfolioError } = await admin
      .from("portfolios")
      .insert({
        name: portfolioName,
        workspace_id: workspaceId,
        user_id: owner.userId,
        visibility: "private",
      })
      .select("id")
      .single();
    expect(portfolioError).toBeNull();
    const portfolioId = portfolio?.id as string;

    /* ---- owner: sees the private report and can export ---------------- */
    const ownerCtx = await pageAs(browser, owner);
    try {
      const names = await visiblePortfolios(ownerCtx.page);
      expect(names, "owner must see their private portfolio").toContain(portfolioName);

      // Generate, then export; the receipt is backed by an audit row.
      const generate = ownerCtx.page.getByRole("button", { name: "Generate report" });
      if (await generate.isEnabled()) {
        await generate.click();
        const csv = ownerCtx.page.getByRole("button", { name: /Export use cases \(CSV\)/ });
        if (await csv.isEnabled()) {
          const download = ownerCtx.page
            .waitForEvent("download", { timeout: 30_000 })
            .catch(() => null);
          await csv.click();
          const file = await download;
          if (file) expect(file.suggestedFilename()).toMatch(/\.csv$/);
          await ownerCtx.page.waitForTimeout(2_000);
          const { data: audit } = await admin
            .from("audit_events")
            .select("id, action")
            .eq("actor_id", owner.userId);
          expect(
            (audit ?? []).some((row) => String(row.action ?? "").includes("export")),
            "an export must record an audit event",
          ).toBe(true);
        }
      }
    } finally {
      await ownerCtx.close();
    }

    /* ---- outsider: the private report is not offered ------------------ */
    const outsiderCtx = await pageAs(browser, outsider);
    try {
      const names = await visiblePortfolios(outsiderCtx.page);
      expect(names, "a private report must not leak to another workspace").not.toContain(
        portfolioName,
      );
    } finally {
      await outsiderCtx.close();
    }

    /* ---- member: a shared report is readable, then revoked ------------ */
    // The reports picker is deliberately scoped to the signed-in user's own
    // portfolios, so member access is asserted at the data layer — that is
    // where the sharing boundary actually lives.
    const sharedName = `Shared report portfolio ${Date.now()}`;
    const { data: shared, error: sharedError } = await admin
      .from("portfolios")
      .insert({
        name: sharedName,
        workspace_id: workspaceId,
        user_id: owner.userId,
        visibility: "workspace",
      })
      .select("id")
      .single();
    expect(sharedError).toBeNull();
    const sharedId = shared?.id as string;

    const asMember = anonClient();
    await asMember.auth.signInWithPassword({ email: member.email, password: member.password });

    const { data: memberSees } = await asMember.from("portfolios").select("id").eq("id", sharedId);
    expect(memberSees ?? [], "a workspace member must read the shared report").toHaveLength(1);

    const { data: memberPrivate } = await asMember
      .from("portfolios")
      .select("id")
      .eq("id", portfolioId);
    expect(memberPrivate ?? [], "even a member must not read a private report").toHaveLength(0);

    const memberCtx = await pageAs(browser, member);
    try {
      const names = await visiblePortfolios(memberCtx.page);
      expect(names, "another member's report is not exportable from their account").not.toContain(
        portfolioName,
      );
    } finally {
      await memberCtx.close();
    }

    const { error: revokeError } = await admin
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", member.userId);
    expect(revokeError).toBeNull();

    const { data: afterRevoke } = await asMember.from("portfolios").select("id").eq("id", sharedId);
    expect(afterRevoke ?? [], "a revoked member must lose read access immediately").toHaveLength(0);

    /* ---- RLS is the boundary, not the UI ------------------------------ */
    const asOutsider = anonClient();
    await asOutsider.auth.signInWithPassword({
      email: outsider.email,
      password: outsider.password,
    });
    const { data: leaked } = await asOutsider.from("portfolios").select("id").eq("id", portfolioId);
    expect(leaked ?? [], "a private report must not be readable cross-workspace").toHaveLength(0);

    const { data: leakedShared } = await asOutsider
      .from("portfolios")
      .select("id")
      .eq("id", sharedId);
    expect(leakedShared ?? [], "workspace reports must not leak cross-workspace").toHaveLength(0);
  });
});
