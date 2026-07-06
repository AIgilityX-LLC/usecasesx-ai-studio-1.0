/**
 * Smoke test: sign in as each of the 5 demo accounts, hit a role-appropriate
 * route, and attempt a cross-org read. Runs against E2E_BASE_URL (default the
 * local dev server); point it at the published URL by setting E2E_BASE_URL.
 *
 * Run: bunx playwright test tests/demo-smoke.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

type Demo = {
  email: string;
  password: string;
  label: string;
  primaryRoute: string;
  mustSee: RegExp;
  mustNotSee?: RegExp;
};

const DEMOS: Demo[] = [
  { email: "admin@demo.usecasex.app", password: "Demo@123", label: "admin",
    primaryRoute: "/administration", mustSee: /admin|manage|users/i },
  { email: "moderator@demo.usecasex.app", password: "Demo@123", label: "moderator",
    primaryRoute: "/administration", mustSee: /admin|manage|users|moderation/i },
  { email: "enterprise@demo.usecasex.app", password: "Demo@123", label: "enterprise",
    primaryRoute: "/studio/portfolio", mustSee: /portfolio|roadmap/i },
  { email: "pro@demo.usecasex.app", password: "Demo@123", label: "pro",
    primaryRoute: "/studio/portfolio", mustSee: /portfolio|roadmap/i },
  { email: "lite@demo.usecasex.app", password: "Demo@123", label: "lite",
    primaryRoute: "/dashboard", mustSee: /dashboard|explore|repository/i },
];

async function mintSession(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Auth failed for ${email}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function injectSession(page: Page, session: unknown) {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: `sb-${ref}-auth-token`, value: JSON.stringify(session) },
  );
}

// Pre-seed a canary board owned by "pro" so other accounts can attempt to read it.
let canaryBoardId: string | null = null;

test.beforeAll(async () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const session = await mintSession("pro@demo.usecasex.app", "Demo@123");
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const ws = await (await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_user_workspace`, {
    method: "POST", headers, body: "{}",
  })).json();
  const b = await (await fetch(`${SUPABASE_URL}/rest/v1/use_case_boards`, {
    method: "POST", headers, body: JSON.stringify({
      workspace_id: ws, title: `Canary ${Date.now()}`, board_type: "studio",
      status: "active", created_by: session.user.id,
    }),
  })).json();
  canaryBoardId = Array.isArray(b) ? b[0]?.id : b?.id;
});

for (const demo of DEMOS) {
  test(`smoke: ${demo.label} — login + ${demo.primaryRoute} + cross-org isolation`, async ({ page }) => {
    test.setTimeout(60_000);
    if (!SUPABASE_URL || !SUPABASE_KEY) test.skip(true, "Supabase env not set");

    const session = await mintSession(demo.email, demo.password);
    expect(session.access_token, "session minted").toBeTruthy();

    await injectSession(page, session);
    await page.goto(`${BASE}${demo.primaryRoute}`);
    await page.waitForLoadState("domcontentloaded");
    // Small settle for client-side gating (RequirePlan / RequireRoles)
    await page.waitForTimeout(1500);
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(body).toMatch(demo.mustSee);

    // Cross-org read: another user's canary board must not be visible via API.
    if (canaryBoardId && demo.email !== "pro@demo.usecasex.app") {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/use_case_boards?id=eq.${canaryBoardId}&select=id`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } },
      );
      const rows = await res.json();
      expect(Array.isArray(rows) ? rows.length : 1, `RLS must hide pro user's board from ${demo.label}`).toBe(0);
    }
  });
}
