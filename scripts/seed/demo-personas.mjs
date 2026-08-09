/**
 * Demo personas for client demonstrations.
 *
 * Creates (idempotently) the four demo personas shown on /demo-login, each with
 * its own organization + default workspace, plan and role. These accounts are
 * demonstration-only and hold no production data.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *   bun run scripts/seed/demo-personas.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

/** Shared demonstration password. Override with DEMO_PERSONA_PASSWORD. */
const PASSWORD = process.env.DEMO_PERSONA_PASSWORD ?? "Demo@123-UCX";

const PERSONAS = [
  {
    email: "superadmin@demo.usecasex.app",
    label: "Platform SuperAdmin",
    role: "super_admin",
    plan: "enterprise",
  },
  {
    email: "tenantadmin@demo.usecasex.app",
    label: "Tenant Admin",
    role: "admin",
    plan: "enterprise",
  },
  {
    email: "facilitator@demo.usecasex.app",
    label: "Facilitator / Trainer",
    role: null,
    plan: "pro",
  },
  { email: "participant1@demo.usecasex.app", label: "Participant One", role: null, plan: "pro" },
  { email: "participant2@demo.usecasex.app", label: "Participant Two", role: null, plan: "pro" },
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 500,
});
if (listErr) throw listErr;

for (const persona of PERSONAS) {
  const existing = listed.users.find((u) => u.email?.toLowerCase() === persona.email);
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: persona.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: persona.label },
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
    if (error) throw error;
  }

  const { error: wsErr } = await admin.rpc("ensure_user_workspace", { _user_id: userId });
  if (wsErr) throw wsErr;

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      full_name: persona.label,
      plan_type: persona.plan,
      entitlement_tier: persona.plan,
      profile_completed: true,
    })
    .eq("user_id", userId);
  if (profErr) throw profErr;

  if (persona.role) {
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: persona.role }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;
  }

  console.log(`ready  ${persona.email.padEnd(36)} ${persona.label}`);
}

console.log(`\n${PERSONAS.length} demo personas ready.`);

/* Facilitator + participants share one demo workspace so a full workshop
   journey (invite → submit → vote → convert) can be shown end to end. */
const idFor = async (email) => {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  return data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
};

const facilitatorId = await idFor("facilitator@demo.usecasex.app");
if (facilitatorId) {
  const { data: prof } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("user_id", facilitatorId)
    .maybeSingle();
  const orgId = prof?.organization_id;
  const { data: ws } = await admin
    .from("workspaces")
    .select("id")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle();

  for (const email of ["participant1@demo.usecasex.app", "participant2@demo.usecasex.app"]) {
    const uid = await idFor(email);
    if (!uid || !orgId || !ws?.id) continue;
    await admin.from("profiles").update({ organization_id: orgId }).eq("user_id", uid);
    await admin
      .from("organization_members")
      .upsert(
        { organization_id: orgId, user_id: uid, role: "member", status: "active" },
        { onConflict: "organization_id,user_id" },
      );
    await admin
      .from("workspace_members")
      .upsert(
        { workspace_id: ws.id, user_id: uid, role: "member" },
        { onConflict: "workspace_id,user_id" },
      );
    console.log(`joined ${email.padEnd(36)} demo workspace ${ws.id}`);
  }
}
