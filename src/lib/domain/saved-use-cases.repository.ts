/**
 * Saved use cases + personal scoring repository.
 *
 * Owns every read/write against `saved_use_cases` and `use_case_scores`.
 * Callers pass the signed-in user id; ownership is asserted here (and enforced
 * again by RLS in the database).
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeError, unwrapResult } from "./errors";
import { requireUserId } from "./ownership";
import {
  parseInput,
  prioritySchema,
  savedUseCasePatchSchema,
  scoreDimensionsSchema,
  slugSchema,
  uuidSchema,
} from "./validation";

export type Priority = "Low" | "Medium" | "High" | "Strategic";

export type SavedPatch = { note?: string; priority?: Priority };

export type ScoreColumns = {
  strategic: number;
  value: number;
  feasibility: number;
  ttv: number;
  risk: number;
  readiness: number;
  total: number;
};

/** Resolves a public use-case slug to its id. Returns null when unknown. */
export async function resolveUseCaseIdBySlug(slug: string): Promise<string | null> {
  const clean = parseInput(slugSchema, slug);
  try {
    const { data, error } = await supabase
      .from("use_cases")
      .select("id")
      .eq("slug", clean)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function saveUseCase(
  userId: string | null,
  useCaseId: string,
  priority: Priority = "Medium",
): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const prio = parseInput(prioritySchema, priority);
  const result = await supabase
    .from("saved_use_cases")
    .upsert(
      { user_id: uid, use_case_id: id, priority: prio },
      { onConflict: "user_id,use_case_id" },
    );
  if (result.error) throw normalizeError(result.error);
}

export async function unsaveUseCase(userId: string | null, useCaseId: string): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const result = await supabase
    .from("saved_use_cases")
    .delete()
    .eq("user_id", uid)
    .eq("use_case_id", id);
  if (result.error) throw normalizeError(result.error);
}

export async function updateSavedUseCase(
  userId: string | null,
  useCaseId: string,
  patch: SavedPatch,
): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const clean = parseInput(savedUseCasePatchSchema, patch);
  const result = await supabase
    .from("saved_use_cases")
    .update(clean)
    .eq("user_id", uid)
    .eq("use_case_id", id);
  if (result.error) throw normalizeError(result.error);
}

export async function upsertUseCaseScore(
  userId: string | null,
  useCaseId: string,
  score: unknown,
  toColumns: (s: ReturnType<typeof parseScore>) => ScoreColumns,
): Promise<void> {
  const uid = requireUserId(userId);
  const id = parseInput(uuidSchema, useCaseId);
  const parsed = parseScore(score);
  const result = await supabase
    .from("use_case_scores")
    .upsert(
      { user_id: uid, use_case_id: id, ...toColumns(parsed) },
      { onConflict: "user_id,use_case_id" },
    );
  if (result.error) throw normalizeError(result.error);
}

export function parseScore(score: unknown) {
  return parseInput(scoreDimensionsSchema, score);
}

/** Raw personal workspace read used by the Pro hook. */
export async function listSavedForUser(userId: string | null) {
  const uid = requireUserId(userId);
  const result = await supabase
    .from("saved_use_cases")
    .select("use_case_id, priority, note, saved_at, use_cases ( slug )")
    .eq("user_id", uid)
    .order("saved_at", { ascending: false });
  return unwrapResult(result, { allowNull: true }) ?? [];
}

export async function listScoresForUser(userId: string | null) {
  const uid = requireUserId(userId);
  const result = await supabase
    .from("use_case_scores")
    .select("use_case_id, strategic, value, feasibility, risk, readiness, ttv")
    .eq("user_id", uid);
  return unwrapResult(result, { allowNull: true }) ?? [];
}
