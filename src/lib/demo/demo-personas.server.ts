/**
 * Demonstration persona inventory. Server-only: reads and rewrites credentials
 * for `@demo.usecasex.app` accounts with the service-role client and never
 * touches real customer identities.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEMO_EMAIL_SUFFIX = "@demo.usecasex.app";

export function demoPersonaPassword() {
  return process.env["DEMO_PERSONA_PASSWORD"] ?? "Demo@123-UCX";
}

export interface SeededPersona {
  id: string;
  email: string;
  emailConfirmed: boolean;
  lastSignInAt: string | null;
  roles: string[];
}

function isDemoEmail(email: string | undefined | null) {
  return Boolean(email?.toLowerCase().endsWith(DEMO_EMAIL_SUFFIX));
}

async function loadDemoUsers() {
  const users: { id: string; email: string; confirmed: boolean; lastSignInAt: string | null }[] =
    [];
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list demonstration accounts: ${error.message}`);
    const batch = data?.users ?? [];
    for (const user of batch) {
      if (!isDemoEmail(user.email)) continue;
      users.push({
        id: user.id,
        email: (user.email ?? "").toLowerCase(),
        confirmed: Boolean(user.email_confirmed_at),
        lastSignInAt: user.last_sign_in_at ?? null,
      });
    }
    if (batch.length < 200) break;
  }
  return users.sort((a, b) => a.email.localeCompare(b.email));
}

async function rolesByUser(userIds: string[]) {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);
  for (const row of data ?? []) {
    const list = map.get(row.user_id) ?? [];
    list.push(String(row.role));
    map.set(row.user_id, list);
  }
  return map;
}

/** The personas that actually exist in this environment, with their roles. */
export async function listSeededPersonas(): Promise<SeededPersona[]> {
  const users = await loadDemoUsers();
  const roles = await rolesByUser(users.map((u) => u.id));
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    emailConfirmed: user.confirmed,
    lastSignInAt: user.lastSignInAt,
    roles: (roles.get(user.id) ?? []).sort(),
  }));
}

export interface PersonaResetResult {
  password: string;
  resetAt: string;
  personas: SeededPersona[];
  failures: { email: string; message: string }[];
}

/**
 * Resets every demonstration account to the known demonstration password and
 * confirms the address, so a walkthrough can always sign in.
 */
export async function resetSeededPersonaPasswords(): Promise<PersonaResetResult> {
  const password = demoPersonaPassword();
  const users = await loadDemoUsers();
  const failures: { email: string; message: string }[] = [];

  for (const user of users) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) failures.push({ email: user.email, message: error.message });
  }

  return {
    password,
    resetAt: new Date().toISOString(),
    personas: await listSeededPersonas(),
    failures,
  };
}
