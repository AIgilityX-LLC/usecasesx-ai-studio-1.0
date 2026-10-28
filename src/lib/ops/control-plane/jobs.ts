/**
 * Background-job monitoring contracts for public cron hooks.
 *
 * Does not change job business logic — wraps timing / failure metrics and a
 * stable vocabulary for runbooks and alerts.
 */

import { JOB_MONITOR_HOOKS } from "./events";
import { log } from "./logging";
import { METRIC_NAMES, recordMetric } from "./metrics";
import { createCorrelationId } from "./correlation";

export type JobHookId = (typeof JOB_MONITOR_HOOKS)[number];

export type JobRunResult = {
  hook: JobHookId | string;
  ok: boolean;
  durationMs: number;
  correlationId: string;
  detail?: string;
};

export function isMonitoredJobHook(name: string): name is JobHookId {
  return (JOB_MONITOR_HOOKS as readonly string[]).includes(name);
}

/** Record a completed job run for metrics + structured logs. */
export function recordJobRun(result: JobRunResult): void {
  recordMetric(
    METRIC_NAMES.jobDurationMs,
    result.durationMs,
    {
      hook: String(result.hook),
      ok: result.ok ? "1" : "0",
    },
    result.correlationId,
  );
  if (!result.ok) {
    recordMetric(METRIC_NAMES.jobFailures, 1, { hook: String(result.hook) }, result.correlationId);
    log.error(
      "job.failed",
      { hook: result.hook, detail: result.detail ?? "failed" },
      result.correlationId,
    );
  } else {
    log.info("job.ok", { hook: result.hook, durationMs: result.durationMs }, result.correlationId);
  }
}

/**
 * Wrap an async job body with duration / failure metrics.
 * Prefer this at the edge of `/api/public/hooks/*` handlers.
 */
export async function monitorJob<T>(
  hook: JobHookId | string,
  fn: () => Promise<T>,
  correlationId?: string,
): Promise<{ result: T; run: JobRunResult }> {
  const cid = correlationId ?? createCorrelationId();
  const started = Date.now();
  try {
    const result = await fn();
    const run: JobRunResult = {
      hook,
      ok: true,
      durationMs: Date.now() - started,
      correlationId: cid,
    };
    recordJobRun(run);
    return { result, run };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "job_error";
    const run: JobRunResult = {
      hook,
      ok: false,
      durationMs: Date.now() - started,
      correlationId: cid,
      detail: detail.slice(0, 200),
    };
    recordJobRun(run);
    throw err;
  }
}

/** Operator-facing summary of hooks that should be monitored. */
export function jobMonitorCatalogue(): ReadonlyArray<{
  hook: JobHookId;
  path: string;
}> {
  return JOB_MONITOR_HOOKS.map((hook) => ({
    hook,
    path: `/api/public/hooks/${hook}`,
  }));
}
