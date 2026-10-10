import { useMemo } from "react";
import { useAuthz } from "@/hooks/useAuthz";
import { useRoles } from "@/lib/usecasex.roles";
import { usePlan } from "@/hooks/usePlan";
import {
  hasNavCapability,
  resolveNavCapabilities,
  resolveNavPersonas,
  type NavCapability,
  type NavPersona,
} from "@/lib/authz/nav-capabilities";

/**
 * Client mirror of navigation capabilities.
 * Server RLS / createServerFn checks remain authoritative.
 */
export function useNavCapabilities() {
  const authz = useAuthz();
  const roles = useRoles();
  const plan = usePlan();

  return useMemo(() => {
    const ctx = {
      userId: authz.subject.userId ?? roles.userId,
      workspaceRole: authz.subject.workspaceRole,
      appRoles: roles.roles,
      isPlatformAdminTier: plan.isAdmin || authz.subject.isPlatformAdmin,
    };
    const capabilities = resolveNavCapabilities(ctx);
    const personas: NavPersona[] = resolveNavPersonas(ctx);
    return {
      loading: authz.loading || roles.loading || plan.loading,
      personas,
      capabilities,
      has: (capability: NavCapability | readonly NavCapability[]) =>
        hasNavCapability(ctx, capability),
      ctx,
    };
  }, [
    authz.loading,
    authz.subject.userId,
    authz.subject.workspaceRole,
    authz.subject.isPlatformAdmin,
    roles.loading,
    roles.userId,
    roles.roles,
    plan.loading,
    plan.isAdmin,
  ]);
}
