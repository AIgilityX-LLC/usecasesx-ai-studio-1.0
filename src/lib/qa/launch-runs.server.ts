/**
 * Launch-check run ledger (server-only).
 *
 * Writes and reads go through the caller's authenticated client; the
 * admin-only policies on `pilot_launch_check_runs` are the boundary, and the
 * insert policy pins `actor_id` to the caller so a run cannot be attributed to
 * anyone else.
 */

import type { CheckResult, HarnessSummary } from "./harness";
import { toRunRecord, type LaunchCheckRun, type RunTrigger } from "./launch-runs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRun(row: any): LaunchCheckRun {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    trigger: String(row.trigger),
    triggerDetail: row.trigger_detail ?? null,
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? null,
    total: Number(row.total ?? 0),
    passed: Number(row.passed ?? 0),
    failed: Number(row.failed ?? 0),
    skipped: Number(row.skipped ?? 0),
    errored: Number(row.errored ?? 0),
    p0Failures: Number(row.p0_failures ?? 0),
    results: Array.isArray(row.results) ? (row.results as CheckResult[]) : [],
    createdAt: String(row.created_at),
  };
}

export async function listLaunchCheckRuns(
  supabase: Client,
  cohort: string,
  limit = 50,
): Promise<LaunchCheckRun[]> {
  const { data, error } = await supabase
    .from("pilot_launch_check_runs")
    .select("*")
    .eq("cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRun);
}

export async function recordLaunchCheckRun(
  supabase: Client,
  input: {
    cohort: string;
    trigger: RunTrigger;
    triggerDetail?: string | null;
    actorId: string;
    actorEmail: string | null;
    results: readonly CheckResult[];
    summary: HarnessSummary;
  },
): Promise<LaunchCheckRun> {
  const { data, error } = await supabase
    .from("pilot_launch_check_runs")
    .insert(toRunRecord(input))
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRun(data);
}
