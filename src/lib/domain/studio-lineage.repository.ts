/**
 * Repository use case → Studio use case lineage.
 *
 * A Studio draft records the repository row it came from in
 * `ai_use_cases.source_use_case_id`. Reports and portfolio surfaces work in
 * repository slugs, while benefits are attached to Studio use case ids, so this
 * is the one place that bridges the two. RLS keeps drafts from other
 * workspaces out of the result.
 *
 * When a repository use case has been taken into the Studio more than once,
 * the choice must be stable: two report runs on unchanged data must never pick
 * different drafts. `rankDraft` below is that deterministic tie-break.
 */

import { supabase } from "@/integrations/supabase/client";
import { unwrapResult } from "./errors";

export interface StudioLineage {
  /** repository use_cases.id → studio ai_use_cases.id (chosen draft). */
  studioIdByUseCaseId: Record<string, string>;
  /** repository slug → studio ai_use_cases.id. */
  studioIdBySlug: Record<string, string>;
  /** repository use_cases.id → number of Studio drafts found, for transparency. */
  draftCountByUseCaseId: Record<string, number>;
}

const EMPTY: StudioLineage = {
  studioIdByUseCaseId: {},
  studioIdBySlug: {},
  draftCountByUseCaseId: {},
};

interface DraftRow {
  id: string;
  source_use_case_id: string | null;
  status: string | null;
  version: number | null;
  completed_at: string | null;
  updated_at: string | null;
  created_at: string | null;
}

/**
 * Lower rank wins. A completed/approved draft beats an in-progress one, an
 * in-progress one beats an archived one, so a report never falls back to a
 * stale or abandoned draft just because it was touched last.
 */
const STATUS_RANK: Record<string, number> = {
  published: 0,
  approved: 1,
  completed: 1,
  in_review: 2,
  review: 2,
  active: 3,
  in_progress: 3,
  draft: 4,
  archived: 9,
};

function statusRank(status: string | null): number {
  return STATUS_RANK[(status ?? "draft").toLowerCase()] ?? 5;
}

function time(value: string | null): number {
  return value ? (Date.parse(value) || 0) : 0;
}

/** Deterministic ordering: status, then completeness, then recency, then id. */
export function compareDrafts(a: DraftRow, b: DraftRow): number {
  const byStatus = statusRank(a.status) - statusRank(b.status);
  if (byStatus !== 0) return byStatus;

  const byCompleted = time(b.completed_at) - time(a.completed_at);
  if (byCompleted !== 0) return byCompleted;

  const byVersion = (b.version ?? 0) - (a.version ?? 0);
  if (byVersion !== 0) return byVersion;

  const byUpdated = time(b.updated_at) - time(a.updated_at);
  if (byUpdated !== 0) return byUpdated;

  const byCreated = time(b.created_at) - time(a.created_at);
  if (byCreated !== 0) return byCreated;

  // Final tie-break: stable and independent of row order from the database.
  return a.id.localeCompare(b.id);
}

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
    .select("id, source_use_case_id, status, version, completed_at, updated_at, created_at")
    .in("source_use_case_id", ids);

  const rows = (unwrapResult(result, { allowNull: true }) ?? []) as DraftRow[];

  const bySource = new Map<string, DraftRow[]>();
  for (const row of rows) {
    if (!row.source_use_case_id) continue;
    const list = bySource.get(row.source_use_case_id) ?? [];
    list.push(row);
    bySource.set(row.source_use_case_id, list);
  }

  const studioIdByUseCaseId: Record<string, string> = {};
  const draftCountByUseCaseId: Record<string, number> = {};
  for (const [sourceId, list] of bySource) {
    const chosen = [...list].sort(compareDrafts)[0];
    draftCountByUseCaseId[sourceId] = list.length;
    if (chosen) studioIdByUseCaseId[sourceId] = chosen.id;
  }

  const studioIdBySlug: Record<string, string> = {};
  for (const [slug, useCaseId] of Object.entries(slugToUseCaseId)) {
    const studioId = studioIdByUseCaseId[useCaseId];
    if (studioId) studioIdBySlug[slug] = studioId;
  }

  return { studioIdByUseCaseId, studioIdBySlug, draftCountByUseCaseId };
}
