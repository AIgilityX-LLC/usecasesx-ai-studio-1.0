/**
 * Fair-use status — server-only helper.
 *
 * Reads the same `ai_usage_events` counters the AI boundary enforces, so the
 * meter a user sees is the meter that gates their next generation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { limitsForEdition } from "./fair-use";
import { resolveSubject } from "@/lib/authz.server";
import type { Edition } from "@/lib/authz/editions";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type FairUseStatus = {
  edition: Edition;
  user: { used: number; limit: number };
  workspace: { used: number; limit: number };
  /** Remaining generations before the tighter of the two limits blocks. */
  remaining: number;
  allowed: boolean;
  resetsAt: string;
  windowHours: number;
};

async function count(
  supabase: SupabaseClient<any, any, any>,
  column: "user_id" | "workspace_id",
  value: string,
  since: string,
): Promise<number> {
  const { count: n, error } = await supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .eq("status", "ok")
    .gte("created_at", since);
  if (error) return 0;
  return n ?? 0;
}

export async function fairUseStatus(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<FairUseStatus> {
  const subject = await resolveSubject(supabase, userId);
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const since = windowStart.toISOString();
  const limits = limitsForEdition(subject.edition, process.env);

  const [usedByUser, usedByWorkspace] = await Promise.all([
    count(supabase, "user_id", userId, since),
    subject.workspaceId
      ? count(supabase, "workspace_id", subject.workspaceId, since)
      : Promise.resolve(0),
  ]);

  const remaining = Math.max(
    0,
    Math.min(
      limits.perUserPerDay - usedByUser,
      limits.perWorkspacePerDay - usedByWorkspace,
    ),
  );

  return {
    edition: subject.edition,
    user: { used: usedByUser, limit: limits.perUserPerDay },
    workspace: { used: usedByWorkspace, limit: limits.perWorkspacePerDay },
    remaining,
    allowed: remaining > 0,
    resetsAt: new Date(windowStart.getTime() + WINDOW_MS).toISOString(),
    windowHours: 24,
  };
}
