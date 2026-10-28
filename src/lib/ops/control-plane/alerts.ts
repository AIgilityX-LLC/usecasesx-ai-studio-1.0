/**
 * Alert catalogue — when to page / notify ops.
 *
 * Threshold alerts for export/AI abuse already live in observability.model.
 * This catalogue is the control-plane index (including uptime and SLO burn).
 */

import { SECURITY_SIGNAL_EVENTS } from "@/lib/observability/observability.model";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertDefinition = {
  id: string;
  label: string;
  severity: AlertSeverity;
  /** What fires the alert. */
  trigger: string;
  /** Who owns response. */
  owner: string;
  relatedSlo?: string;
  /** Existing implementation pointer when present. */
  implementation?: string;
};

export const ALERT_CATALOGUE: readonly AlertDefinition[] = [
  {
    id: "uptime.health_fail",
    label: "Public health endpoint failing",
    severity: "critical",
    trigger: "/api/public/health returns 503 or fails TLS for 2 consecutive intervals",
    owner: "Platform on-call",
    relatedSlo: "platform_availability",
    implementation: "External uptime monitor → ops email / PagerDuty (configure per env)",
  },
  {
    id: "slo.api_p95_burn",
    label: "API P95 latency SLO burn",
    severity: "warning",
    trigger: "Rolling 15m P95 api.latency_ms ≥ 500 ms",
    owner: "Platform on-call",
    relatedSlo: "api_p95_latency",
  },
  {
    id: "security.cross_workspace",
    label: "Cross-workspace access attempts",
    severity: "critical",
    trigger: `Security signals: ${SECURITY_SIGNAL_EVENTS.join(", ")} above threshold`,
    owner: "Security / platform admin",
    relatedSlo: "security_event_logging",
    implementation: "src/lib/observability/* + Export & AI Activity admin surface",
  },
  {
    id: "job.hook_failure",
    label: "Scheduled job / cron hook failure",
    severity: "warning",
    trigger: "Cron hook returns non-2xx or records job.failures",
    owner: "Platform on-call",
    implementation: "src/routes/api/public/hooks/*",
  },
  {
    id: "email.delivery_degraded",
    label: "Transactional email delivery degraded",
    severity: "warning",
    trigger: "Email delivery health alert thresholds",
    owner: "Platform ops",
    implementation: "src/lib/leads/email-health.server.ts",
  },
  {
    id: "backup.pitr_gap",
    label: "PITR / backup posture gap on production-class project",
    severity: "warning",
    trigger: "Enterprise/Pro production without PITR or tested restore path",
    owner: "Platform owner",
    relatedSlo: "rpo",
    implementation: "docs/architecture/reliability-observability.md § PITR",
  },
] as const;

export function alertsForSeverity(severity: AlertSeverity): AlertDefinition[] {
  return ALERT_CATALOGUE.filter((a) => a.severity === severity);
}
