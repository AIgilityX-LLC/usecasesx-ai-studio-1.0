/**
 * Client-safe telemetry barrel.
 *
 * `recorder.server.ts` is intentionally NOT re-exported here — server-only
 * code must import it directly from inside a handler.
 */
export * from "./events";
export {
  recordAuditEvent,
  recordProductEvent,
  logAppError,
  setTelemetryTenant,
  getTelemetryTenant,
} from "./recorder";
