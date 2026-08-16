/**
 * Server-only reads and reactions for confirmation-email delivery health.
 *
 * Nothing here decides whether a send is attempted — Lovable enforces
 * suppression at send time. These writes exist so admins can see, per lead,
 * what happened to the confirmation email and be alerted when the failure or
 * retry-failure rate for the sender domain spikes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Client = any;

import {
  computeDeliveryHealth,
  deliveryEventReason,
  deliveryStatusForEvent,
  evaluateDeliveryAlerts,
  alertSummary,
  type DeliveryAlert,
  type DeliveryHealth,
} from "./email-health";

export interface DeliveryHealthReport {
  health: DeliveryHealth;
  alerts: DeliveryAlert[];
  summary: string;
}

export async function buildDeliveryHealthReport(
  supabase: Client,
  options: { windowHours?: number; limit?: number } = {},
): Promise<DeliveryHealthReport> {
  const { listLeads } = await import("./leads.server");
  const leads = await listLeads(supabase, options.limit ?? 1000);
  const health = computeDeliveryHealth(leads, { windowHours: options.windowHours });
  const alerts = evaluateDeliveryAlerts(health);
  return { health, alerts, summary: alertSummary(alerts) };
}

/**
 * Notifies the operator when delivery degrades. The webhook destination is a
 * server secret; when it is not configured the alert is still recorded in the
 * server log and returned to the admin surface, so nothing is silently lost.
 */
export async function dispatchDeliveryAlerts(
  report: DeliveryHealthReport,
): Promise<{ notified: boolean; channel: "webhook" | "log"; alerts: number }> {
  if (report.alerts.length === 0) return { notified: false, channel: "log", alerts: 0 };

  const url = process.env["ALERT_WEBHOOK_URL"];
  const payload = {
    source: "usecasex.email-delivery",
    sender_domain: report.health.senderDomain,
    summary: report.summary,
    window_hours: report.health.windowHours,
    metrics: {
      attempts: report.health.total,
      sent: report.health.sent,
      failed: report.health.failed,
      suppressed: report.health.suppressed,
      exhausted: report.health.exhausted,
      failure_rate: Number(report.health.failureRate.toFixed(3)),
    },
    alerts: report.alerts,
  };

  if (!url) {
    console.warn("[usecasex:email-alerts] no ALERT_WEBHOOK_URL configured", payload);
    return { notified: false, channel: "log", alerts: report.alerts.length };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`alert webhook responded ${response.status}`);
    return { notified: true, channel: "webhook", alerts: report.alerts.length };
  } catch (error) {
    console.error("[usecasex:email-alerts] alert dispatch failed", error);
    return { notified: false, channel: "log", alerts: report.alerts.length };
  }
}

/**
 * Applies one managed-delivery outcome (bounce, spam complaint, unsubscribe)
 * to the matching lead's confirmation status and timeline.
 *
 * Idempotent: the delivery id is stored as the timeline correlation id, so a
 * redelivered webhook is recognised and skipped.
 */
export async function applyDeliveryEvent(
  supabase: Client,
  input: {
    event: "email.bounced" | "email.complaint" | "email.unsubscribed";
    recipient: string;
    eventId: string;
  },
): Promise<{ applied: boolean; reason?: string }> {
  const email = input.recipient.trim().toLowerCase();
  if (!email) return { applied: false, reason: "no_recipient" };

  const { data: existing } = await supabase
    .from("lead_events")
    .select("id")
    .eq("correlation_id", input.eventId)
    .limit(1);
  if ((existing ?? []).length > 0) return { applied: false, reason: "duplicate" };

  const { data: leads, error } = await supabase
    .from("lead_captures")
    .select("id, confirmation_status, confirmation_attempts")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  const rows = (leads ?? []) as {
    id: string;
    confirmation_status: string | null;
    confirmation_attempts: number | null;
  }[];
  if (rows.length === 0) return { applied: false, reason: "no_matching_lead" };

  const status = deliveryStatusForEvent(input.event);
  const reason = deliveryEventReason(input.event);
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("lead_captures")
    .update({
      confirmation_status: status,
      confirmation_last_error: reason,
      confirmation_last_attempt_at: now,
      // A bounced or suppressed address must not be retried on a schedule.
      confirmation_next_retry_at: null,
    })
    .in(
      "id",
      rows.map((r) => r.id),
    );
  if (updateError) throw new Error(updateError.message);

  const { recordLeadEvents } = await import("./leads.server");
  await recordLeadEvents(
    supabase,
    rows.map((row, index) => ({
      lead_id: row.id,
      event_type: "email_delivery_event",
      from_status: row.confirmation_status ?? null,
      to_status: status,
      actor_id: null,
      actor_label: "email-delivery",
      detail: `${reason} (${input.event})`,
      // Only the first row carries the delivery id so the dedupe lookup stays exact.
      correlation_id: index === 0 ? input.eventId : null,
    })),
  );

  return { applied: true };
}
