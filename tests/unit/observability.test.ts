import { describe, expect, it } from "vitest";
import {
  aggregateAiUsage,
  evaluateAlerts,
  evaluateRetryShield,
  OBSERVABILITY_EVENTS,
  RETRY_SHIELD,
  type AiUsageRow,
  type SecuritySignal,
} from "@/lib/observability/observability.model";

const now = Date.parse("2026-08-11T03:00:00.000Z");
const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

describe("retry shield", () => {
  it("allows sporadic failures", () => {
    expect(evaluateRetryShield([ago(10), ago(20)], now).blocked).toBe(false);
  });

  it("blocks after repeated failures and reports a cooldown", () => {
    const verdict = evaluateRetryShield([ago(5), ago(20), ago(40)], now);
    expect(verdict.blocked).toBe(true);
    if (verdict.blocked) {
      expect(verdict.retryAfterSeconds).toBeLessThanOrEqual(RETRY_SHIELD.cooldownSeconds);
      expect(verdict.reason).toMatch(/Try again in/);
    }
  });

  it("releases once the cooldown has elapsed", () => {
    const stale = RETRY_SHIELD.cooldownSeconds + 5;
    expect(evaluateRetryShield([ago(stale), ago(stale + 5), ago(stale + 10)], now).blocked).toBe(
      false,
    );
  });

  it("ignores failures older than the counting window", () => {
    const old = RETRY_SHIELD.windowSeconds + 60;
    expect(evaluateRetryShield([ago(old), ago(old + 1), ago(old + 2)], now).blocked).toBe(false);
  });
});

describe("ai usage aggregation", () => {
  const rows: AiUsageRow[] = [
    {
      userId: "u1",
      workspaceId: "w1",
      status: "ok",
      errorKind: null,
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      task: "draft",
      model: "m",
      createdAt: ago(60),
    },
    {
      userId: "u1",
      workspaceId: "w1",
      status: "error",
      errorKind: "timeout",
      promptTokens: 10,
      completionTokens: 0,
      totalTokens: 10,
      task: "draft",
      model: "m",
      createdAt: ago(30),
    },
  ];

  it("counts prompts, failures and token spend proxies", () => {
    const a = aggregateAiUsage(rows, {
      windowDays: 30,
      userNames: { u1: "Ada" },
      workspaceNames: { w1: "Alpha" },
      rateLimits: { byUser: { u1: 2 }, byWorkspace: { w1: 2 }, total: 2 },
    });
    expect(a.totals.prompts).toBe(2);
    expect(a.totals.failures).toBe(1);
    expect(a.totals.totalTokens).toBe(160);
    expect(a.totals.rateLimited).toBe(2);
    expect(a.byUser[0]?.label).toBe("Ada");
    expect(a.byUser[0]?.rateLimited).toBe(2);
    expect(a.byWorkspace[0]?.label).toBe("Alpha");
    expect(a.failureKinds[0]).toEqual({ kind: "timeout", count: 1 });
  });
});

describe("alert thresholds", () => {
  const signal = (eventType: string, actorId: string): SecuritySignal => ({
    id: `${eventType}-${actorId}-${Math.random()}`,
    at: ago(120),
    eventType,
    actorId,
    actorName: actorId,
    workspaceId: "w1",
    severity: "warning",
    detail: null,
    requestId: null,
  });

  it("fires immediately on a cross-workspace attempt", () => {
    const alerts = evaluateAlerts(
      [signal(OBSERVABILITY_EVENTS.crossWorkspaceAttempt, "u1")],
      now,
    );
    expect(alerts.find((a) => a.id === "cross_workspace")?.triggered).toBe(true);
    expect(alerts.find((a) => a.id === "storage_blocked")?.triggered).toBe(false);
  });

  it("requires repeated storage blocks before alerting", () => {
    const few = Array.from({ length: 3 }, () => signal(OBSERVABILITY_EVENTS.storageDenied, "u2"));
    expect(evaluateAlerts(few, now).find((a) => a.id === "storage_blocked")?.triggered).toBe(false);
    const many = Array.from({ length: 6 }, () => signal(OBSERVABILITY_EVENTS.storageDenied, "u2"));
    const alert = evaluateAlerts(many, now).find((a) => a.id === "storage_blocked");
    expect(alert?.triggered).toBe(true);
    expect(alert?.actors[0]).toMatchObject({ actorId: "u2", count: 6 });
  });

  it("ignores signals outside the rule window", () => {
    const old = { ...signal(OBSERVABILITY_EVENTS.crossWorkspaceAttempt, "u3"), at: ago(48 * 3600) };
    expect(evaluateAlerts([old], now).find((a) => a.id === "cross_workspace")?.triggered).toBe(
      false,
    );
  });
});
