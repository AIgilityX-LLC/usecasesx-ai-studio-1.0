import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuthzContextFn } from "@/lib/authz.functions";
import { useSupabaseSession } from "./useSupabaseSession";
import { CLIENT_CAPABILITY_FLAGS } from "@/lib/feature-flags";
import { authzQueryPolicy } from "@/lib/authz/query-policy";
import {
  ANONYMOUS_SUBJECT,
  evaluate,
  type AuthzDecision,
  type AuthzSubject,
  type EntitlementKey,
  DEFAULT_FOUNDING_ACCESS,
  daysUntilFoundingExpiry,
} from "@/lib/authz";

export type AuthzState = {
  loading: boolean;
  isAuthed: boolean;
  subject: AuthzSubject;
  organizationId: string | null;
  workspaceId: string | null;
  /** True once tenancy + role are provisioned; false while still settling. */
  resolved: boolean;
  /** Boolean check — the single entry point for UI gating. */
  can: (key: EntitlementKey) => boolean;
  /** Full decision, including an honest reason for locked states. */
  explain: (key: EntitlementKey) => AuthzDecision;
  /** Forces a re-read of the server decision (after plan/workspace changes). */
  refresh: () => Promise<void>;
  founding: { expiresAt: string; label: string; daysRemaining: number };
};

/**
 * Single client entry point for edition + role authorization.
 * Mirrors the server decision; the server remains authoritative.
 */
export function useAuthz(): AuthzState {
  const session = useSupabaseSession();
  const fetchContext = useServerFn(getAuthzContextFn);
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["authz-context", session?.user.id ?? null], [session]);

  const resolvedSubject = queryClient.getQueryData<{ subject?: AuthzSubject }>(queryKey)?.subject as
    | (AuthzSubject & { organizationId: string | null; workspaceId: string | null })
    | undefined;
  const policy = authzQueryPolicy(resolvedSubject ?? null);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchContext({}),
    enabled: !!session,
    // Provisioning (workspace + membership + profile) can land after the first
    // authenticated render, so the cached subject is only trusted once it is
    // fully resolved — otherwise we keep polling and the entitlement UI
    // (e.g. "New portfolio") appears without a manual reload.
    staleTime: policy.staleTime,
    refetchInterval: policy.refetchInterval,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return useMemo(() => {
    const anonymous: AuthzSubject = {
      ...ANONYMOUS_SUBJECT,
      flags: CLIENT_CAPABILITY_FLAGS,
    };
    const resolved = query.data?.subject as
      | (AuthzSubject & { organizationId: string | null; workspaceId: string | null })
      | undefined;
    const subject: AuthzSubject = resolved ?? anonymous;

    return {
      loading: session === undefined || (!!session && query.isPending),
      isAuthed: !!session,
      subject,
      organizationId: resolved?.organizationId ?? null,
      workspaceId: resolved?.workspaceId ?? null,
      resolved: authzQueryPolicy(resolved ?? null).resolved,
      can: (key: EntitlementKey) => evaluate(subject, key).allowed,
      explain: (key: EntitlementKey) => evaluate(subject, key),
      refresh,
      founding: {
        expiresAt: DEFAULT_FOUNDING_ACCESS.expiresAt,
        label: DEFAULT_FOUNDING_ACCESS.label,
        daysRemaining: daysUntilFoundingExpiry(),
      },
    };
  }, [session, query.data, query.isPending, refresh]);
}

