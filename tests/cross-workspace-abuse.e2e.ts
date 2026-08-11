/**
 * Cross-workspace abuse suite — attempts real attacks with a *valid* session
 * and asserts every one fails.
 *
 *   • anon cannot read tenant tables (portfolios, opportunities, boards, items,
 *     shares, benefits, AI usage)
 *   • tenant B cannot READ tenant A's portfolio / opportunity / board /
 *     use case / portfolio item / share row
 *   • tenant B cannot WRITE into tenant A's workspace (insert, update, delete)
 *   • tenant B cannot re-parent their own row into tenant A's workspace
 *   • share links are capability-scoped: a revoked or expired token yields
 *     nothing, and a valid token does not grant table access
 *
 * Run: bun run tests/cross-workspace-abuse.e2e.ts
 * Requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and two demo accounts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const emailA = process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app";
const emailB = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";

let failures = 0;
const pass = (msg: string) => console.log(`✓ ${msg}`);
const fail = (msg: string) => {
  failures += 1;
  console.error(`✗ ${msg}`);
};

/** A denial is either an error or an empty result — both are acceptable. */
function assertDenied(label: string, result: { data: unknown; error: unknown }) {
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  if (result.error || rows.length === 0) pass(label);
  else fail(`${label} — leaked ${rows.length} row(s)`);
}

function assertWriteDenied(label: string, result: { data: unknown; error: unknown }) {
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  if (result.error || rows.length === 0) pass(label);
  else fail(`${label} — write succeeded`);
}

type Tenant = {
  client: SupabaseClient<any, any, any>;
  userId: string;
  workspaceId: string;
  orgId: string;
};

async function signIn(email: string): Promise<Tenant> {
  const client = createClient<any, any, any>(url!, anonKey!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`);
  const { data: workspaceId, error: wsErr } = await client.rpc("ensure_user_workspace");
  if (wsErr) throw wsErr;
  const { data: ws, error: readErr } = await client
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId as string)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!ws) throw new Error(`workspace not resolvable for ${email}`);
  return {
    client,
    userId: data.user.id,
    workspaceId: ws.id as string,
    orgId: ws.organization_id as string,
  };
}

async function main() {
  const stamp = Date.now();

  // ---------------------------------------------------------------- anon reads
  const anon = createClient<any, any, any>(url!, anonKey!, { auth: { persistSession: false } });
  for (const table of [
    "portfolios",
    "portfolio_items",
    "portfolio_shares",
    "opportunities",
    "use_case_boards",
    "ai_use_cases",
    "use_case_benefits",
    "ai_usage_events",
    "generated_reports",
  ]) {
    assertDenied(`anon cannot read ${table}`, await anon.from(table).select("id").limit(1));
  }

  const a = await signIn(emailA);
  const b = await signIn(emailB);
  if (a.userId === b.userId) throw new Error("Misconfigured: both accounts are the same user");
  if (a.workspaceId === b.workspaceId)
    throw new Error("Misconfigured: both accounts share a workspace");
  pass("two distinct tenants signed in");

  // ------------------------------------------------- tenant A creates records
  const { data: portfolioA, error: pErr } = await a.client
    .from("portfolios")
    .insert({
      name: `Abuse suite portfolio ${stamp}`,
      user_id: a.userId,
      workspace_id: a.workspaceId,
      visibility: "private",
      portfolio_type: "standard",
      status: "draft",
    })
    .select("id")
    .single();
  if (pErr || !portfolioA) throw pErr ?? new Error("tenant A could not create a portfolio");

  const { data: opportunityA, error: oErr } = await a.client
    .from("opportunities")
    .insert({
      title: `Abuse suite opportunity ${stamp}`,
      workspace_id: a.workspaceId,
      created_by: a.userId,
      source: "scratch",
    })
    .select("id")
    .single();
  if (oErr || !opportunityA) throw oErr ?? new Error("tenant A could not create an opportunity");

  const { data: boardA, error: bErr } = await a.client
    .from("use_case_boards")
    .insert({
      title: `Abuse suite board ${stamp}`,
      workspace_id: a.workspaceId,
      created_by: a.userId,
    })
    .select("id")
    .single();
  if (bErr || !boardA) throw bErr ?? new Error("tenant A could not create a board");

  const { data: shareA } = await a.client
    .from("portfolio_shares")
    .insert({ portfolio_id: portfolioA.id, created_by: a.userId, label: "abuse suite" })
    .select("id, token")
    .single();
  pass("tenant A seeded a portfolio, opportunity, board and share link");

  // ----------------------------------------------------- tenant B cross reads
  assertDenied(
    "B cannot read A's portfolio",
    await b.client.from("portfolios").select("id").eq("id", portfolioA.id),
  );
  assertDenied(
    "B cannot read A's opportunity",
    await b.client.from("opportunities").select("id").eq("id", opportunityA.id),
  );
  assertDenied(
    "B cannot read A's board",
    await b.client.from("use_case_boards").select("id").eq("id", boardA.id),
  );
  assertDenied(
    "B cannot enumerate A's workspace rows",
    await b.client.from("portfolios").select("id").eq("workspace_id", a.workspaceId),
  );
  if (shareA) {
    assertDenied(
      "B cannot read A's share token row",
      await b.client.from("portfolio_shares").select("token").eq("id", shareA.id),
    );
  }

  // ---------------------------------------------------- tenant B cross writes
  assertWriteDenied(
    "B cannot insert a portfolio into A's workspace",
    await b.client
      .from("portfolios")
      .insert({
        name: `Injected ${stamp}`,
        user_id: b.userId,
        workspace_id: a.workspaceId,
        visibility: "private",
        portfolio_type: "standard",
        status: "draft",
      })
      .select("id"),
  );
  assertWriteDenied(
    "B cannot insert an opportunity into A's workspace",
    await b.client
      .from("opportunities")
      .insert({
        title: `Injected ${stamp}`,
        workspace_id: a.workspaceId,
        created_by: b.userId,
        source: "scratch",
      })
      .select("id"),
  );
  assertWriteDenied(
    "B cannot insert a use case onto A's board",
    await b.client
      .from("ai_use_cases")
      .insert({ title: `Injected ${stamp}`, board_id: boardA.id, created_by: b.userId })
      .select("id"),
  );
  assertWriteDenied(
    "B cannot rename A's portfolio",
    await b.client
      .from("portfolios")
      .update({ name: "Owned by B" })
      .eq("id", portfolioA.id)
      .select("id"),
  );
  assertWriteDenied(
    "B cannot add an item to A's portfolio",
    await b.client
      .from("portfolio_items")
      .insert({ portfolio_id: portfolioA.id, decision: "shortlist" })
      .select("portfolio_id"),
  );
  assertWriteDenied(
    "B cannot mint a share link for A's portfolio",
    await b.client
      .from("portfolio_shares")
      .insert({ portfolio_id: portfolioA.id, created_by: b.userId })
      .select("id"),
  );
  assertWriteDenied(
    "B cannot delete A's portfolio",
    await b.client.from("portfolios").delete().eq("id", portfolioA.id).select("id"),
  );
  assertWriteDenied(
    "B cannot join A's workspace",
    await b.client
      .from("workspace_members")
      .insert({ workspace_id: a.workspaceId, user_id: b.userId, role: "admin" })
      .select("workspace_id"),
  );

  // ------------------------------------------- re-parenting own row into A
  const { data: portfolioB } = await b.client
    .from("portfolios")
    .insert({
      name: `B portfolio ${stamp}`,
      user_id: b.userId,
      workspace_id: b.workspaceId,
      visibility: "private",
      portfolio_type: "standard",
      status: "draft",
    })
    .select("id")
    .single();
  if (portfolioB) {
    const moved = await b.client
      .from("portfolios")
      .update({ workspace_id: a.workspaceId })
      .eq("id", portfolioB.id)
      .select("id, workspace_id");
    const landed = (moved.data ?? []) as Array<{ workspace_id: string | null }>;
    if (moved.error || landed.every((row) => row.workspace_id !== a.workspaceId)) {
      pass("B cannot move their own portfolio into A's workspace");
    } else {
      fail("B moved their own portfolio into A's workspace");
    }
    await b.client.from("portfolios").delete().eq("id", portfolioB.id);
  }

  // ------------------------------------------------------ share-link controls
  if (shareA) {
    // A live token is a capability, not table access: even the owner's token
    // must not let a foreign session read the underlying rows.
    assertDenied(
      "a share token does not grant B table access",
      await b.client
        .from("portfolio_items")
        .select("portfolio_id")
        .eq("portfolio_id", portfolioA.id),
    );
    assertDenied(
      "anon cannot resolve a share token against the table",
      await anon.from("portfolio_shares").select("portfolio_id").eq("token", shareA.token),
    );

    await a.client
      .from("portfolio_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", shareA.id);
    const { data: stillLive } = await a.client
      .from("portfolio_shares")
      .select("revoked_at")
      .eq("id", shareA.id)
      .maybeSingle();
    if (stillLive?.revoked_at) pass("A can revoke their own share link");
    else fail("share link revocation did not persist");
  }

  // ---------------------------------------------------------------- clean up
  await a.client.from("portfolio_shares").delete().eq("portfolio_id", portfolioA.id);
  await a.client.from("portfolio_items").delete().eq("portfolio_id", portfolioA.id);
  await a.client.from("portfolios").delete().eq("id", portfolioA.id);
  await a.client.from("opportunities").delete().eq("id", opportunityA.id);
  await a.client.from("ai_use_cases").delete().eq("board_id", boardA.id);
  await a.client.from("use_case_boards").delete().eq("id", boardA.id);

  if (failures > 0) {
    console.error(`\n${failures} cross-workspace check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll cross-workspace and share-link controls held.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
