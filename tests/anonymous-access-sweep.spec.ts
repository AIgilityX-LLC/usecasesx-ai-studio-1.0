import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous access sweep.
 *
 * Two layers are checked, because either one alone gives false confidence:
 *  1. UI — every workspace surface must present a sign-in / no-access
 *     affordance to a signed-out visitor instead of an empty-looking page that
 *     implies there is simply no data.
 *  2. Data — the anon key must not be able to read tenant tables at all, so a
 *     missing client-side guard can never leak rows.
 */
const WORKSPACE_ROUTES = [
  "/dashboard",
  "/opportunities",
  "/opportunity-map",
  "/portfoliox",
  "/roadmap",
  "/reports",
  "/handoffs",
  "/workshops",
  "/my-use-cases",
  "/account/team",
];

const PUBLIC_ROUTES = ["/", "/auth", "/pricing"];

const TENANT_TABLES = [
  "opportunities",
  "portfolios",
  "portfolio_items",
  "use_case_benefits",
  "workshops",
  "workshop_items",
  "suite_handoff_requests",
  "collab_comments",
  "workspace_members",
];

/** True when the page offers a way in rather than pretending to be empty. */
async function showsAccessAffordance(page: Page): Promise<boolean> {
  if (/\/auth/.test(new URL(page.url()).pathname)) return true;
  const body = (await page.locator("body").innerText()).toLowerCase();
  return /sign in|log in|access|upgrade|not signed in|create an account/.test(body);
}

test.describe("anonymous access sweep", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const route of WORKSPACE_ROUTES) {
    test(`anonymous visitor gets no workspace data at ${route}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      await page.goto(route, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);

      // The surface must not crash while unauthenticated.
      expect(errors, `runtime errors at ${route}: ${errors.join(" | ")}`).toHaveLength(0);
      expect(await showsAccessAffordance(page), `${route} gave no sign-in affordance`).toBe(true);
    });
  }

  for (const route of PUBLIC_ROUTES) {
    test(`public route ${route} renders for anonymous visitors`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `${route} responded ${response?.status()}`).toBeLessThan(400);
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 30_000 });
    });
  }

  test("anon key cannot read tenant tables", async () => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
    const anonKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
    test.skip(!url || !anonKey, "Backend credentials are required for the RLS sweep");

    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    for (const table of TENANT_TABLES) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      // Either the policy denies the read outright, or it returns nothing.
      // Returning a row would mean tenant data is world-readable.
      expect(
        error !== null || (data ?? []).length === 0,
        `anon read returned rows from ${table}`,
      ).toBe(true);
    }
  });
});
