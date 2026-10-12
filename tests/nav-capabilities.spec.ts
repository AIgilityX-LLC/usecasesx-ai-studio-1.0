import { test, expect } from "@playwright/test";

/**
 * Integration: protected routes show an access affordance when the visitor
 * cannot satisfy the nav capability (signed-out → sign-in; deep link denied).
 *
 * Full persona login matrix requires seeded demo accounts — covered in unit
 * tests (`tests/unit/nav-capabilities.test.ts`). This suite asserts the route
 * guard UI contract without weakening RLS.
 */

const PROTECTED: Array<{ path: string; expectDeniedOrSignIn: boolean }> = [
  { path: "/platform-admin", expectDeniedOrSignIn: true },
  { path: "/platform-admin/submissions", expectDeniedOrSignIn: true },
  { path: "/administration", expectDeniedOrSignIn: true },
  { path: "/admin-observability", expectDeniedOrSignIn: true },
  { path: "/reviews", expectDeniedOrSignIn: true },
  { path: "/reports", expectDeniedOrSignIn: true },
  { path: "/module-analytics", expectDeniedOrSignIn: true },
];

async function showsGuard(page: import("@playwright/test").Page): Promise<boolean> {
  const url = page.url();
  if (/\/auth|\/pro/.test(new URL(url).pathname)) return true;
  const body = (await page.locator("body").innerText()).toLowerCase();
  return /sign.in|access denied|verifying access|not signed in|workspace admins only/.test(body);
}

test.describe("nav capability route guards (anonymous)", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const route of PROTECTED) {
    test(`${route.path} denies anonymous deep link`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      // Allow client auth/capability resolution to settle.
      await page.waitForTimeout(1500);
      expect(await showsGuard(page)).toBe(true);
    });
  }
});
