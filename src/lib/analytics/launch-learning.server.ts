/**
 * Server-only aggregation for the internal launch-learning dashboard.
 *
 * Reads the weekly views created for launch support. Demo and internal
 * activity are excluded inside the views, so nothing here can inflate
 * activation metrics with sample data.
 */
import {
  ACTIVATION_STAGES,
  withConversion,
  type ActivationStageKey,
  type LaunchLearning,
} from "@/lib/analytics/launch-learning.model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export interface LaunchLearningInput {
  from: string;
  to: string;
}

export async function aggregateLaunchLearning(
  supabase: Client,
  input: LaunchLearningInput,
): Promise<LaunchLearning> {
  const inWindow = (query: Client, column: string) =>
    query.gte(column, input.from.slice(0, 10)).lte(column, input.to.slice(0, 10));

  const [visitors, funnel, searches, ai, enterprise, feedback] = await Promise.all([
    inWindow(supabase.from("v_launch_visitors_weekly").select("visitor_sessions, week"), "week"),
    inWindow(
      supabase.from("v_activation_funnel_weekly").select("stage, users, events, week"),
      "week",
    ),
    inWindow(
      supabase
        .from("v_search_insights_weekly")
        .select("search_query, searches, zero_result_searches, week"),
      "week",
    ),
    inWindow(
      supabase
        .from("v_ai_usage_weekly")
        .select("task, status, calls, users, avg_duration_ms, week"),
      "week",
    ),
    inWindow(
      supabase.from("v_enterprise_interest_weekly").select("interest_area, leads, week"),
      "week",
    ),
    supabase
      .from("v_feedback_queue")
      .select("status, is_real_activity, created_at")
      .gte("created_at", input.from)
      .lte("created_at", input.to),
  ]);

  for (const result of [visitors, funnel, searches, ai, enterprise, feedback]) {
    if (result.error) throw new Error(result.error.message);
  }

  const visitorSessions = (visitors.data ?? []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, row: any) => sum + Number(row.visitor_sessions ?? 0),
    0,
  );

  const stageUsers = new Map<string, { users: number; events: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (funnel.data ?? []) as any[]) {
    const key = String(row.stage);
    const entry = stageUsers.get(key) ?? { users: 0, events: 0 };
    entry.users += Number(row.users ?? 0);
    entry.events += Number(row.events ?? 0);
    stageUsers.set(key, entry);
  }

  const funnelRows = ACTIVATION_STAGES.map((stage) => {
    if (stage.key === "visitor") {
      return {
        stage: stage.key as ActivationStageKey,
        label: stage.label,
        users: visitorSessions,
        events: visitorSessions,
      };
    }
    const entry = stageUsers.get(stage.key) ?? { users: 0, events: 0 };
    return {
      stage: stage.key as ActivationStageKey,
      label: stage.label,
      users: entry.users,
      events: entry.events,
    };
  });

  const searchTotals = new Map<string, { searches: number; zero: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (searches.data ?? []) as any[]) {
    const key = String(row.search_query ?? "").trim();
    if (!key) continue;
    const entry = searchTotals.get(key) ?? { searches: 0, zero: 0 };
    entry.searches += Number(row.searches ?? 0);
    entry.zero += Number(row.zero_result_searches ?? 0);
    searchTotals.set(key, entry);
  }
  const searchRows = Array.from(searchTotals.entries()).map(([query, value]) => ({
    query,
    searches: value.searches,
    zeroResultSearches: value.zero,
  }));

  const aiTotals = new Map<
    string,
    { calls: number; errors: number; users: number; duration: number; weight: number }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (ai.data ?? []) as any[]) {
    const key = String(row.task ?? "unknown");
    const entry = aiTotals.get(key) ?? { calls: 0, errors: 0, users: 0, duration: 0, weight: 0 };
    const calls = Number(row.calls ?? 0);
    entry.calls += calls;
    if (String(row.status ?? "ok") !== "ok") entry.errors += calls;
    entry.users = Math.max(entry.users, Number(row.users ?? 0));
    if (row.avg_duration_ms != null) {
      entry.duration += Number(row.avg_duration_ms) * calls;
      entry.weight += calls;
    }
    aiTotals.set(key, entry);
  }

  const enterpriseTotals = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (enterprise.data ?? []) as any[]) {
    const key = String(row.interest_area ?? "unspecified");
    enterpriseTotals.set(key, (enterpriseTotals.get(key) ?? 0) + Number(row.leads ?? 0));
  }

  const feedbackTotals = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (feedback.data ?? []) as any[]) {
    if (row.is_real_activity === false) continue;
    const key = String(row.status ?? "new");
    feedbackTotals.set(key, (feedbackTotals.get(key) ?? 0) + 1);
  }

  return {
    from: input.from,
    to: input.to,
    visitorSessions,
    funnel: withConversion(funnelRows),
    topSearches: [...searchRows].sort((a, b) => b.searches - a.searches).slice(0, 20),
    noResultSearches: searchRows
      .filter((row) => row.zeroResultSearches > 0)
      .sort((a, b) => b.zeroResultSearches - a.zeroResultSearches)
      .slice(0, 20),
    aiUsage: Array.from(aiTotals.entries())
      .map(([task, value]) => ({
        task,
        calls: value.calls,
        errors: value.errors,
        users: value.users,
        avgDurationMs: value.weight > 0 ? Math.round(value.duration / value.weight) : null,
      }))
      .sort((a, b) => b.calls - a.calls),
    enterpriseInterest: Array.from(enterpriseTotals.entries())
      .map(([interestArea, leads]) => ({ interestArea, leads }))
      .sort((a, b) => b.leads - a.leads),
    feedbackByStatus: Array.from(feedbackTotals.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
  };
}
