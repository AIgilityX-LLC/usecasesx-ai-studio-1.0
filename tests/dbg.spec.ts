import { test, expect, adminClient, grantPro, pageAs } from "/dev-server/tests/fixtures/workspace";
test("dbg", async ({ browser, users }) => {
  const u = await users.create("dbg");
  const ws = await grantPro(u);
  const admin = adminClient();
  const { data: mem } = await admin.from("workspace_members").select("*").eq("user_id", u.userId);
  const { data: prof } = await admin.from("profiles").select("plan_type, workspace_id, organization_id").eq("user_id", u.userId);
  console.log("WS", ws, JSON.stringify(mem), JSON.stringify(prof));
  const { page, close } = await pageAs(browser, u);
  await page.goto("/portfoliox", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  console.log("MAIN", (await page.locator("main").innerText()).slice(0,600));
  await close();
  expect(true).toBe(true);
});
