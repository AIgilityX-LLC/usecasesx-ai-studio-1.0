/**
 * Server-only health report using process.env (names only in the response).
 */

import { RELEASE_VERSION } from "@/lib/release";
import { correlationFromRequest, correlationResponseHeaders } from "./correlation";
import { evaluateHealth, httpStatusForHealth, type HealthReport } from "./health";
import { METRIC_NAMES, recordMetric } from "./metrics";
import { log } from "./logging";

export function buildHealthReport(request: Request): {
  report: HealthReport;
  status: number;
  headers: HeadersInit;
} {
  const started = Date.now();
  const ctx = correlationFromRequest(request);
  const report = evaluateHealth(process.env as Record<string, string | undefined>, {
    version: RELEASE_VERSION,
    correlationId: ctx.correlationId,
  });
  recordMetric(METRIC_NAMES.healthCheckMs, Date.now() - started, undefined, ctx.correlationId);
  log.info("health.check", { status: report.status }, ctx.correlationId);
  return {
    report,
    status: httpStatusForHealth(report.status),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...correlationResponseHeaders(ctx),
    },
  };
}
