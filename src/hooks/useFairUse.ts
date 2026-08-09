import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFairUseStatusFn } from "@/lib/fair-use.functions";
import type { FairUseStatus } from "@/lib/ai/fair-use.server";

/**
 * The signed-in user's live fair-use position. Surfaces read this to show the
 * meter and to disable generation actions before the server has to refuse.
 */
export function useFairUse() {
  const fetchStatus = useServerFn(getFairUseStatusFn);
  const query = useQuery({
    queryKey: ["fair-use-status"],
    queryFn: () => fetchStatus() as Promise<FairUseStatus>,
    staleTime: 30_000,
  });
  return {
    status: query.data ?? null,
    loading: query.isLoading,
    error: query.error as Error | null,
    /** Optimistic gate — unknown status never blocks the user. */
    blocked: query.data ? !query.data.allowed : false,
    refresh: query.refetch,
  };
}
