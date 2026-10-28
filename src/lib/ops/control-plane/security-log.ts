/**
 * Security event logging — structured `security` level + metric counter.
 * Complements append-only `audit_events` (compliance) without mixing streams.
 */

import { isSecurityControlEvent } from "./events";
import { log } from "./logging";
import { METRIC_NAMES, recordMetric } from "./metrics";
import { createCorrelationId } from "./correlation";

/**
 * Emit a security observability signal. Prefer known SECURITY_CONTROL_EVENTS.
 * Does not write to audit_events — call appendAuditEvent separately when the
 * action is also a governance mutation.
 */
export function logSecurityEvent(
  eventName: string,
  fields: Record<string, unknown> = {},
  correlationId?: string,
): string {
  const cid = correlationId ?? createCorrelationId();
  const known = isSecurityControlEvent(eventName);
  log.security(eventName, { ...fields, knownControlEvent: known }, cid);
  recordMetric(METRIC_NAMES.securityEvents, 1, { event: eventName.slice(0, 64) }, cid);
  return cid;
}
