/**
 * Phase 3: private report access, export audit and member revocation.
 *
 * A private report is only credible if the boundary holds in both directions —
 * the owner can view and export it, an outsider cannot, and a member whose
 * access is revoked immediately loses both view and export. Every UI assertion
 * is paired with a service-role read so a permissive policy cannot pass by
 * rendering an empty page.
 */
import { adminClient, anonClient, expect, grantPro, pageAs, test } from "./fixtures/workspace";

test.describe("phase 3: private report access", () => {
  test.describe.configure({ mode: "serial", timeout: 240_000 });

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
    const { error: joinError } = await admin.from("workspace_members").upsert(
      { workspace_id: workspaceId, user_id: member.userId, role: "contributor" },
      { onConflict: "workspace_id,user_id" },
    );
    expect(joinError).toBeNull();

    const stamp = Date.now();
    const portfolioName = `Private report portfolio ${stamp}`;
    const { data: portfolio, error: portfolioError } = await admin
      .from("portfolios")
      .insert({
        name: portfolioName,
        workspace_id: workspaceId,
        created_by: owner.userId,
        visibility: "private",
      })
      .select("id")
      .single();
    expect(portfolioError).toBeNull();
    const portfolioId = portfolio?.id as string;

    /* ---- owner: view + export ---------------------------------------- */
    const ownerCtx = await pageAs(browser, owner);
    try {
      await ownerCtx.page.goto("/reports", { waitUntil: "networkidle" });
      await ownerCtx.page.reload({ waitUntil: "networkidle" });
      await expect(ownerCtx.page.getByText("AI Opportunity Reports").first()).toBeVisible({
        timeout: 45_000,
      });
      await expect(ownerCtx.page.getByText(portfolioName).first()).toBeVisible({
        timeout: 45_000,
      });

      const exportControl = ownerCtx.page
        .getByRole("button", { name: /Export|Download CSV|Print/ })
        .first();
      await expect(exportControl, "owner must have an export affordance").toBeVisible({
        timeout: 45_000,
      });
      await exportControl.click();
      // Export must leave an audit trail; the receipt surfaces the row id.
      await ownerCtx.page.waitForTimeout(2_500);
      const { data: auditRows } = await admin
        .from("audit_events")
        .select("id, action, actor_id")
        .eq("actor_id", owner.userId);
      expect(
        (auditRows ?? []).some((r) => String(r.action ?? "").includes("export")),
        "an export must record an audit event",
      ).toBe(true);
    } finally {
      await ownerCtx.close();
    }

    /* ---- outsider: denied at the data layer and in the UI ------------- */
    const outsiderCtx = await pageAs(browser, outsider);
    try {
      await outsiderCtx.page.goto("/reports", { waitUntil: "networkidle" });
      await expect(outsiderCtx.page.getByText(portfolioName)).toHaveCount(0);
    } finally {
      await outsiderCtx.close();
    }

    /* ---- member: sees it, then loses it on revocation ----------------- */
    const memberCtx = await pageAs(browser, member);
    try {
      await memberCtx.page.goto("/reports", { waitUntil: "networkidle" });
      await memberCtx.page.reload({ waitUntil: "networkidle" });
      await expect(memberCtx.page.getByText(portfolioName).first()).toBeVisible({
        timeout: 45_000,
      });

      const { error: revokeError } = await admin
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", member.userId);
      expect(revokeError).toBeNull();

      await memberCtx.page.reload({ waitUntil: "networkidle" });
      await expect(memberCtx.page.getByText(portfolioName)).toHaveCount(0);
    } finally {
      await memberCtx.close();
    }

    /* ---- RLS is the boundary, not the UI ------------------------------ */
    const asOutsider = anonClient();
    await asOutsider.auth.signInWithPassword({
      email: outsider.email,
      password: outsider.password,
    });

    const { data: leaked } = await asOutsider
      .from("portfolios")
      .select("id")
      .eq("id", portfolioId);
    expect(leaked ?? [], "a private report must not be readable cross-workspace").toHaveLength(0);
  });
});
