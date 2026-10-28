/**
 * Structured server logging with request ids and redaction.
 * Reuses telemetry redaction — does not invent a second registry.
 */

import { newRequestId, redactRecord, safeErrorShape } from "@/lib/telemetry/events";

const SECRETISH =
  /\b(Bearer\s+[A-Za-z0-9._\-+=/]{8,}|sk-[A-Za-z0-9]{10,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|service_role|sb_secret_[A-Za-z0-9]+)\b/gi;

/** Strip token-like substrings from free-form text (error messages, etc.). */
export function redactSensitiveText(text: string): string {
  return text.replace(SECRETISH, "[redacted]");
}

export function requestIdFromHeaders(headers: Headers): string {
  return (
    headers.get("x-request-id")?.trim() || headers.get("x-correlation-id")?.trim() || newRequestId()
  );
}

export type SafeLogFields = Record<string, unknown>;

/** Emit one JSON log line; never includes Authorization, cookies, or raw secrets. */
export function safeServerLog(
  level: "info" | "warn" | "error",
  message: string,
  fields: SafeLogFields = {},
  requestId?: string,
): string {
  const id = requestId ?? newRequestId();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message: redactSensitiveText(message),
    requestId: id,
    fields: redactRecord(fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
  return id;
}

/** Log a caught error without leaking secrets into stdout. */
export function safeLogCaughtError(
  scope: string,
  error: unknown,
  fields: SafeLogFields = {},
  requestId?: string,
): string {
  const shape = safeErrorShape(error);
  return safeServerLog(
    "error",
    scope,
    {
      ...fields,
      errorName: shape.name,
      errorMessage: redactSensitiveText(shape.message),
    },
    requestId,
  );
}
