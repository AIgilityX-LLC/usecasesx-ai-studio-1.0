/**
 * Launch data baseline — demo accounts.
 *
 * Creates (idempotently) the five demo accounts used by the isolation,
 * tenancy and authz suites, provisions each one's organization + default
 * workspace, and applies its plan/role.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *   bun run scripts/seed/demo-accounts.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const PASSWORD = process.env.SMOKE_DEMO_PASSWORD ?? "Demo@123";

const ACCOUNTS = [
  { email: "admin@demo.usecasex.app", label: "Admin", role: "admin", plan: "enterprise" },
  { email: "moderator@demo.usecasex.app", label: "Moderator", role: "moderator", plan: "pro" },
  { email: "enterprise@demo.usecasex.app", label: "Enterprise", role: null, plan: "enterprise" },
  { email: "pro@demo.usecasex.app", label: "Pro", role: null, plan: "pro" },
  { email: "lite@demo.usecasex.app", label: "Lite", role: null, plan: "lite" },
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listErr) throw listErr;

for (const acct of ACCOUNTS) {
  const existing = listed.users.find((u) => u.email?.toLowerCase() === acct.email);
  let userId = existing?.id;
  let created = false;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: acct.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: `${acct.label} Demo` },
    });
    if (error) throw error;
    userId = data.user.id;
    created = true;
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
    if (error) throw error;
  }

  // organization + default workspace + owner memberships + entitlement row
  const { data: workspaceId, error: wsErr } = await admin.rpc("ensure_user_workspace", {
    _user_id: userId,
  });
  if (wsErr) throw wsErr;

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      full_name: `${acct.label} Demo`,
      plan_type: acct.plan,
      entitlement_tier: acct.plan,
      profile_completed: true,
    })
    .eq("user_id", userId);
  if (profErr) throw profErr;

  if (acct.role) {
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: acct.role }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;
  }

  console.log(
    `${created ? "created" : "updated"}  ${acct.email.padEnd(32)} plan=${acct.plan.padEnd(10)} workspace=${workspaceId}`,
  );
}

console.log(`\n${ACCOUNTS.length} demo accounts ready (password: ${PASSWORD}).`);
