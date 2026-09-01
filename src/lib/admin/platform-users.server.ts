/**
 * Platform administrator provisioning (server-only).
 *
 * Creates, disables, re-enables and rotates credentials for the accounts that
 * hold global power (`super_admin`, `admin`). Uses the service-role client
 * because Auth Admin calls and role grants are privileged by definition; every
 * caller is authorised in the server function before these helpers run.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  passwordRotationState,
  validatePlatformPassword,
  type RotationState,
} from "@/lib/admin/password-policy";

/** Roles this console may grant. Anything wider stays a database operation. */
export const PLATFORM_GRANTABLE_ROLES = ["super_admin", "admin"] as const;
export type PlatformGrantableRole = (typeof PLATFORM_GRANTABLE_ROLES)[number];

/** Ban duration used to disable an account without deleting its history. */
const DISABLE_DURATION = "876000h"; // ~100 years
const ENABLE_DURATION = "none";

export interface PlatformAdminAccount {
  id: string;
  email: string;
  fullName: string | null;
  roles: PlatformGrantableRole[];
  otherRoles: string[];
  disabled: boolean;
  emailConfirmed: boolean;
  lastSignInAt: string | null;
  createdAt: string | null;
  passwordRotatedAt: string | null;
  rotation: RotationState;
  organizationId: string | null;
  organizationName: string | null;
}

export interface OrganizationOption {
  id: string;
  name: string;
  isDemo: boolean;
}

function assertPolicy(password: string, email: string) {
  const result = validatePlatformPassword(password, { email });
  if (!result.ok) {
    throw new Error(`Password policy not met: ${result.errors.join("; ")}`);
  }
}

async function allAuthUsers() {
  const users: {
    id: string;
    email: string;
    confirmed: boolean;
    lastSignInAt: string | null;
    createdAt: string | null;
    disabled: boolean;
    fullName: string | null;
    passwordRotatedAt: string | null;
  }[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list accounts: ${error.message}`);
    const batch = data?.users ?? [];
    for (const user of batch) {
      const raw = user as unknown as Record<string, unknown>;
      const bannedUntil = typeof raw["banned_until"] === "string" ? raw["banned_until"] : null;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      users.push({
        id: user.id,
        email: (user.email ?? "").toLowerCase(),
        confirmed: Boolean(user.email_confirmed_at),
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at ?? null,
        disabled: Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now()),
        fullName: typeof meta["full_name"] === "string" ? (meta["full_name"] as string) : null,
        passwordRotatedAt:
          typeof meta["password_rotated_at"] === "string"
            ? (meta["password_rotated_at"] as string)
            : null,
      });
    }
    if (batch.length < 200) break;
  }
  return users;
}

/** Every account holding a platform role, with rotation and org assignment. */
export async function listPlatformAdmins(): Promise<PlatformAdminAccount[]> {
  const [{ data: roleRows, error: roleError }, users, { data: orgs }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("user_id, role"),
    allAuthUsers(),
    supabaseAdmin.from("organizations").select("id, name"),
  ]);
  if (roleError) throw new Error(`Could not read roles: ${roleError.message}`);

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(String(row.role));
    rolesByUser.set(row.user_id, list);
  }

  const platformIds = [...rolesByUser.entries()]
    .filter(([, roles]) =>
      roles.some((role) => (PLATFORM_GRANTABLE_ROLES as readonly string[]).includes(role)),
    )
    .map(([userId]) => userId);
  if (platformIds.length === 0) return [];

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("user_id, full_name, organization_id")
    .in("user_id", platformIds);
  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return users
    .filter((user) => platformIds.includes(user.id))
    .map((user) => {
      const roles = rolesByUser.get(user.id) ?? [];
      const profile = profileByUser.get(user.id);
      const organizationId = (profile?.organization_id as string | null) ?? null;
      return {
        id: user.id,
        email: user.email,
        fullName: (profile?.full_name as string | null) ?? user.fullName,
        roles: roles.filter((role): role is PlatformGrantableRole =>
          (PLATFORM_GRANTABLE_ROLES as readonly string[]).includes(role),
        ),
        otherRoles: roles
          .filter((role) => !(PLATFORM_GRANTABLE_ROLES as readonly string[]).includes(role))
          .sort(),
        disabled: user.disabled,
        emailConfirmed: user.confirmed,
        lastSignInAt: user.lastSignInAt,
        createdAt: user.createdAt,
        passwordRotatedAt: user.passwordRotatedAt,
        rotation: passwordRotationState(user.passwordRotatedAt),
        organizationId,
        organizationName: organizationId ? (orgNameById.get(organizationId) ?? null) : null,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Organizations available for assignment. */
export async function listOrganizationOptions(): Promise<OrganizationOption[]> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, is_demo")
    .order("name");
  if (error) throw new Error(`Could not read organizations: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    isDemo: Boolean(row.is_demo),
  }));
}

async function recordEvent(
  actorId: string,
  eventType: string,
  targetUserId: string,
  newValue: Record<string, unknown>,
) {
  await supabaseAdmin.from("audit_events").insert({
    actor_id: actorId,
    entity_type: "platform_admin",
    entity_id: targetUserId,
    event_type: eventType,
    new_value: newValue,
    severity: "warning",
    source: "administration.platform-admins",
  });
}

async function setRoles(userId: string, roles: PlatformGrantableRole[]) {
  const wanted = [...new Set(roles)];
  if (wanted.length === 0) throw new Error("Select at least one platform role.");
  for (const role of wanted) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    if (error) throw new Error(`Could not grant ${role}: ${error.message}`);
  }
  const remove = PLATFORM_GRANTABLE_ROLES.filter((role) => !wanted.includes(role));
  if (remove.length > 0) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", remove);
    if (error) throw new Error(`Could not revoke roles: ${error.message}`);
  }
}

export interface CreatePlatformAdminInput {
  email: string;
  password: string;
  fullName: string;
  roles: PlatformGrantableRole[];
  organizationId?: string | null;
}

/** Creates (or re-provisions) a platform administrator. */
export async function createPlatformAdmin(actorId: string, input: CreatePlatformAdminInput) {
  const email = input.email.trim().toLowerCase();
  assertPolicy(input.password, email);
  const rotatedAt = new Date().toISOString();

  const existing = (await allAuthUsers()).find((user) => user.email === email);
  let userId = existing?.id;
  let created = false;

  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: input.password,
      email_confirm: true,
      ban_duration: ENABLE_DURATION,
      user_metadata: { full_name: input.fullName, password_rotated_at: rotatedAt },
    });
    if (error) throw new Error(`Could not update the account: ${error.message}`);
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, password_rotated_at: rotatedAt },
    });
    if (error) throw new Error(`Could not create the account: ${error.message}`);
    userId = data.user.id;
    created = true;
  }

  // organisation + workspace + owner membership + entitlement row
  const { error: wsError } = await supabaseAdmin.rpc("ensure_user_workspace", { _user_id: userId });
  if (wsError) throw new Error(`Could not provision a workspace: ${wsError.message}`);

  await setRoles(userId, input.roles);

  const profilePatch: Record<string, unknown> = {
    full_name: input.fullName,
    plan_type: "enterprise",
    entitlement_tier: "enterprise",
    profile_completed: true,
  };
  if (input.organizationId) profilePatch["organization_id"] = input.organizationId;
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update(profilePatch)
    .eq("user_id", userId);
  if (profileError) throw new Error(`Could not update the profile: ${profileError.message}`);

  await recordEvent(
    actorId,
    created ? "platform_admin.created" : "platform_admin.reprovisioned",
    userId,
    {
      email,
      roles: input.roles,
      organization_id: input.organizationId ?? null,
      password_rotated_at: rotatedAt,
    },
  );

  return { userId, created, rotatedAt };
}

/** Disables or re-enables an account without destroying its audit history. */
export async function setPlatformAdminDisabled(actorId: string, userId: string, disabled: boolean) {
  if (actorId === userId && disabled) {
    throw new Error("You cannot disable the account you are signed in with.");
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: disabled ? DISABLE_DURATION : ENABLE_DURATION,
  });
  if (error) throw new Error(`Could not change the account state: ${error.message}`);
  await recordEvent(
    actorId,
    disabled ? "platform_admin.disabled" : "platform_admin.enabled",
    userId,
    {
      disabled,
    },
  );
  return { userId, disabled };
}

/** Rotates a platform-admin password and records the rotation date. */
export async function resetPlatformAdminPassword(
  actorId: string,
  userId: string,
  password: string,
  email: string,
) {
  assertPolicy(password, email);
  const rotatedAt = new Date().toISOString();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: { password_rotated_at: rotatedAt },
  });
  if (error) throw new Error(`Could not reset the password: ${error.message}`);
  await recordEvent(actorId, "platform_admin.password_rotated", userId, { rotated_at: rotatedAt });
  return { userId, rotatedAt };
}

/** Replaces the granted platform roles for one account. */
export async function updatePlatformAdminRoles(
  actorId: string,
  userId: string,
  roles: PlatformGrantableRole[],
) {
  await setRoles(userId, roles);
  await recordEvent(actorId, "platform_admin.roles_changed", userId, { roles });
  return { userId, roles };
}

/** Assigns (or clears) the organisation a platform administrator belongs to. */
export async function assignPlatformAdminOrganization(
  actorId: string,
  userId: string,
  organizationId: string | null,
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ organization_id: organizationId })
    .eq("user_id", userId);
  if (error) throw new Error(`Could not assign the organisation: ${error.message}`);
  await recordEvent(actorId, "platform_admin.organization_assigned", userId, {
    organization_id: organizationId,
  });
  return { userId, organizationId };
}
