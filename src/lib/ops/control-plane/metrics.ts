/**
 * Performance / database / API / job metric vocabulary.
 *
 * Emit via `recordMetric` (in-process ring for health snapshots) or forward to
 * an external collector later. Names are stable contracts — do not invent ad-hoc
 * strings in call sites.
 */

export const METRIC_NAMES = {
  apiLatencyMs: "api.latency_ms",
  apiErrors: "api.errors",
  dbQueryMs: "db.query_ms",
  dbErrors: "db.errors",
  jobDurationMs: "job.duration_ms",
  jobFailures: "job.failures",
  securityEvents: "security.events",
  auditEvents: "audit.events",
  usageEvents: "usage.events",
  healthCheckMs: "health.check_ms",
} as const;

export type MetricName = (typeof METRIC_NAMES)[keyof typeof METRIC_NAMES];

export type MetricSample = {
  name: MetricName;
  value: number;
  at: number;
  tags?: Record<string, string>;
  correlationId?: string;
};

const RING_MAX = 500;
const ring: MetricSample[] = [];

export function recordMetric(
  name: MetricName,
  value: number,
  tags?: Record<string, string>,
  correlationId?: string,
): void {
  if (!Number.isFinite(value)) return;
  ring.push({ name, value, at: Date.now(), tags, correlationId });
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
}

export function recentMetrics(name?: MetricName, limit = 100): MetricSample[] {
  const filtered = name ? ring.filter((s) => s.name === name) : [...ring];
  return filtered.slice(-limit);
}

/** Approximate P95 from recent samples of a metric (in-process only). */
export function approximateP95(name: MetricName): number | null {
  const values = recentMetrics(name, RING_MAX)
    .map((s) => s.value)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const idx = Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1);
  return values[Math.max(0, idx)] ?? null;
}

export function clearMetricsForTests(): void {
  ring.length = 0;
}

/** Timing helper for API / job paths. */
export async function timeAsync<T>(
  name: MetricName,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
  correlationId?: string,
): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    recordMetric(name, Date.now() - started, tags, correlationId);
  }
}
