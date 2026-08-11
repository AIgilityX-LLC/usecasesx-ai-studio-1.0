/**
 * Shared guards for the operations surfaces. Kept out of the server-function
 * wrapper so those files stay thin, and so every ops handler authorises the
 * caller the same way instead of each re-implementing the check.
 */

import { getRequest } from "@tanstack/react-start/server";

type AuthContext = {
  userId: string;
  claims?: unknown;
  supabase: {
    rpc: (
      name: "is_admin_tier",
      args: { _user_id: string },
    ) => PromiseLike<{ data: boolean | null }>;
    auth: {
      getUser: () => PromiseLike<{ data: { user: { email?: string | null } | null } | null }>;
    };
  };
};

/**
 * Throws unless the caller holds a platform admin role, then returns a human
 * label (email where known) for the audit trail.
 */
export async function requirePlatformAdmin(context: AuthContext): Promise<string> {
  const { data: isAdmin } = await context.supabase.rpc("is_admin_tier", {
    _user_id: context.userId,
  });
  if (!isAdmin) throw new Error("Only platform admins can use this operations surface.");
  const claimed = (context.claims as { email?: string } | undefined)?.email;
  if (claimed) return claimed;
  const user = (await context.supabase.auth.getUser()).data?.user;
  return user?.email ?? context.userId;
}

/** Host this report ran against, so evidence names its own origin. */
export function observedHost(): string {
  try {
    return new URL(getRequest().url).host;
  } catch {
    return "unknown";
  }
}
