/**
 * Sample tenants — dummy organizations, workspaces and users.
 *
 * Creates (idempotently) four sample organizations, each with an owner, a
 * contributor and a viewer, so multi-tenant functionality (memberships, roles,
 * workspace scoping, entitlements) can be exercised end to end.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *   bun run scripts/seed/sample-tenants.mjs
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const PASSWORD = process.env.SAMPLE_TENANT_PASSWORD ?? `Ux-${randomBytes(18).toString("base64url")}`;
const GENERATED = !process.env.SAMPLE_TENANT_PASSWORD;

const DOMAIN = "sample.usecasex.app";

/** Four sample tenants across different sectors, three seats each. */
const TENANTS = [
  {
    slug: "northwind-bank",
    name: "Northwind Bank",
    industry: "Financial Services",
    country: "United Kingdom",
    plan: "pro",
    members: [
      { key: "owner", name: "Amelia Hart", role: "owner" },
      { key: "lead", name: "Daniel Osei", role: "contributor" },
      { key: "analyst", name: "Priya Raman", role: "viewer" },
    ],
  },
  {
    slug: "helios-health",
    name: "Helios Health Group",
    industry: "Healthcare",
    country: "Germany",
    plan: "pro",
    members: [
      { key: "owner", name: "Lena Vogt", role: "owner" },
      { key: "lead", name: "Marco Bianchi", role: "contributor" },
      { key: "analyst", name: "Sara Lindqvist", role: "viewer" },
    ],
  },
  {
    slug: "atlas-manufacturing",
    name: "Atlas Manufacturing",
    industry: "Manufacturing",
    country: "United States",
    plan: "enterprise",
    members: [
      { key: "owner", name: "Grace Whitmore", role: "owner" },
      { key: "lead", name: "Tomas Nowak", role: "contributor" },
      { key: "analyst", name: "Ibrahim Khan", role: "viewer" },
    ],
  },
  {
    slug: "meridian-public",
    name: "Meridian Public Services",
    industry: "Public Sector",
    country: "Singapore",
    plan: "lite",
    members: [
      { key: "owner", name: "Wei Lin Tan", role: "owner" },
      { key: "lead", name: "Nadia Rahim", role: "contributor" },
      { key: "analyst", name: "Jonas Berg", role: "viewer" },
    ],
  },
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function findUser(email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email, fullName) {
  const existing = await findUser(email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
    return { id: existing.id, created: false };
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return { id: data.user.id, created: true };
}

for (const tenant of TENANTS) {
  let organizationId = null;
  let workspaceId = null;

  for (const member of tenant.members) {
    const email = `${member.key}.${tenant.slug}@${DOMAIN}`;
    const { id: userId, created } = await ensureUser(email, member.name);

    if (member.role === "owner") {
      // Provisions the organization, default workspace, owner memberships and
      // the entitlement row for this tenant.
      const { data: ws, error: wsErr } = await admin.rpc("ensure_user_workspace", {
        _user_id: userId,
      });
      if (wsErr) throw wsErr;
      workspaceId = ws;

      const { data: wsRow, error: wsReadErr } = await admin
        .from("workspaces")
        .select("organization_id")
        .eq("id", workspaceId)
        .single();
      if (wsReadErr) throw wsReadErr;
      organizationId = wsRow.organization_id;

      const { error: orgErr } = await admin
        .from("organizations")
        .update({
          name: tenant.name,
          industry: tenant.industry,
          country: tenant.country,
          plan: tenant.plan,
          type: "company",
        })
        .eq("id", organizationId);
      if (orgErr) throw orgErr;

      const { error: wsNameErr } = await admin
        .from("workspaces")
        .update({ name: `${tenant.name} Workspace` })
        .eq("id", workspaceId);
      if (wsNameErr) throw wsNameErr;
    }

    const { error: orgMemberErr } = await admin.from("organization_members").upsert(
      {
        organization_id: organizationId,
        user_id: userId,
        role: member.role,
        status: "active",
      },
      { onConflict: "organization_id,user_id" },
    );
    if (orgMemberErr) throw orgMemberErr;

    const { error: wsMemberErr } = await admin
      .from("workspace_members")
      .upsert(
        { workspace_id: workspaceId, user_id: userId, role: member.role },
        { onConflict: "workspace_id,user_id" },
      );
    if (wsMemberErr) throw wsMemberErr;

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        email,
        full_name: member.name,
        organization_id: organizationId,
        organization_name: tenant.name,
        plan_type: tenant.plan,
        entitlement_tier: tenant.plan,
        profile_completed: true,
      },
      { onConflict: "user_id" },
    );
    if (profileErr) throw profileErr;

    console.log(
      `${created ? "created" : "updated"}  ${email.padEnd(46)} role=${member.role.padEnd(12)} org=${tenant.name}`,
    );
  }
}

console.log(`\n${TENANTS.length} sample organizations with ${TENANTS.length * 3} users ready.`);
if (GENERATED) {
  console.log(`\nGenerated password for this run (shown once):\n\n  ${PASSWORD}\n`);
} else {
  console.log("Password taken from SAMPLE_TENANT_PASSWORD.");
}
