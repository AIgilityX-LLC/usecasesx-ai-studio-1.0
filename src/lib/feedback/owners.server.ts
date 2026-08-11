/**
 * Who can own a request.
 *
 * Assignment targets are platform admins, which means reading role rows and
 * display names for *other* users — something no ordinary authenticated client
 * may do. Callers must authorise the requester (platform admin) before calling
 * this, and only names/emails needed for the picker are returned.
 */
import { PLATFORM_ADMIN_ROLES } from "@/lib/admin/platform-admin";

export interface RequestOwner {
  userId: string;
  name: string;
  email: string | null;
}

export async function listAssignableOwners(): Promise<RequestOwner[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", PLATFORM_ADMIN_ROLES);
  if (roleError) throw new Error(roleError.message);
  const ids = [...new Set((roleRows ?? []).map((row) => String(row.user_id)))];
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message);

  const byId = new Map(
    (profiles ?? []).map((row) => [
      String(row.id),
      {
        name: String(row.full_name ?? row.email ?? "Unnamed admin"),
        email: (row.email as string | null) ?? null,
      },
    ]),
  );

  return ids
    .map((userId) => ({
      userId,
      name: byId.get(userId)?.name ?? "Unnamed admin",
      email: byId.get(userId)?.email ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
