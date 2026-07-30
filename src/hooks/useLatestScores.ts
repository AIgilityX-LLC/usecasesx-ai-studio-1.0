/**
 * Latest recorded priority score for a set of use cases.
 *
 * One batched request per list so a board or portfolio never fires a query per
 * card. Ids the caller cannot see are simply missing from the map, which the
 * `PriorityScore` component renders as "Not scored".
 */

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getLatestScoresFn } from "@/lib/scoring.functions";
import type { PriorityScoreValue } from "@/components/scoring/PriorityScore";

export function useLatestScores(useCaseIds: string[]) {
  const fetchScores = useServerFn(getLatestScoresFn);
  // Stable key so re-renders with the same ids in the same order reuse the cache.
  const ids = [...new Set(useCaseIds)].sort();

  const query = useQuery({
    queryKey: ["latest-scores", ids],
    queryFn: () => fetchScores({ data: { useCaseIds: ids } }),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  const scores = (query.data ?? {}) as Record<string, PriorityScoreValue>;
  return {
    scores,
    isLoading: query.isLoading,
    scoreFor: (id: string): PriorityScoreValue | null => scores[id] ?? null,
  };
}
