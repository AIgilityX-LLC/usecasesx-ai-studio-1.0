import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "./useSupabaseSession";
import { ADMIN_TIER_ROLES } from "@/lib/usecasex.roles";

export type PlanInfo = {
  loading: boolean;
  isAuthed: boolean;
  isPro: boolean; // pro / enterprise / sovereign
  isAdmin: boolean;
  planType: string | null;
};

const PRO_PLANS = new Set(["pro", "enterprise", "sovereign"]);

export function usePlan(): PlanInfo {
  const session = useSupabaseSession();
  const [plan, setPlan] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { setPlan(null); setIsAdmin(false); setLoading(false); return; }
    let active = true;
    (async () => {
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("plan_type").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).in("role", [...ADMIN_TIER_ROLES]),
      ]);
      if (!active) return;
      setPlan(p?.plan_type ?? "lite");
      setIsAdmin(!!roles && roles.length > 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [session]);

  return {
    loading,
    isAuthed: !!session,
    isPro: PRO_PLANS.has(plan ?? ""),
    isAdmin,
    planType: plan,
  };
}
