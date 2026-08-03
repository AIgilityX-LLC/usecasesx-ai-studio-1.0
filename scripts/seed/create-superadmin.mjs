/**
 * Platform SuperAdmin provisioning.
 *
 * Creates (idempotently) one platform-level administrator used to exercise the
 * admin surfaces and to approve other admin/user roles. Credentials are never
 * committed: pass them in the environment.
 *
 *   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... \
 *     bun run scripts/seed/create-superadmin.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const email = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD ?? "";
if (!email || !password) {
  throw new Error("Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in the environment.");
}

const fullName = process.env.SUPERADMIN_NAME ?? "Platform SuperAdmin";
/** Platform administration needs the super_admin role; admin keeps existing
 *  admin-tier policies (is_admin_tier / is_editor_tier) satisfied. */
const ROLES = ["super_admin", "admin"];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listErr) throw listErr;

const existing = listed.users.find((u) => u.email?.toLowerCase() === email);
let userId = existing?.id;
let created = false;

if (!userId) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  userId = data.user.id;
  created = true;
} else {
  const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
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
    full_name: fullName,
    plan_type: "enterprise",
    entitlement_tier: "enterprise",
    profile_completed: true,
  })
  .eq("user_id", userId);
if (profErr) throw profErr;

for (const role of ROLES) {
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (error) throw error;
}

console.log(
  `${created ? "created" : "updated"}  ${email}  roles=${ROLES.join(",")}  workspace=${workspaceId}`,
);
console.log("Password was taken from SUPERADMIN_PASSWORD and is not logged.");
