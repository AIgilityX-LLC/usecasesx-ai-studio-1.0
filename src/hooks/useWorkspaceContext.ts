import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWorkspaceContextFn, setActiveWorkspaceFn } from "@/lib/workspace.functions";
import { useSupabaseSession } from "./useSupabaseSession";
import { setTelemetryTenant } from "@/lib/telemetry";
import {
  clearActiveWorkspaceId,
  persistActiveWorkspaceId,
  readStoredWorkspaceId,
} from "@/lib/workspace-selection";

export type WorkspaceContext = Awaited<ReturnType<typeof getWorkspaceContextFn>>;

/**
 * Central workspace context. Every signed-in surface should read tenancy
 * (organization, workspace, membership role, entitlement) from here rather than
 * reconstructing ownership per route.
 *
 * Active workspace is a client preference validated on the server. RLS remains
 * the authority for data access; this context scopes UX and writes.
 */
export function useWorkspaceContext() {
  const session = useSupabaseSession();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const fetchContext = useServerFn(getWorkspaceContextFn);
  const switchFn = useServerFn(setActiveWorkspaceFn);

  const [preferredId, setPreferredId] = useState<string | null>(() =>
    userId ? readStoredWorkspaceId(userId) : null,
  );

  useEffect(() => {
    if (!userId) {
      setPreferredId(null);
      return;
    }
    setPreferredId(readStoredWorkspaceId(userId));
  }, [userId]);

  const query = useQuery({
    queryKey: ["workspace-context", userId, preferredId],
    queryFn: async () => {
      const context = await fetchContext({
        data: { preferredWorkspaceId: preferredId },
      });
      setTelemetryTenant({
        organizationId: context.organization?.id ?? null,
        workspaceId: context.workspace?.id ?? null,
      });
      return context;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!userId || !query.data?.workspace?.id) return;
    const resolved = query.data.workspace.id;
    persistActiveWorkspaceId(userId, resolved);
    if (preferredId !== resolved) setPreferredId(resolved);
  }, [userId, query.data?.workspace?.id, preferredId]);

  const invalidateWorkspaceScoped = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0];
        return (
          key === "workspace-context" ||
          key === "portfolios" ||
          key === "boards" ||
          key === "handoffs" ||
          key === "reviews" ||
          key === "opportunities" ||
          key === "reports"
        );
      },
    });
  }, [queryClient]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!userId) throw new Error("Sign in to switch workspace.");
      const next = await switchFn({ data: { workspaceId } });
      if (next.status === "forbidden" || next.status === "suspended") {
        clearActiveWorkspaceId(userId);
        throw new Error(
          next.status === "suspended"
            ? "This organization membership is suspended."
            : "You are not a member of that workspace.",
        );
      }
      if (!next.workspace?.id) {
        throw new Error("Workspace switch failed.");
      }
      persistActiveWorkspaceId(userId, next.workspace.id);
      setPreferredId(next.workspace.id);
      queryClient.setQueryData(["workspace-context", userId, next.workspace.id], next);
      await invalidateWorkspaceScoped();
      return next;
    },
    [userId, switchFn, queryClient, invalidateWorkspaceScoped],
  );

  return {
    ...query,
    preferredWorkspaceId: preferredId,
    switchWorkspace,
    invalidateWorkspaceScoped,
  };
}
