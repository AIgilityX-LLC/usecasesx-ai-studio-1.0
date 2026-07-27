import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuthzContextFn } from "@/lib/authz.functions";
import { useSupabaseSession } from "./useSupabaseSession";
import { CLIENT_CAPABILITY_FLAGS } from "@/lib/feature-flags";
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
  /** Boolean check — the single entry point for UI gating. */
  can: (key: EntitlementKey) => boolean;
  /** Full decision, including an honest reason for locked states. */
  explain: (key: EntitlementKey) => AuthzDecision;
  founding: { expiresAt: string; label: string; daysRemaining: number };
};

/**
 * Single client entry point for edition + role authorization.
 * Mirrors the server decision; the server remains authoritative.
 */
export function useAuthz(): AuthzState {
  const session = useSupabaseSession();
  const fetchContext = useServerFn(getAuthzContextFn);

  const query = useQuery({
    queryKey: ["authz-context", session?.user.id ?? null],
    queryFn: () => fetchContext({}),
    enabled: !!session,
    staleTime: 60_000,
  });

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
      can: (key: EntitlementKey) => evaluate(subject, key).allowed,
      explain: (key: EntitlementKey) => evaluate(subject, key),
      founding: {
        expiresAt: DEFAULT_FOUNDING_ACCESS.expiresAt,
        label: DEFAULT_FOUNDING_ACCESS.label,
        daysRemaining: daysUntilFoundingExpiry(),
      },
    };
  }, [session, query.data, query.isPending]);
}
