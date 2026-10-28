/**
 * Lightweight spans — use only where justified (critical transactions, AI,
 * gate decide, export). Not a full OpenTelemetry SDK; correlation IDs remain
 * the primary cross-log join key.
 */

import { createCorrelationId } from "./correlation";
import { structuredLog } from "./logging";
import { METRIC_NAMES, recordMetric } from "./metrics";

export type Span = {
  name: string;
  spanId: string;
  correlationId: string;
  startedAt: number;
};

export function startSpan(name: string, correlationId?: string): Span {
  return {
    name,
    spanId: createCorrelationId().slice(0, 16),
    correlationId: correlationId ?? createCorrelationId(),
    startedAt: Date.now(),
  };
}

export function endSpan(
  span: Span,
  outcome: "ok" | "error" = "ok",
  fields: Record<string, unknown> = {},
): number {
  const durationMs = Date.now() - span.startedAt;
  recordMetric(
    METRIC_NAMES.apiLatencyMs,
    durationMs,
    { span: span.name, outcome },
    span.correlationId,
  );
  structuredLog(
    outcome === "ok" ? "info" : "error",
    `span.${span.name}.${outcome}`,
    { ...fields, spanId: span.spanId, durationMs },
    span.correlationId,
  );
  return durationMs;
}

/** Justify tracing: only these critical paths are encouraged to open spans. */
export const JUSTIFIED_TRACE_PATHS = [
  "ai.assist",
  "gate.decide",
  "export.generate",
  "submission.publish",
  "entitlement.grant",
] as const;

export type JustifiedTracePath = (typeof JUSTIFIED_TRACE_PATHS)[number];

export function isJustifiedTracePath(name: string): name is JustifiedTracePath {
  return (JUSTIFIED_TRACE_PATHS as readonly string[]).includes(name);
}
