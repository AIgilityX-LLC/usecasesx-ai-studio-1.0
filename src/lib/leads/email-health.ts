/**
 * Confirmation-email delivery health — pure model.
 *
 * Shared by the admin email-delivery surface, the scheduled alert sweep and
 * the unit tests so "is delivery degrading for our sender domain?" has exactly
 * one definition.
 */

import { normalizeDeliveryStatus, type LeadRecord } from "./leads.model";

/** The verified sender domain these numbers describe. */
export const SENDER_DOMAIN = "notify.aigilityx.com";

export const DELIVERY_ALERT_THRESHOLDS = {
  /** Rolling window the rates are measured over. */
  windowHours: 24,
  /** Below this many attempts a rate is noise, not a signal. */
  minVolume: 5,
  /** Failure share that raises a warning / a critical alert. */
  failureRateWarn: 0.15,
  failureRateCritical: 0.35,
  /** Leads that exhausted every retry before we escalate regardless of rate. */
  exhaustedCritical: 3,
  /** Suppression share (bounces, complaints, opt-outs) that warrants a look. */
  suppressionRateWarn: 0.1,
} as const;

export interface DeliveryHealth {
  senderDomain: string;
  windowHours: number;
  total: number;
  sent: number;
  pending: number;
  failed: number;
  suppressed: number;
  /** Leads that used all retry attempts and are still not delivered. */
  exhausted: number;
  failureRate: number;
  suppressionRate: number;
  lastFailureAt: string | null;
  lastError: string | null;
}

const MAX_ATTEMPTS_FOR_EXHAUSTED = 5;

export function computeDeliveryHealth(
  leads: readonly LeadRecord[],
  options: { windowHours?: number; now?: Date } = {},
): DeliveryHealth {
  const windowHours = options.windowHours ?? DELIVERY_ALERT_THRESHOLDS.windowHours;
  const now = options.now ?? new Date();
  const since = now.getTime() - windowHours * 3_600_000;

  const inWindow = leads.filter((lead) => {
    const stamp = lead.confirmation_last_attempt_at ?? lead.created_at;
    const time = new Date(stamp).getTime();
    return Number.isFinite(time) && time >= since;
  });

  let sent = 0;
  let pending = 0;
  let failed = 0;
  let suppressed = 0;
  let exhausted = 0;
  let lastFailureAt: string | null = null;
  let lastError: string | null = null;

  for (const lead of inWindow) {
    const status = normalizeDeliveryStatus(lead.confirmation_status);
    if (status === "sent") sent += 1;
    else if (status === "failed") failed += 1;
    else if (status === "suppressed") suppressed += 1;
    else if (status === "pending") pending += 1;

    if (status !== "sent" && (lead.confirmation_attempts ?? 0) >= MAX_ATTEMPTS_FOR_EXHAUSTED) {
      exhausted += 1;
    }
    if (status === "failed" && lead.confirmation_last_attempt_at) {
      if (!lastFailureAt || lead.confirmation_last_attempt_at > lastFailureAt) {
        lastFailureAt = lead.confirmation_last_attempt_at;
        lastError = lead.confirmation_last_error ?? null;
      }
    }
  }

  const total = inWindow.length;
  return {
    senderDomain: SENDER_DOMAIN,
    windowHours,
    total,
    sent,
    pending,
    failed,
    suppressed,
    exhausted,
    failureRate: total === 0 ? 0 : failed / total,
    suppressionRate: total === 0 ? 0 : suppressed / total,
    lastFailureAt,
    lastError,
  };
}

export type AlertSeverity = "warning" | "critical";

export interface DeliveryAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
}

/** Turns the health snapshot into the alerts an admin should be notified about. */
export function evaluateDeliveryAlerts(health: DeliveryHealth): DeliveryAlert[] {
  const alerts: DeliveryAlert[] = [];
  const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

  if (health.total >= DELIVERY_ALERT_THRESHOLDS.minVolume) {
    if (health.failureRate >= DELIVERY_ALERT_THRESHOLDS.failureRateCritical) {
      alerts.push({
        id: "failure-rate-critical",
        severity: "critical",
        title: `Confirmation email failure rate at ${pct(health.failureRate)}`,
        detail: `${health.failed} of ${health.total} attempts in the last ${health.windowHours}h failed for ${health.senderDomain}.${health.lastError ? ` Last error: ${health.lastError}` : ""}`,
      });
    } else if (health.failureRate >= DELIVERY_ALERT_THRESHOLDS.failureRateWarn) {
      alerts.push({
        id: "failure-rate-warning",
        severity: "warning",
        title: `Confirmation email failure rate at ${pct(health.failureRate)}`,
        detail: `${health.failed} of ${health.total} attempts in the last ${health.windowHours}h failed for ${health.senderDomain}.`,
      });
    }

    if (health.suppressionRate >= DELIVERY_ALERT_THRESHOLDS.suppressionRateWarn) {
      alerts.push({
        id: "suppression-rate-warning",
        severity: "warning",
        title: `Suppressed recipients at ${pct(health.suppressionRate)}`,
        detail: `${health.suppressed} recipient(s) bounced, complained or opted out in the last ${health.windowHours}h. Review the list quality before sending more.`,
      });
    }
  }

  if (health.exhausted >= DELIVERY_ALERT_THRESHOLDS.exhaustedCritical) {
    alerts.push({
      id: "retry-exhausted",
      severity: "critical",
      title: `${health.exhausted} leads exhausted every retry`,
      detail: `These confirmations will not be retried automatically — resend them by hand once the cause is fixed.`,
    });
  }

  return alerts;
}

export function alertSummary(alerts: readonly DeliveryAlert[]): string {
  if (alerts.length === 0) return "Delivery healthy";
  const critical = alerts.filter((a) => a.severity === "critical").length;
  return critical > 0
    ? `${critical} critical delivery alert${critical === 1 ? "" : "s"}`
    : `${alerts.length} delivery warning${alerts.length === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------- template previews */

export const PREVIEW_TEMPLATES = ["waitlist-confirmation", "advisor-confirmation"] as const;
export type PreviewTemplate = (typeof PREVIEW_TEMPLATES)[number];

export const SAMPLE_REFERENCE_ID = "UCX-1A2B3C4D";

/** Sample props used to render a template before a real send. */
export function samplePreviewData(input: {
  referenceId?: string;
  focusArea?: string | null;
  name?: string;
}): { name: string; referenceId: string; interestArea: string | null } {
  return {
    name: input.name?.trim() || "Alex Morgan",
    referenceId: input.referenceId?.trim() || SAMPLE_REFERENCE_ID,
    interestArea: input.focusArea?.trim() ? input.focusArea.trim() : null,
  };
}

/** Maps a webhook outcome onto the lead's confirmation status. */
export function deliveryStatusForEvent(
  event: "email.bounced" | "email.complaint" | "email.unsubscribed",
): "failed" | "suppressed" {
  return event === "email.bounced" ? "failed" : "suppressed";
}

export function deliveryEventReason(
  event: "email.bounced" | "email.complaint" | "email.unsubscribed",
): string {
  if (event === "email.bounced") return "Recipient address bounced";
  if (event === "email.complaint") return "Recipient reported the email as spam";
  return "Recipient unsubscribed";
}
