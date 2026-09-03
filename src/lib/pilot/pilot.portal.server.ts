/**
 * Read model for the participant portal.
 *
 * Everything here is scoped to the caller's own rows and read through their
 * own RLS session — the portal shows a participant what the pilot holds
 * about them, nothing about anyone else in the cohort.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<any, "public", any>;

export type PortalUseCase = {
  id: string;
  title: string;
  status: string | null;
  updatedAt: string | null;
  href: string;
  origin: "studio" | "repository";
};

export async function listMyPilotUseCases(
  supabase: Client,
  userId: string,
): Promise<PortalUseCase[]> {
  const [studio, repository] = await Promise.all([
    supabase
      .from("ai_use_cases")
      .select("id, title, status, updated_at")
      .or(`owner_user_id.eq.${userId},created_by.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(25),
    supabase
      .from("use_cases")
      .select("id, title, status, updated_at, slug")
      .eq("submitted_by", userId)
      .order("updated_at", { ascending: false })
      .limit(25),
  ]);

  const rows: PortalUseCase[] = [];
  for (const raw of studio.data ?? []) {
    const row = raw as { id: string; title: string; status: string | null; updated_at: string | null };
    rows.push({
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
      href: `/studio/use-case/${row.id}`,
      origin: "studio",
    });
  }
  for (const raw of repository.data ?? []) {
    const row = raw as {
      id: string;
      title: string;
      status: string | null;
      updated_at: string | null;
      slug: string | null;
    };
    rows.push({
      id: row.id,
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
      href: `/use-cases/${row.slug ?? row.id}`,
      origin: "repository",
    });
  }
  return rows.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export type PortalWorkspace = {
  id: string | null;
  name: string | null;
  useCaseCount: number;
  scoreCount: number;
  portfolioCount: number;
};

/**
 * Snapshot of the participant's own Pro workspace: enough to show the seat is
 * live and to send them straight to the surface they still need to use.
 */
export async function getMyWorkspaceSnapshot(
  supabase: Client,
  userId: string,
): Promise<PortalWorkspace> {
  const head = { count: "exact" as const, head: true };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const workspaceId = (membership as { workspace_id?: string } | null)?.workspace_id ?? null;

  let name: string | null = null;
  if (workspaceId) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle();
    name = (workspace as { name?: string } | null)?.name ?? null;
  }

  const [useCases, scores, portfolios] = await Promise.all([
    supabase.from("ai_use_cases").select("id", head).eq("created_by", userId),
    supabase.from("scorecard_results").select("id", head).eq("created_by", userId),
    supabase.from("portfolios").select("id", head).eq("user_id", userId),
  ]);

  return {
    id: workspaceId,
    name,
    useCaseCount: useCases.count ?? 0,
    scoreCount: scores.count ?? 0,
    portfolioCount: portfolios.count ?? 0,
  };
}
