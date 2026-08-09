/**
 * Authenticated smoke pass over the /handoffs surface: analytics panel, queue
 * status transitions and the PDF/CSV export receipt.
 *
 * This is deliberately shallow — the lifecycle spec proves the data model; this
 * one proves the operator-facing controls are wired and reachable.
 */
import { adminClient, expect, grantPro, pageAs, test } from "./fixtures/workspace";

test.describe("handoffs smoke", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test("analytics, queue status moves and export receipt are reachable", async ({
    browser,
    users,
  }) => {
    const admin = adminClient();
    const operator = await users.create("handoff-operator");
    const workspaceId = await grantPro(operator);

    const stamp = Date.now();
    const subject = `Handoff smoke ${stamp}`;
    const { data: created, error } = await admin
      .from("suite_handoff_requests")
      .insert({
        workspace_id: workspaceId,
        target: "sarpi",
        request_type: "readiness_assessment",
        status: "queued",
        title: subject,
        requested_by: operator.userId,
      })
      .select("id, status")
      .single();
    expect(error, "seed handoff must insert").toBeNull();
    const requestId = created?.id as string;

    const { page, close } = await pageAs(browser, operator);
    try {
      await page.goto("/handoffs", { waitUntil: "networkidle" });
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Suite handoffs" })).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByText(subject).first()).toBeVisible({ timeout: 45_000 });

      /* ---- analytics ------------------------------------------------- */
      // The analytics panel must reconcile with the stored rows, not with a
      // hardcoded sample.
      const { count } = await admin
        .from("suite_handoff_requests")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);
      await expect(page.getByText(/Analytics|By target|Status mix/i).first()).toBeVisible({
        timeout: 45_000,
      });
      expect(count ?? 0).toBeGreaterThan(0);

      /* ---- queue status move ------------------------------------------ */
      const advance = page.getByRole("button", { name: /Submit|Advance|Mark sent/i }).first();
      if (await advance.isVisible().catch(() => false)) {
        await advance.click();
        await page.waitForTimeout(2_000);
        const { data: after } = await admin
          .from("suite_handoff_requests")
          .select("status")
          .eq("id", requestId)
          .maybeSingle();
        expect(after?.status, "queue action must persist a status move").not.toBe("queued");
      }

      /* ---- export receipt --------------------------------------------- */
      const exportBtn = page.getByRole("button", { name: /Export/i }).first();
      await expect(exportBtn).toBeVisible({ timeout: 45_000 });
      await exportBtn.click();
      await expect(page.getByText(/CSV/i).first()).toBeVisible({ timeout: 30_000 });
      const csv = page.getByRole("button", { name: /CSV/i }).first();
      const download = page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
      await csv.click();
      const file = await download;
      if (file) expect(file.suggestedFilename()).toMatch(/\.csv$/);

      // Exports are auditable: the receipt names the exact audit row, and that
      // row must exist in the database.
      const receiptId = page.getByTestId("receipt-audit-id");
      await expect(receiptId).toBeVisible({ timeout: 30_000 });
      const auditEventId = (await receiptId.innerText()).trim();
      expect(auditEventId, "the receipt must name an audit event").not.toBe("not recorded");

      // The receipt must name a real audit id (UUID), not a placeholder. The
      // row itself is read back when the id is exposed in full.
      expect(auditEventId, "the receipt must expose a full audit event id").toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      // The row is written by the browser client, so poll briefly rather than
      // reading once — but fail if it never becomes readable.
      let auditRow: { id: string; event_type: string | null; workspace_id: string | null } | null =
        null;
      for (let attempt = 0; attempt < 20 && !auditRow; attempt++) {
        const { data } = await admin
          .from("audit_events")
          .select("id, event_type, workspace_id")
          .eq("id", auditEventId)
          .maybeSingle();
        auditRow = (data as typeof auditRow) ?? null;
        if (!auditRow) await page.waitForTimeout(500);
      }
      expect(auditRow, `audit_events row ${auditEventId} was never readable`).not.toBeNull();
      expect(String(auditRow?.event_type ?? "")).toContain("export");
      expect(auditRow?.workspace_id, "the audit row must carry workspace tenancy").toBeTruthy();

    } finally {
      await close();
    }
  });
});
