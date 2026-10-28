/**
 * Security + usage analytics event contracts for the control plane.
 *
 * Reuses existing catalogues — does not invent parallel event names.
 */

import {
  SECURITY_SIGNAL_EVENTS,
  OBSERVABILITY_EVENTS,
} from "@/lib/observability/observability.model";
import { AUDIT_EVENTS, PRODUCT_EVENTS } from "@/lib/telemetry/events";

/** Security events that must be logged at 100% (SLO security_event_logging). */
export const SECURITY_CONTROL_EVENTS = [
  ...SECURITY_SIGNAL_EVENTS,
  OBSERVABILITY_EVENTS.exportThrottled,
] as const;

/** Usage / product analytics streams (activation + journey). */
export const USAGE_ANALYTICS_STREAMS = {
  productEvents: PRODUCT_EVENTS,
  auditEvents: AUDIT_EVENTS,
  observability: OBSERVABILITY_EVENTS,
} as const;

/** Job monitoring — public cron hooks under /api/public/hooks. */
export const JOB_MONITOR_HOOKS = [
  "launch-checks",
  "email-delivery-alerts",
  "erp-reconciliation",
  "evidence-cleanup",
  "pilot-evidence-reminders",
] as const;

export function isSecurityControlEvent(name: string): boolean {
  return (SECURITY_CONTROL_EVENTS as readonly string[]).includes(name);
}
