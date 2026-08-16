import { describe, expect, it } from "vitest";

import {
  computeDeliveryHealth,
  deliveryStatusForEvent,
  evaluateDeliveryAlerts,
  samplePreviewData,
  SAMPLE_REFERENCE_ID,
} from "@/lib/leads/email-health";
import type { LeadRecord } from "@/lib/leads/leads.model";

function lead(partial: Partial<LeadRecord>): LeadRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    reference_id: "UCX-AAAABBBB",
    full_name: "Test Lead",
    email: "lead@example.com",
    company: null,
    country: null,
    interest_area: null,
    cta: "waitlist",
    source_page: null,
    lead_status: "new",
    waitlist_status: "pending",
    eligible: true,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer_host: null,
    created_at: now,
    confirmation_status: "sent",
    confirmation_attempts: 1,
    confirmation_last_attempt_at: now,
    confirmation_sent_at: now,
    confirmation_next_retry_at: null,
    confirmation_last_error: null,
    ...partial,
  } as LeadRecord;
}

describe("confirmation email delivery health", () => {
  it("counts attempts inside the window only", () => {
    const old = new Date(Date.now() - 72 * 3_600_000).toISOString();
    const health = computeDeliveryHealth([
      lead({}),
      lead({ created_at: old, confirmation_last_attempt_at: old }),
    ]);
    expect(health.total).toBe(1);
    expect(health.sent).toBe(1);
    expect(health.failureRate).toBe(0);
  });

  it("raises a critical alert when the failure rate spikes", () => {
    const leads = [
      ...Array.from({ length: 6 }, () =>
        lead({ confirmation_status: "failed", confirmation_last_error: "domain_not_verified" }),
      ),
      ...Array.from({ length: 4 }, () => lead({})),
    ];
    const health = computeDeliveryHealth(leads);
    expect(health.failureRate).toBeCloseTo(0.6);
    const alerts = evaluateDeliveryAlerts(health);
    expect(alerts.some((a) => a.id === "failure-rate-critical" && a.severity === "critical")).toBe(
      true,
    );
  });

  it("stays quiet below the minimum volume", () => {
    const health = computeDeliveryHealth([lead({ confirmation_status: "failed" })]);
    expect(evaluateDeliveryAlerts(health)).toHaveLength(0);
  });

  it("escalates when retries are exhausted", () => {
    const leads = Array.from({ length: 3 }, () =>
      lead({ confirmation_status: "failed", confirmation_attempts: 5 }),
    );
    const alerts = evaluateDeliveryAlerts(computeDeliveryHealth(leads));
    expect(alerts.some((a) => a.id === "retry-exhausted")).toBe(true);
  });

  it("flags suppression volume separately", () => {
    const leads = [
      ...Array.from({ length: 2 }, () => lead({ confirmation_status: "suppressed" })),
      ...Array.from({ length: 8 }, () => lead({})),
    ];
    const alerts = evaluateDeliveryAlerts(computeDeliveryHealth(leads));
    expect(alerts.some((a) => a.id === "suppression-rate-warning")).toBe(true);
  });

  it("maps webhook outcomes onto lead confirmation statuses", () => {
    expect(deliveryStatusForEvent("email.bounced")).toBe("failed");
    expect(deliveryStatusForEvent("email.complaint")).toBe("suppressed");
    expect(deliveryStatusForEvent("email.unsubscribed")).toBe("suppressed");
  });

  it("falls back to safe preview sample data", () => {
    expect(samplePreviewData({})).toEqual({
      name: "Alex Morgan",
      referenceId: SAMPLE_REFERENCE_ID,
      interestArea: null,
    });
    expect(samplePreviewData({ focusArea: " Health ", referenceId: "UCX-99998888" })).toEqual({
      name: "Alex Morgan",
      referenceId: "UCX-99998888",
      interestArea: "Health",
    });
  });
});
