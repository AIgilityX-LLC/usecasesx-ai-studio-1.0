/**
 * Shared ambient context for privacy-conscious navigation product events.
 * Values are coarse enums only — never names, emails, or free text.
 */

import { useMemo } from "react";
import { useAuthz } from "@/hooks/useAuthz";
import { usePlan } from "@/hooks/usePlan";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import {
  planFromTier,
  roleCategoryFromWorkspaceRole,
  workspaceTypeFromPlan,
  type NavAnalyticsBase,
} from "@/lib/telemetry/navigation-analytics";

export function useNavAnalyticsContext(): NavAnalyticsBase {
  const plan = usePlan();
  const authz = useAuthz();
  const { data: workspace } = useWorkspaceContext();

  return useMemo(() => {
    const tier = planFromTier(plan.tier);
    return {
      plan: tier,
      roleCategory: roleCategoryFromWorkspaceRole(
        workspace?.workspaceRole ?? authz.subject.workspaceRole,
        {
          isPlatformAdmin: authz.subject.isPlatformAdmin,
        },
      ),
      workspaceType: workspaceTypeFromPlan(
        workspace?.entitlement?.planCode ?? workspace?.organization?.plan ?? null,
        tier,
      ),
    };
  }, [
    plan.tier,
    workspace?.workspaceRole,
    workspace?.entitlement?.planCode,
    workspace?.organization?.plan,
    authz.subject.workspaceRole,
    authz.subject.isPlatformAdmin,
  ]);
}
