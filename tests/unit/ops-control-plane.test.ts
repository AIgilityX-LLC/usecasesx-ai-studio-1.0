import { describe, expect, test } from "bun:test";
import {
  ALERT_CATALOGUE,
  JUSTIFIED_TRACE_PATHS,
  METRIC_NAMES,
  PITR_CHECKLIST,
  RECOVERY_OBJECTIVES,
  SECURITY_CONTROL_EVENTS,
  SLO_CATALOGUE,
  UPTIME_CHECKS,
  approximateP95,
  clearMetricsForTests,
  correlationFromRequest,
  createCorrelationId,
  endSpan,
  evaluateHealth,
  httpStatusForHealth,
  isJustifiedTracePath,
  isSecurityControlEvent,
  meetsApiP95,
  pitrGuidance,
  pitrRequired,
  recordMetric,
  sloList,
  startSpan,
  structuredLog,
  timeAsync,
} from "@/lib/ops/control-plane";

describe("SLOs", () => {
  test("publishes the Phase 7 target table", () => {
    expect(SLO_CATALOGUE.platform_availability.target).toBe("99.9%");
    expect(SLO_CATALOGUE.api_p95_latency.target).toBe("<500 ms");
    expect(SLO_CATALOGUE.critical_transaction_success.target).toBe(">99.9%");
    expect(SLO_CATALOGUE.security_event_logging.target).toBe("100%");
    expect(SLO_CATALOGUE.tenant_isolation_tests.target).toBe("100% pass");
    expect(sloList()).toHaveLength(7);
  });

  test("defines RPO/RTO per tier", () => {
    expect(RECOVERY_OBJECTIVES.lite.rpoHours).toBe(24);
    expect(RECOVERY_OBJECTIVES.pro.rpoHours).toBe(4);
    expect(RECOVERY_OBJECTIVES.enterprise.rpoHours).toBe(1);
    expect(RECOVERY_OBJECTIVES.enterprise.rtoHours).toBe(4);
  });

  test("meetsApiP95 enforces <500 ms", () => {
    expect(meetsApiP95(499)).toBe(true);
    expect(meetsApiP95(500)).toBe(false);
  });
});

describe("correlation + logging", () => {
  test("mints and propagates correlation ids", () => {
    const a = createCorrelationId();
    const b = createCorrelationId();
    expect(a).not.toBe(b);
    const req = new Request("https://example.test/api/public/health", {
      headers: { "x-correlation-id": "cid-test-1" },
    });
    expect(correlationFromRequest(req).correlationId).toBe("cid-test-1");
  });

  test("structuredLog returns a correlation id", () => {
    const id = structuredLog("info", "ops.test", { hello: "world" });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(4);
  });
});

describe("health", () => {
  test("fails when SUPABASE_URL missing", () => {
    const report = evaluateHealth({}, { correlationId: "t1" });
    expect(report.status).toBe("fail");
    expect(httpStatusForHealth(report.status)).toBe(503);
  });

  test("ok when required env present", () => {
    const report = evaluateHealth(
      { SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "pk" },
      { correlationId: "t2" },
    );
    expect(report.status).toBe("ok");
    expect(httpStatusForHealth("ok")).toBe(200);
  });

  test("uptime checks point at the public health path", () => {
    expect(UPTIME_CHECKS[0]?.path).toBe("/api/public/health");
  });
});

describe("metrics + tracing", () => {
  test("records latency and approximates P95", async () => {
    clearMetricsForTests();
    recordMetric(METRIC_NAMES.apiLatencyMs, 10);
    recordMetric(METRIC_NAMES.apiLatencyMs, 20);
    recordMetric(METRIC_NAMES.apiLatencyMs, 30);
    expect(approximateP95(METRIC_NAMES.apiLatencyMs)).toBeGreaterThan(0);
    const result = await timeAsync(METRIC_NAMES.jobDurationMs, async () => 42);
    expect(result).toBe(42);
  });

  test("justified trace paths are enumerated", () => {
    expect(JUSTIFIED_TRACE_PATHS).toContain("ai.assist");
    expect(isJustifiedTracePath("ai.assist")).toBe(true);
    expect(isJustifiedTracePath("random")).toBe(false);
    const span = startSpan("ai.assist", "cid");
    const ms = endSpan(span, "ok");
    expect(ms).toBeGreaterThanOrEqual(0);
  });
});

describe("alerts, security, PITR", () => {
  test("alert catalogue includes uptime and security", () => {
    const ids = ALERT_CATALOGUE.map((a) => a.id);
    expect(ids).toContain("uptime.health_fail");
    expect(ids).toContain("security.cross_workspace");
    expect(ids).toContain("backup.pitr_gap");
  });

  test("security control events are non-empty", () => {
    expect(SECURITY_CONTROL_EVENTS.length).toBeGreaterThan(0);
    expect(isSecurityControlEvent(SECURITY_CONTROL_EVENTS[0]!)).toBe(true);
  });

  test("PITR required for pro/enterprise; checklist owned by operators", () => {
    expect(pitrRequired("enterprise")).toBe(true);
    expect(pitrRequired("lite")).toBe(false);
    const g = pitrGuidance("enterprise");
    expect(g.checklist.length).toBeGreaterThan(0);
    expect(PITR_CHECKLIST.some((i) => i.id === "pitr_enabled")).toBe(true);
    expect(g.disclaimer).toMatch(/cannot enable/i);
  });
});
