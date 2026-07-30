/**
 * Journey summary — server-only reads.
 *
 * Every query runs through the caller's RLS-scoped client, so counts can only
 * ever reflect rows the signed-in user is allowed to see.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_JOURNEY_SUMMARY, type JourneySummary } from "@/lib/journey";

async function count(
  supabase: SupabaseClient<any, any, any>,
  table: string,
  build: (q: any) => any = (q) => q,
): Promise<number> {
  const { count: n, error } = await build(
    (supabase as any).from(table).select("id", { count: "exact", head: true }),
  );
  if (error) return 0;
  return n ?? 0;
}

export async function loadJourneySummary(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<JourneySummary> {
  const [
    shortlisted,
    opportunitiesOpen,
    opportunitiesConverted,
    drafts,
    completed,
    scored,
    portfolios,
    reports,
  ] = await Promise.all([
    count(supabase, "saved_use_cases", (q) => q.eq("user_id", userId)),
    count(supabase, "opportunities", (q) =>
      q.in("status", ["signal", "opportunity", "qualified"]),
    ),
    count(supabase, "opportunities", (q) => q.eq("status", "converted")),
    count(supabase, "ai_use_cases", (q) => q.is("completed_at", null)),
    count(supabase, "ai_use_cases", (q) => q.not("completed_at", "is", null)),
    count(supabase, "scorecard_results"),
    count(supabase, "portfolios", (q) => q.eq("user_id", userId)),
    count(supabase, "generated_reports", (q) => q.eq("user_id", userId)),
  ]);

  return {
    ...EMPTY_JOURNEY_SUMMARY,
    shortlisted,
    opportunitiesOpen,
    opportunitiesConverted,
    drafts,
    completed,
    scored,
    portfolios,
    reports,
  };
}
