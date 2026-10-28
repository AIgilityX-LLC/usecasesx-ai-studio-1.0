/**
 * Correlation / request IDs for the operational control plane.
 *
 * Prefer this module for new server paths. Telemetry recorders already emit
 * `request_id`; submissions keep their `sub_*` prefix for that flow.
 */

import { newRequestId } from "@/lib/telemetry/events";

export type CorrelationContext = {
  correlationId: string;
  /** Optional parent span for justified distributed tracing. */
  parentSpanId?: string | null;
};

const HEADER = "x-correlation-id";
const ALT_HEADERS = ["x-request-id", "x-trace-id"] as const;

/** Create a new correlation id (UUID-shaped via telemetry helper). */
export function createCorrelationId(): string {
  return newRequestId();
}

/** Read an inbound correlation id or mint one. */
export function correlationFromRequest(request: Request): CorrelationContext {
  const fromHeader =
    request.headers.get(HEADER) ??
    ALT_HEADERS.map((h) => request.headers.get(h)).find((v) => v && v.trim()) ??
    null;
  const cleaned = fromHeader?.trim().slice(0, 128) || null;
  return {
    correlationId: cleaned && /^[A-Za-z0-9._:-]+$/.test(cleaned) ? cleaned : createCorrelationId(),
  };
}

export function correlationResponseHeaders(ctx: CorrelationContext): HeadersInit {
  return { [HEADER]: ctx.correlationId, "x-request-id": ctx.correlationId };
}

export { HEADER as CORRELATION_HEADER };
