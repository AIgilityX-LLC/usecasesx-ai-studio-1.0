import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWorkspaceContextFn } from "@/lib/workspace.functions";
import { useSupabaseSession } from "./useSupabaseSession";

export type WorkspaceContext = Awaited<ReturnType<typeof getWorkspaceContextFn>>;

/**
 * Central workspace context. Every signed-in surface should read tenancy
 * (organization, workspace, membership role, entitlement) from here rather than
 * reconstructing ownership per route.
 */
export function useWorkspaceContext() {
  const session = useSupabaseSession();
  const fetchContext = useServerFn(getWorkspaceContextFn);

  return useQuery({
    queryKey: ["workspace-context", session?.user.id ?? null],
    queryFn: () => fetchContext(),
    enabled: Boolean(session?.user.id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
