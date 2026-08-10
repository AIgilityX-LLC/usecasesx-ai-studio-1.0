/**
 * Role gate for CTA analytics reads.
 *
 * Analytics contain aggregate visitor behaviour, so only platform-admin tier
 * roles may read them. The check runs against the caller's own RLS-scoped
 * client — never a service-role client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const ANALYTICS_ROLES = ["super_admin", "admin", "ai_hub_admin", "usecasex_admin"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assertAnalyticsReader(supabase: Client, userId: string): Promise<void> {
  for (const role of ANALYTICS_ROLES) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data === true) return;
  }
  throw new Error("Forbidden: analytics access requires a platform admin role.");
}
