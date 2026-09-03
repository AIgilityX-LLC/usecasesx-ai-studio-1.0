import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "moderator"
  | "contributor"
  | "viewer"
  | "super_admin"
  | "ai_hub_admin"
  | "usecasex_admin"
  | "content_manager"
  | "reviewer"
  | "editor"
  | "user";

export const ADMIN_TIER_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "super_admin",
  "ai_hub_admin",
  "usecasex_admin",
  "content_manager",
  "reviewer",
];

export interface RoleState {
  loading: boolean;
  userId: string | null;
  roles: AppRole[];
  has: (role: AppRole) => boolean;
  hasAny: (roles: AppRole[]) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canEditTaxonomy: boolean; // admin | moderator
  canPublish: boolean; // admin | moderator
  canDelete: boolean; // admin only
}

/**
 * Centralised role hook. All UseCasesX permission checks should go through this
 * so that route guards, action buttons, and gates stay in sync with the
 * database RLS policies:
 *   - has_role(uid, 'admin')      → full access
 *   - has_role(uid, 'moderator')  → manage taxonomy / publish / update
 *   - 'Admins delete'             → DELETE on use_cases is admin only
 */
export function useRoles(): RoleState {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    let active = true;
    /**
     * Resolve the user from `onAuthStateChange` (which emits INITIAL_SESSION
     * right after subscribing) rather than `getUser()` — the latter can hang
     * behind navigator.locks in the preview iframe, which left every
     * role-gated route stuck on "Verifying access…".
     */
    const load = async (uid: string | null) => {
      if (!uid) {
        if (!active) return;
        setUserId(null);
        setRoles([]);
        setLoading(false);
        return;
      }
      setUserId(uid);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (!active) return;
      setRoles((data ?? []).map((r) => r.role as AppRole));
      setLoading(false);
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      // Never await Supabase calls inside the callback itself — that deadlocks
      // the auth client's internal lock. Defer to a macrotask instead.
      setTimeout(() => void load(uid), 0);
    });

    // Fallback: some environments (preview iframe, restored tabs) can delay or
    // miss INITIAL_SESSION, which used to leave the gate on "Verifying access…"
    // forever. Resolve the session directly as well.
    void supabase.auth
      .getSession()
      .then(({ data: s }) => load(s.session?.user?.id ?? null))
      .catch(() => {
        if (active) setLoading(false);
      });

    // Hard safety valve so the UI never hangs indefinitely.
    const timer = setTimeout(() => {
      if (active) setLoading(false);
    }, 6000);

    return () => {
      active = false;
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);


  const has = (role: AppRole) => roles.includes(role);
  const hasAny = (rs: AppRole[]) => rs.some((r) => roles.includes(r));
  const isAdmin =
    has("admin") || has("super_admin") || has("ai_hub_admin") || has("usecasex_admin");
  const isModerator = has("moderator") || has("content_manager") || has("reviewer");

  return {
    loading,
    userId,
    roles,
    has,
    hasAny,
    isAdmin,
    isModerator,
    canEditTaxonomy: isAdmin || has("moderator") || has("content_manager"),
    canPublish: isAdmin || has("moderator") || has("content_manager") || has("reviewer"),
    canDelete: has("admin") || has("super_admin") || has("ai_hub_admin"),
  };
}
