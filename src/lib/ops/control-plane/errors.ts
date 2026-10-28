/**
 * Centralized error handling helpers for server / edge paths.
 *
 * Keeps user-facing responses generic while emitting structured, redacted logs
 * with a correlation id. Does not replace domain error types.
 */

import { safeErrorShape } from "@/lib/telemetry/events";
import {
  correlationFromRequest,
  correlationResponseHeaders,
  createCorrelationId,
} from "./correlation";
import { logCaughtError, log } from "./logging";
import { METRIC_NAMES, recordMetric } from "./metrics";

export type HandledError = {
  correlationId: string;
  status: number;
  publicMessage: string;
};

const DEFAULT_PUBLIC = "Something went wrong. Please try again shortly.";

/**
 * Map an unexpected error into a safe public response + structured log.
 * Never include stack traces or secret-bearing payloads in the public body.
 */
export function handleUnexpectedError(
  error: unknown,
  opts: {
    scope: string;
    request?: Request;
    correlationId?: string;
    status?: number;
    publicMessage?: string;
  },
): HandledError {
  const correlationId =
    opts.correlationId ??
    (opts.request ? correlationFromRequest(opts.request).correlationId : createCorrelationId());
  const shape = safeErrorShape(error);
  logCaughtError(opts.scope, error, { status: opts.status ?? 500 }, correlationId);
  recordMetric(METRIC_NAMES.apiErrors, 1, { scope: opts.scope }, correlationId);
  return {
    correlationId,
    status: opts.status ?? 500,
    publicMessage: opts.publicMessage ?? DEFAULT_PUBLIC,
  };
}

/** Build a JSON error Response with correlation headers. */
export function errorJsonResponse(handled: HandledError): Response {
  return Response.json(
    {
      error: handled.publicMessage,
      correlationId: handled.correlationId,
    },
    {
      status: handled.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...correlationResponseHeaders({ correlationId: handled.correlationId }),
      },
    },
  );
}

/** Log a security-sensitive failure without changing the HTTP contract. */
export function logSecurityFailure(
  message: string,
  fields: Record<string, unknown> = {},
  correlationId?: string,
): string {
  return log.security(message, fields, correlationId);
}
