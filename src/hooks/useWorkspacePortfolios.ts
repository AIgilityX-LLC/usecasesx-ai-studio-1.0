/**
 * Portfolios visible to the signed-in user, including colleague-owned ones.
 *
 * The reports picker must show exactly what row-level security allows — no
 * more, no less — so this hook reads without any client-side owner filter and
 * labels each portfolio with its owner. Anything a user cannot read simply
 * never comes back from the database.
 */

import { useQuery } from "@tanstack/react-query";

import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { listPortfoliosVisibleToUser } from "@/lib/domain/portfolios.repository";
import { mapPortfolioRow } from "@/hooks/usecasex-pro";
import type { Portfolio } from "@/lib/usecasex.store";

export type VisiblePortfolio = {
  portfolio: Portfolio;
  ownerUserId: string;
  ownerName: string;
  isMine: boolean;
};

async function fetchVisiblePortfolios(
  userId: string,
  activeWorkspaceId: string | null,
): Promise<VisiblePortfolio[]> {
  const rows = await listPortfoliosVisibleToUser(userId);
  // UX scope: active workspace only. RLS still limits to memberships.
  const scoped = activeWorkspaceId
    ? rows.filter((r) => r.workspace_id === activeWorkspaceId)
    : rows;
  const ownerIds = Array.from(new Set(scoped.map((r) => r.user_id).filter(Boolean)));
  const workspaceId =
    activeWorkspaceId ?? scoped.find((r) => r.workspace_id)?.workspace_id ?? null;

  const names = new Map<string, string>();
  if (workspaceId && ownerIds.length > 0) {
    const { data } = await supabase.rpc("workspace_display_names", {
      _workspace_id: workspaceId,
      _user_ids: ownerIds,
    });
    for (const row of (data ?? []) as { user_id: string; full_name: string }[]) {
      names.set(row.user_id, row.full_name);
    }
  }

  return scoped.map((row) => ({
    portfolio: mapPortfolioRow(row),
    ownerUserId: row.user_id,
    ownerName: row.user_id === userId ? "You" : (names.get(row.user_id) ?? "Workspace member"),
    isMine: row.user_id === userId,
  }));
}

export function useWorkspacePortfolios() {
  const session = useSupabaseSession();
  const userId = session?.user.id ?? null;
  const { data: workspace } = useWorkspaceContext();
  const activeWorkspaceId = workspace?.workspace?.id ?? null;
  return useQuery({
    queryKey: ["portfolios", "visible", userId, activeWorkspaceId],
    enabled: Boolean(userId),
    queryFn: () => fetchVisiblePortfolios(userId as string, activeWorkspaceId),
    staleTime: 30_000,
  });
}
