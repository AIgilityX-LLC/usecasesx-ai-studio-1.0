/**
 * Centralized structured logging — secret-free JSON lines.
 *
 * Levels: debug | info | warn | error | security
 * Always attach correlationId when available. Never log tokens, keys, prompts.
 */

import { redactRecord, safeErrorShape } from "@/lib/telemetry/events";
import { createCorrelationId } from "./correlation";

export type LogLevel = "debug" | "info" | "warn" | "error" | "security";

export type LogFields = Record<string, unknown>;

export type StructuredLogEvent = {
  ts: string;
  level: LogLevel;
  service: string;
  message: string;
  correlationId: string;
  /** Optional OpenTelemetry-style span id when tracing is justified. */
  spanId?: string;
  fields?: LogFields;
};

const SERVICE = "usecasesx";

function emit(event: StructuredLogEvent): void {
  const line = JSON.stringify(event);
  if (event.level === "error" || event.level === "security") {
    console.error(line);
  } else if (event.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function structuredLog(
  level: LogLevel,
  message: string,
  fields: LogFields = {},
  correlationId?: string,
): string {
  const id =
    typeof fields.correlationId === "string"
      ? (fields.correlationId as string)
      : (correlationId ?? createCorrelationId());
  const { correlationId: _c, spanId, ...rest } = fields;
  emit({
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    message,
    correlationId: id,
    spanId: typeof spanId === "string" ? spanId : undefined,
    fields: Object.keys(rest).length ? redactRecord(rest) : undefined,
  });
  return id;
}

export const log = {
  debug: (message: string, fields?: LogFields, cid?: string) =>
    structuredLog("debug", message, fields, cid),
  info: (message: string, fields?: LogFields, cid?: string) =>
    structuredLog("info", message, fields, cid),
  warn: (message: string, fields?: LogFields, cid?: string) =>
    structuredLog("warn", message, fields, cid),
  error: (message: string, fields?: LogFields, cid?: string) =>
    structuredLog("error", message, fields, cid),
  security: (message: string, fields?: LogFields, cid?: string) =>
    structuredLog("security", message, fields, cid),
};

/** Log a caught error with safe shape + correlation. */
export function logCaughtError(
  scope: string,
  error: unknown,
  fields: LogFields = {},
  correlationId?: string,
): string {
  const shape = safeErrorShape(error);
  return structuredLog(
    "error",
    `${scope}: ${shape.name}: ${shape.message}`,
    { ...fields, errorName: shape.name },
    correlationId,
  );
}
