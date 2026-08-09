/**
 * Repository use case → Studio use case lineage.
 *
 * A Studio draft records the repository row it came from in
 * `ai_use_cases.source_use_case_id`. Reports and portfolio surfaces work in
 * repository slugs, while benefits are attached to Studio use case ids, so this
 * is the one place that bridges the two. RLS keeps drafts from other
 * workspaces out of the result.
 */

import { supabase } from "@/integrations/supabase/client";
import { unwrapResult } from "./errors";

export interface StudioLineage {
  /** repository use_cases.id → studio ai_use_cases.id (most recent draft). */
  studioIdByUseCaseId: Record<string, string>;
  /** repository slug → studio ai_use_cases.id. */
  studioIdBySlug: Record<string, string>;
}

const EMPTY: StudioLineage = { studioIdByUseCaseId: {}, studioIdBySlug: {} };

/**
 * @param slugToUseCaseId repository slug → repository use_cases.id, as already
 * resolved by the Pro hook. No extra lookup is issued for slugs it does not
 * know about.
 */
export async function loadStudioLineage(
  slugToUseCaseId: Record<string, string>,
): Promise<StudioLineage> {
  const ids = [...new Set(Object.values(slugToUseCaseId))].filter(Boolean);
  if (ids.length === 0) return EMPTY;

  const result = await supabase
    .from("ai_use_cases")
    .select("id, source_use_case_id, updated_at")
    .in("source_use_case_id", ids)
    .order("updated_at", { ascending: false });

  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as {
    id: string;
    source_use_case_id: string | null;
  }[];

  const studioIdByUseCaseId: Record<string, string> = {};
  for (const row of rows) {
    // Ordered newest-first, so the first draft seen for a source wins.
    if (row.source_use_case_id && !studioIdByUseCaseId[row.source_use_case_id]) {
      studioIdByUseCaseId[row.source_use_case_id] = row.id;
    }
  }

  const studioIdBySlug: Record<string, string> = {};
  for (const [slug, useCaseId] of Object.entries(slugToUseCaseId)) {
    const studioId = studioIdByUseCaseId[useCaseId];
    if (studioId) studioIdBySlug[slug] = studioId;
  }

  return { studioIdByUseCaseId, studioIdBySlug };
}
