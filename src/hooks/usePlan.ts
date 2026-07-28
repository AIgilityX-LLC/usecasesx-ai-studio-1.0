import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "./useSupabaseSession";
import { ADMIN_TIER_ROLES } from "@/lib/usecasex.roles";

export type PlanTier = "lite" | "pro" | "enterprise";

export type PlanInfo = {
  loading: boolean;
  isAuthed: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  isAdmin: boolean;
  planType: string | null;
  tier: PlanTier;
  features: {
    fullRepository: boolean;
    unlimitedBoards: boolean;
    unlimitedUseCases: boolean;
    aiCopilot: boolean;
    dataReadiness: boolean;
    blueprintBuilder: boolean;
    sarpi: boolean;
    advisorx: boolean;
    c3g: boolean;
    portfolioRoadmap: boolean;
    advancedExports: boolean;
    sovereignLabel: boolean;
    multiOrg: boolean;
    customGovernance: boolean;
    advancedAudit: boolean;
    localDeployment: boolean;
    decisionProvenance: boolean;
    auditorViews: boolean;
  };
  limits: {
    activeBoards: number | null;
    activeUseCases: number | null;
  };
};

const PRO_PLANS = new Set(["pro", "enterprise", "sovereign"]);
const ENTERPRISE_PLANS = new Set(["enterprise", "sovereign"]);

export function usePlan(): PlanInfo {
  const session = useSupabaseSession();
  const [plan, setPlan] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      setPlan(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("plan_type").eq("user_id", session.user.id).maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .in("role", [...ADMIN_TIER_ROLES]),
      ]);
      if (!active) return;
      setPlan(p?.plan_type ?? "lite");
      setIsAdmin(!!roles && roles.length > 0);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  const isPro = PRO_PLANS.has(plan ?? "");
  const isEnterprise = ENTERPRISE_PLANS.has(plan ?? "");
  const tier: PlanTier = isEnterprise ? "enterprise" : isPro ? "pro" : "lite";

  return {
    loading,
    isAuthed: !!session,
    isPro,
    isEnterprise,
    isAdmin,
    planType: plan,
    tier,
    features: {
      fullRepository: isPro,
      unlimitedBoards: isPro,
      unlimitedUseCases: isPro,
      aiCopilot: isPro,
      dataReadiness: isPro,
      blueprintBuilder: isPro,
      sarpi: isPro,
      advisorx: isPro,
      c3g: isPro,
      portfolioRoadmap: isPro,
      advancedExports: isPro,
      sovereignLabel: isEnterprise,
      multiOrg: isEnterprise,
      customGovernance: isEnterprise,
      advancedAudit: isEnterprise,
      localDeployment: isEnterprise,
      decisionProvenance: isEnterprise,
      auditorViews: isEnterprise,
    },
    limits: {
      activeBoards: isPro ? null : 1,
      activeUseCases: isPro ? null : 3,
    },
  };
}
