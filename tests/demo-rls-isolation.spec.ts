/**
 * Verifies that the Pro and Enterprise demo tenants are isolated by RLS:
 * each persona sees only its own reports, portfolios and export receipts.
 *
 * Run: bunx playwright test tests/demo-rls-isolation.spec.ts
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const PASSWORD = process.env.DEMO_PERSONA_PASSWORD ?? "Demo@123-UCX";

const PERSONAS = {
  pro: {
    email: "pro@demo.usecasex.app",
    portfolio: "FY26 Retail AI Portfolio",
    report: "Pro demo — executive portfolio summary",
    foreignReport: "Enterprise demo — governed value & assurance summary",
  },
  enterprise: {
    email: "enterprise@demo.usecasex.app",
    portfolio: "Group AI Investment Portfolio",
    report: "Enterprise demo — governed value & assurance summary",
    foreignReport: "Pro demo — executive portfolio summary",
  },
} as const;

async function signIn(email: string) {
  const api = await playwrightRequest.newContext({ baseURL: SUPABASE_URL });
  const res = await api.post("/auth/v1/token?grant_type=password", {
    headers: { apikey: SUPABASE_KEY, "content-type": "application/json" },
    data: { email, password: PASSWORD },
  });
  expect(res.ok(), `sign-in failed for ${email}: ${await res.text()}`).toBeTruthy();
  const { access_token } = await res.json();
  await api.dispose();
  return access_token as string;
}

async function restQuery(token: string, path: string) {
  const api = await playwrightRequest.newContext({ baseURL: SUPABASE_URL });
  const res = await api.get(`/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `query failed: ${path} → ${await res.text()}`).toBeTruthy();
  const rows = await res.json();
  await api.dispose();
  return rows as Array<Record<string, unknown>>;
}

test.describe("demo tenant RLS isolation", () => {
  test.skip(!SUPABASE_URL || !SUPABASE_KEY, "Supabase env vars are required");

  for (const [edition, persona] of Object.entries(PERSONAS)) {
    test(`${edition} demo user sees only its own reports and export receipts`, async () => {
      const token = await signIn(persona.email);

      const reports = await restQuery(token, "generated_reports?select=title,workspace_id");
      const titles = reports.map((r) => r.title);
      expect(titles).toContain(persona.report);
      expect(titles).not.toContain(persona.foreignReport);

      const portfolios = await restQuery(token, "portfolios?select=name,workspace_id");
      const names = portfolios.map((p) => p.name);
      expect(names).toContain(persona.portfolio);

      // Every visible row belongs to the persona's own workspace(s).
      const workspaceIds = new Set(reports.map((r) => r.workspace_id));
      for (const portfolio of portfolios) {
        expect(workspaceIds.has(portfolio.workspace_id)).toBeTruthy();
      }

      const receipts = await restQuery(
        token,
        "audit_events?select=id,event_type,workspace_id&event_type=eq.report.exported",
      );
      expect(receipts.length).toBeGreaterThan(0);
      for (const receipt of receipts) {
        expect(workspaceIds.has(receipt.workspace_id)).toBeTruthy();
      }
    });
  }

  test("pro demo user cannot read the enterprise workspace reports directly", async () => {
    const proToken = await signIn(PERSONAS.pro.email);
    const enterpriseToken = await signIn(PERSONAS.enterprise.email);

    const enterpriseReports = await restQuery(
      enterpriseToken,
      "generated_reports?select=id,workspace_id",
    );
    expect(enterpriseReports.length).toBeGreaterThan(0);
    const targetWorkspace = enterpriseReports[0].workspace_id as string;

    const leaked = await restQuery(
      proToken,
      `generated_reports?select=id&workspace_id=eq.${targetWorkspace}`,
    );
    expect(leaked).toHaveLength(0);
  });
});
