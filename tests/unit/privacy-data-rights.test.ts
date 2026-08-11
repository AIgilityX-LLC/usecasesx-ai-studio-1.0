import { describe, expect, it } from "bun:test";

import {
  CONSENT_ACCEPT_ALL,
  CONSENT_CATEGORIES,
  CONSENT_ESSENTIAL_ONLY,
  CONSENT_POLICY_VERSION,
  DELETION_EFFECTS,
  DELETION_GRACE_DAYS,
  DELETION_STATUS_MEANING,
  DEFAULT_EXPORT_SCOPE,
  EXPORT_SCOPE,
  EXPORT_STATUS_MEANING,
  daysUntil,
  formatBytes,
  isCancellable,
  isCurrentConsent,
  type DeletionRequestRecord,
} from "@/lib/legal/privacy.model";

function deletion(partial: Partial<DeletionRequestRecord>): DeletionRequestRecord {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    status: "scheduled",
    reason: null,
    graceDays: DELETION_GRACE_DAYS,
    requestedAt: new Date().toISOString(),
    effectiveAt: new Date(Date.now() + 86_400_000 * DELETION_GRACE_DAYS).toISOString(),
    cancelledAt: null,
    completedAt: null,
    ...partial,
  };
}

describe("consent model", () => {
  it("keeps strictly necessary processing always on and non-optional", () => {
    const essential = CONSENT_CATEGORIES.find((c) => c.key === "essential");
    expect(essential?.required).toBe(true);
    expect(CONSENT_CATEGORIES.filter((c) => c.required).length).toBe(1);
  });

  it("defaults optional processing to off until the person chooses", () => {
    expect(CONSENT_ESSENTIAL_ONLY.analytics).toBe(false);
    expect(CONSENT_ESSENTIAL_ONLY.marketing).toBe(false);
    expect(CONSENT_ACCEPT_ALL.analytics).toBe(true);
    expect(CONSENT_ACCEPT_ALL.marketing).toBe(true);
  });

  it("treats a choice from an older policy version as expired", () => {
    expect(
      isCurrentConsent({
        analytics: true,
        marketing: false,
        policyVersion: CONSENT_POLICY_VERSION,
        decidedAt: new Date().toISOString(),
      }),
    ).toBe(true);
    expect(
      isCurrentConsent({
        analytics: true,
        marketing: false,
        policyVersion: "v0",
        decidedAt: new Date().toISOString(),
      }),
    ).toBe(false);
    expect(isCurrentConsent(null)).toBe(false);
  });
});

describe("data export model", () => {
  it("exports every declared scope by default", () => {
    expect(DEFAULT_EXPORT_SCOPE).toEqual(EXPORT_SCOPE.map((s) => s.key));
  });

  it("explains every export status in plain language", () => {
    for (const [status, meaning] of Object.entries(EXPORT_STATUS_MEANING)) {
      expect(meaning.label.length).toBeGreaterThan(2);
      expect(meaning.detail.length).toBeGreaterThan(10);
      expect(status).not.toContain(" ");
    }
  });

  it("formats payload sizes for humans", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("deletion model", () => {
  it("only allows cancelling while still scheduled", () => {
    expect(isCancellable(deletion({}))).toBe(true);
    expect(isCancellable(deletion({ status: "processing" }))).toBe(false);
    expect(isCancellable(deletion({ status: "completed" }))).toBe(false);
    expect(isCancellable(null)).toBe(false);
  });

  it("gives a grace period the person can act inside", () => {
    expect(DELETION_GRACE_DAYS).toBeGreaterThanOrEqual(7);
    expect(daysUntil(deletion({}).effectiveAt)).toBeGreaterThan(0);
    expect(daysUntil(new Date(Date.now() - 86_400_000).toISOString())).toBe(0);
  });

  it("states both what is deleted and what must be retained", () => {
    expect(DELETION_EFFECTS.deleted.length).toBeGreaterThan(2);
    expect(DELETION_EFFECTS.retained.length).toBeGreaterThan(1);
    expect(DELETION_EFFECTS.retained.join(" ").toLowerCase()).toContain("audit");
  });

  it("explains every deletion status", () => {
    for (const meaning of Object.values(DELETION_STATUS_MEANING)) {
      expect(meaning.detail.length).toBeGreaterThan(10);
    }
  });
});
