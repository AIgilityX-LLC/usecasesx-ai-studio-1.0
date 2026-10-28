/**
 * Database monitoring hooks — timing + error counters without changing query
 * semantics. Prefer wrapping hot server paths; do not log row payloads.
 */

import { log } from "./logging";
import { METRIC_NAMES, recordMetric } from "./metrics";

export async function monitorDbQuery<T>(
  label: string,
  fn: () => Promise<T>,
  correlationId?: string,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    recordMetric(
      METRIC_NAMES.dbQueryMs,
      Date.now() - started,
      { label: label.slice(0, 64) },
      correlationId,
    );
    return result;
  } catch (err) {
    recordMetric(METRIC_NAMES.dbErrors, 1, { label: label.slice(0, 64) }, correlationId);
    log.warn(
      "db.query_failed",
      {
        label,
        message: err instanceof Error ? err.message.slice(0, 160) : "error",
      },
      correlationId,
    );
    throw err;
  }
}
