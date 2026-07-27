/**
 * Tenancy foundation checks (membership-scoped ownership).
 *   • every signed-in user resolves to exactly one org + default workspace
 *   • provisioning writes owner-level org + workspace membership rows
 *   • unauthenticated callers are denied on all tenancy tables
 *   • a user cannot read another tenant's membership/entitlement rows
 *   • a user cannot grant themselves membership of another tenant's workspace
 *   • a user cannot self-grant or modify an entitlement
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");

const password = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";
const emailA = process.env.SMOKE_SIGNED_IN_EMAIL ?? "lite@demo.usecasex.app";
const emailB = process.env.SMOKE_DEMO_EMAIL ?? "pro@demo.usecasex.app";

async function signIn(email: string) {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`sign-in failed for ${email}`);
  const { data: workspaceId, error: wsErr } = await client.rpc("ensure_user_workspace" as any);
  if (wsErr) throw wsErr;
  const { data: ws, error: readErr } = await client
    .from("workspaces").select("id, organization_id").eq("id", workspaceId as any).maybeSingle();
  if (readErr) throw readErr;
  if (!ws) throw new Error(`workspace not resolvable for ${email}`);
  return { client, userId: data.user.id, workspaceId: ws.id as string, orgId: ws.organization_id as string };
}

async function main() {
  // 1 — unauthenticated denial
  const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
  for (const table of ["organization_members", "workspace_members", "entitlements", "organization_units"]) {
    const { data } = await anon.from(table as any).select("id").limit(1);
    if (data && data.length > 0) throw new Error(`anon can read ${table}`);
  }
  const { data: publicPlans } = await anon.from("plans" as any).select("code");
  if (!publicPlans || publicPlans.length === 0) throw new Error("public plans catalogue is not readable");
  console.log("✓ unauthenticated access denied on tenancy tables; public plans still readable");

  const a = await signIn(emailA);
  const b = await signIn(emailB);
  if (a.userId === b.userId) throw new Error("Test misconfigured: both demo accounts resolve to the same user");
  if (a.orgId === b.orgId) throw new Error("Test misconfigured: both demo accounts share an organization");
  console.log("✓ two distinct tenants provisioned");

  // 2 — provisioning creates owner membership rows
  const { data: ownRole } = await a.client
    .from("organization_members" as any).select("role, status")
    .eq("organization_id", a.orgId).eq("user_id", a.userId).maybeSingle();
  if (!ownRole || (ownRole as any).role !== "owner" || (ownRole as any).status !== "active")
    throw new Error("provisioning did not create an active owner organization membership");
  const { data: ownWsRole } = await a.client
    .from("workspace_members" as any).select("role")
    .eq("workspace_id", a.workspaceId).eq("user_id", a.userId).maybeSingle();
  if (!ownWsRole) throw new Error("provisioning did not create a workspace membership");
  console.log("✓ owner/admin roles are membership-derived, not client-supplied");

  // 3 — cross-tenant membership reads denied
  const { data: crossOrg } = await a.client
    .from("organization_members" as any).select("id").eq("organization_id", b.orgId);
  if (crossOrg && crossOrg.length > 0) throw new Error("User A can read tenant B organization members");
  const { data: crossWs } = await a.client
    .from("workspace_members" as any).select("id").eq("workspace_id", b.workspaceId);
  if (crossWs && crossWs.length > 0) throw new Error("User A can read tenant B workspace members");
  console.log("✓ cross-workspace membership reads denied");

  // 4 — cannot self-join another tenant's workspace (contributor/viewer escalation)
  const { error: joinError } = await a.client
    .from("workspace_members" as any)
    .insert({ workspace_id: b.workspaceId, user_id: a.userId, role: "admin" });
  if (!joinError) throw new Error("User A inserted themselves into tenant B's workspace");
  const { error: orgJoinError } = await a.client
    .from("organization_members" as any)
    .insert({ organization_id: b.orgId, user_id: a.userId, role: "owner", status: "active" });
  if (!orgJoinError) throw new Error("User A inserted themselves into tenant B's organization");
  console.log("✓ cross-workspace membership writes denied");

  // 5 — entitlements are read-only from the browser
  const { data: crossEnt } = await a.client
    .from("entitlements" as any).select("id").eq("organization_id", b.orgId);
  if (crossEnt && crossEnt.length > 0) throw new Error("User A can read tenant B entitlements");
  const { error: selfGrant } = await a.client
    .from("entitlements" as any)
    .insert({ organization_id: a.orgId, plan_code: "enterprise", source: "self" });
  if (!selfGrant) throw new Error("User A self-granted an entitlement");
  console.log("✓ entitlements cannot be self-granted or read cross-tenant");

  // 6 — T6 dual-predicate policies on user-owned tenant records
  const { data: created, error: createErr } = await a.client
    .from("collections")
    .insert({ user_id: a.userId, name: `tenancy-isolation ${Date.now()}` })
    .select("id, workspace_id, organization_id")
    .single();
  if (createErr || !created) throw new Error(`Owner could not create their own collection: ${createErr?.message}`);
  if (!created.workspace_id || !created.organization_id)
    throw new Error("Sync trigger did not stamp workspace/organization on the new collection");

  const { data: ownRead } = await a.client.from("collections").select("id").eq("id", created.id);
  if (!ownRead || ownRead.length !== 1) throw new Error("Owner cannot read back their own collection");

  const { data: crossRead } = await b.client.from("collections").select("id").eq("id", created.id);
  if (crossRead && crossRead.length > 0)
    throw new Error("User B can read a collection owned by tenant A's workspace");

  const { error: crossWriteErr } = await b.client
    .from("collections")
    .insert({ user_id: b.userId, name: "cross-tenant", workspace_id: created.workspace_id });
  if (!crossWriteErr) throw new Error("User B inserted a collection into tenant A's workspace");

  const { error: forgeErr } = await b.client
    .from("collections")
    .insert({ user_id: a.userId, name: "forged owner" });
  if (!forgeErr) throw new Error("User B forged a collection owned by user A");

  const { error: crossDeleteErr } = await b.client.from("collections").delete().eq("id", created.id);
  const { data: stillThere } = await a.client.from("collections").select("id").eq("id", created.id);
  if (!stillThere || stillThere.length !== 1)
    throw new Error(`User B deleted tenant A's collection (${crossDeleteErr?.message ?? "no error"})`);

  await a.client.from("collections").delete().eq("id", created.id);
  console.log("✓ user-owned tenant records: owner read/write ok, cross-workspace read/write/delete denied");



  await a.client.auth.signOut();
  await b.client.auth.signOut();
}

main()
  .then(() => console.log("\n✅ Tenancy isolation passed."))
  .catch((err) => {
    console.error("\n❌ Tenancy isolation failed:", err.message ?? err);
    process.exit(1);
  });
