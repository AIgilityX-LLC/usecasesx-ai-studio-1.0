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
