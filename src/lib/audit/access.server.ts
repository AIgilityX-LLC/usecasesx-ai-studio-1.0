/**
 * Authorization for audit filter / export APIs.
 * Tenant administrators (org owner/admin) and platform auditors may read;
 * ordinary contributors cannot export or browse tenant-wide history.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditReaderScope = {
  userId: string;
  /** When set, queries are forced to this organization_id. */
  tenantId: string | null;
  /** Platform admin / auditor may omit tenant filter (cross-tenant). */
  isPlatformAuditor: boolean;
  role: string | null;
};

/**
 * Resolve whether the caller may query or export audit history.
 * Throws a clear error on denial (server functions map this to Forbidden).
 */
export async function requireAuditReader(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<AuditReaderScope> {
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin_tier", {
    _user_id: userId,
  });
  if (adminError) throw new Error(adminError.message);
  if (isAdmin === true) {
    return {
      userId,
      tenantId: null,
      isPlatformAuditor: true,
      role: "platform_auditor",
    };
  }

  const { data, error } = await supabase
    .from("organization_members" as never)
    .select("organization_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { organization_id?: string; role?: string } | null;
  if (!row?.organization_id || !["owner", "admin"].includes(row.role ?? "")) {
    throw new Error("Forbidden: audit history is limited to tenant administrators and auditors.");
  }
  return {
    userId,
    tenantId: row.organization_id,
    isPlatformAuditor: false,
    role: row.role ?? null,
  };
}
