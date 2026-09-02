/**
 * Browser suite ledger (server-only).
 *
 * Reads and writes go through the caller's authenticated client; the
 * admin-only policies on `pilot_browser_suite_runs` are the boundary and the
 * insert policy pins `actor_id` to the caller.
 */

import {
  BROWSER_SUITE_ID,
  browserVerdict,
  type BrowserSpecResult,
  type BrowserSuiteRun,
} from "./browser-suite";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRun(row: any): BrowserSuiteRun {
  return {
    id: String(row.id),
    cohort: String(row.cohort),
    suite: String(row.suite ?? BROWSER_SUITE_ID),
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? null,
    participantEmail: row.participant_email ?? null,
    total: Number(row.total ?? 0),
    passed: Number(row.passed ?? 0),
    failed: Number(row.failed ?? 0),
    skipped: Number(row.skipped ?? 0),
    durationMs: Number(row.duration_ms ?? 0),
    verdict: (row.verdict ?? "unknown") as BrowserSuiteRun["verdict"],
    failingSpecs: Array.isArray(row.failing_specs) ? (row.failing_specs as string[]) : [],
    specResults: Array.isArray(row.spec_results) ? (row.spec_results as BrowserSpecResult[]) : [],
    notes: row.notes ?? null,
    createdAt: String(row.created_at),
  };
}

export async function listBrowserSuiteRuns(
  supabase: Client,
  cohort: string,
  limit = 20,
): Promise<BrowserSuiteRun[]> {
  const { data, error } = await supabase
    .from("pilot_browser_suite_runs")
    .select("*")
    .eq("cohort", cohort)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRun);
}

export async function recordBrowserSuiteRun(
  supabase: Client,
  input: {
    cohort: string;
    actorId: string;
    actorEmail: string | null;
    participantEmail: string | null;
    specResults: readonly BrowserSpecResult[];
    durationMs: number;
    notes?: string | null;
  },
): Promise<BrowserSuiteRun> {
  const total = input.specResults.length;
  const passed = input.specResults.filter((r) => r.status === "passed").length;
  const failed = input.specResults.filter(
    (r) => r.status === "failed" || r.status === "timedOut",
  ).length;
  const skipped = input.specResults.filter((r) => r.status === "skipped").length;
  const failingSpecs = [
    ...new Set(
      input.specResults
        .filter((r) => r.status === "failed" || r.status === "timedOut")
        .map((r) => r.spec),
    ),
  ];

  const { data, error } = await supabase
    .from("pilot_browser_suite_runs")
    .insert({
      cohort: input.cohort,
      suite: BROWSER_SUITE_ID,
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      participant_email: input.participantEmail,
      total,
      passed,
      failed,
      skipped,
      duration_ms: Math.max(0, Math.round(input.durationMs)),
      verdict: browserVerdict({ total, passed, failed, skipped }),
      failing_specs: failingSpecs,
      spec_results: input.specResults,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRun(data);
}
