/**
 * Playwright fixtures that provision throwaway accounts and workspaces per test.
 *
 * Every test gets its own freshly created users, so no spec depends on the
 * seeded demo personas or on state left behind by a previous run. Each user
 * signs in once through the UI, which provisions their own organization and
 * workspace via `ensure_user_workspace`, giving hard tenant isolation between
 * concurrently running specs.
 */
import { test as base, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const ANON_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export const TEST_PASSWORD = "Fixture@123-UCX";

export type TestUser = {
  email: string;
  password: string;
  userId: string;
  fullName: string;
};

export function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required for the test fixtures");
  }
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

export function anonClient(): SupabaseClient {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are required for the test fixtures");
  }
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
}

let counter = 0;

/** Creates a confirmed user through the admin API and returns its credentials. */
export async function createTestUser(prefix: string): Promise<TestUser> {
  const admin = adminClient();
  counter += 1;
  const stamp = `${Date.now().toString(36)}${counter}`;
  const email = `e2e-${prefix}-${stamp}@usecasex.test`;
  const fullName = `E2E ${prefix} ${stamp}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw error ?? new Error(`Could not create test user ${email}`);
  // The profile row drives display names in the collaboration timeline.
  await admin
    .from("profiles")
    .upsert({ user_id: data.user.id, email, full_name: fullName }, { onConflict: "user_id" });
  return { email, password: TEST_PASSWORD, userId: data.user.id, fullName };
}

export async function deleteTestUser(userId: string) {
  const admin = adminClient();
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Leftover tenant rows can block the delete; the account is isolated anyway.
  }
}

/** Factory handed to tests; every user it mints is deleted during teardown. */
export class UserFactory {
  private created: TestUser[] = [];

  async create(prefix: string) {
    const user = await createTestUser(prefix);
    this.created.push(user);
    return user;
  }

  async cleanup() {
    await Promise.all(this.created.map((u) => deleteTestUser(u.userId)));
    this.created = [];
  }
}

/** Signs a user in through the UI and waits for the app shell. */
export async function signIn(page: Page, user: TestUser) {
  await page.goto("/auth", { waitUntil: "networkidle" });
  // The controlled inputs only accept text once React has hydrated.
  await page.waitForTimeout(2000);
  await page.getByPlaceholder("you@org.com").fill(user.email);
  await page.getByPlaceholder(/^Password/).fill(user.password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 60_000 });
}

/** Opens a fresh browser context already signed in as `user`. */
export async function pageAs(
  browser: import("@playwright/test").Browser,
  user: TestUser,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, user);
  return { page, close: () => context.close() };
}

export async function openTeam(page: Page) {
  await page.goto("/account/team", { waitUntil: "networkidle" });
  await expect(page.getByText("Team size")).toBeVisible({ timeout: 45_000 });
}

/** Creates an invitation from the team page and returns its /invite/<token> path. */
export async function createInvitation(page: Page, email?: string): Promise<string> {
  const link = page.locator("code", { hasText: "/invite/" }).first();
  const before = (await link.count()) > 0 ? (await link.innerText()).trim() : "";
  await page.getByLabel("Email (optional for a share link)").fill(email ?? "");
  await page.getByRole("button", { name: "Create invitation" }).click();
  await expect(link).toBeVisible({ timeout: 45_000 });
  // The panel reuses the same element, so wait for a genuinely new token.
  await expect
    .poll(async () => (await link.innerText()).trim(), { timeout: 45_000 })
    .not.toBe(before);
  return new URL((await link.innerText()).trim()).pathname;
}

/** Captures an opportunity and returns its route path. */
export async function captureOpportunity(page: Page, name: string): Promise<string> {
  await page.goto("/opportunities/new", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.getByLabel(/Problem name/).fill(name);
  await page.getByRole("button", { name: "Save opportunity" }).click();
  await page.waitForURL(/\/opportunities\/[0-9a-f-]{36}/, { timeout: 60_000 });
  return new URL(page.url()).pathname;
}

export const test = base.extend<{ users: UserFactory }>({
  users: async ({}, use) => {
    const factory = new UserFactory();
    await use(factory);
    await factory.cleanup();
  },
});

export { expect };
