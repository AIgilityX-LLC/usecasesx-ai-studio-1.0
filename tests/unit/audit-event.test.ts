/**
 * Unit tests for the immutable AuditEvent architecture (pure helpers only).
 */
import { describe, expect, test } from "bun:test";

import {
  AuditService,
  AUDIT_REQUIRED_CATEGORIES,
  buildAuditInsertRow,
  clampAuditLimit,
  fromLegacyAuditInput,
  normalizeAuditFilter,
  prepareAuditInsert,
  rowToAuditEvent,
  serializeAuditExport,
  type AuditEvent,
} from "../../src/lib/audit";
import { AUDIT_EVENTS } from "../../src/lib/telemetry/events";

describe("AuditService catalogue", () => {
  test("required categories are non-empty and named", () => {
    expect(AUDIT_REQUIRED_CATEGORIES.length).toBeGreaterThan(5);
    expect(AuditService.isKnownEvent(AUDIT_EVENTS.exportGenerated)).toBe(true);
    expect(AuditService.isKnownEvent("not.a.real.event")).toBe(false);
  });
});

describe("row mapping", () => {
  test("maps DB columns to AuditEvent domain fields", () => {
    const event = rowToAuditEvent({
      id: "11111111-1111-4111-8111-111111111111",
      organization_id: "22222222-2222-4222-8222-222222222222",
      workspace_id: "33333333-3333-4333-8333-333333333333",
      actor_id: "44444444-4444-4444-8444-444444444444",
      actor_type: "service",
      event_type: "role.changed",
      entity_type: "membership",
      entity_id: "55555555-5555-4555-8555-555555555555",
      created_at: "2026-10-28T12:00:00.000Z",
      request_id: "req-1",
      session_id: "sess-1",
      context: { ip: "203.0.113.10", path: "/api" },
      previous_value: { role: "viewer" },
      new_value: { role: "admin" },
      result: "success",
      metadata: { reason: "promotion" },
      severity: "notice",
      source: "server",
    });

    expect(event.tenant_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(event.resource_type).toBe("membership");
    expect(event.resource_id).toBe("55555555-5555-4555-8555-555555555555");
    expect(event.timestamp).toBe("2026-10-28T12:00:00.000Z");
    expect(event.before_state).toEqual({ role: "viewer" });
    expect(event.after_state).toEqual({ role: "admin" });
    expect(event.actor_type).toBe("service");
    expect(event.context?.ip).toBe("203.0.113.10");
  });

  test("buildAuditInsertRow uses stable DB column names", () => {
    const row = buildAuditInsertRow({
      actorId: "44444444-4444-4444-8444-444444444444",
      requestId: "req-2",
      eventType: "export.generated",
      resourceType: "report",
      resourceId: "55555555-5555-4555-8555-555555555555",
      tenantId: "22222222-2222-4222-8222-222222222222",
      beforeState: null,
      afterState: { format: "csv" },
      result: "success",
      actorType: "user",
    });
    expect(row.entity_type).toBe("report");
    expect(row.organization_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(row.new_value).toEqual({ format: "csv" });
    expect(row.previous_value).toBeNull();
  });
});

describe("prepareAuditInsert privacy", () => {
  test("redacts secrets in before/after/metadata/context", () => {
    const { row } = prepareAuditInsert(
      {
        eventType: "admin.action",
        resourceType: "organization",
        beforeState: { apiKey: "secret-value", name: "Acme" },
        afterState: { token: "abc", plan: "pro" },
        metadata: { password: "nope", note: "ok" },
        context: { ip: "198.51.100.2", userAgent: "test" },
      },
      { actorId: "44444444-4444-4444-8444-444444444444", requestId: "req-3" },
    );
    expect((row.previous_value as Record<string, unknown>).apiKey).toBe("[redacted]");
    expect((row.previous_value as Record<string, unknown>).name).toBe("Acme");
    expect((row.new_value as Record<string, unknown>).token).toBe("[redacted]");
    expect((row.metadata as Record<string, unknown>).password).toBe("[redacted]");
    expect((row.context as Record<string, unknown>).ip).toBe("198.51.100.2");
  });

  test("bridges legacy telemetry input", () => {
    const append = fromLegacyAuditInput({
      event: AUDIT_EVENTS.entityUpdated,
      entity: { type: "portfolio", id: "55555555-5555-4555-8555-555555555555" },
      previous: { title: "A" },
      next: { title: "B" },
      organizationId: "22222222-2222-4222-8222-222222222222",
      result: "partial",
      actorType: "support",
    });
    expect(append.resourceType).toBe("portfolio");
    expect(append.tenantId).toBe("22222222-2222-4222-8222-222222222222");
    expect(append.result).toBe("partial");
    expect(append.actorType).toBe("support");
  });
});

describe("filters and export", () => {
  test("normalizes empty strings and clamps limits", () => {
    const f = normalizeAuditFilter({
      eventType: "  ",
      actorType: "user",
      result: "denied",
      q: " role ",
      limit: 9999,
    });
    expect(f.eventType).toBeNull();
    expect(f.actorType).toBe("user");
    expect(f.result).toBe("denied");
    expect(f.q).toBe("role");
    expect(clampAuditLimit(9999)).toBe(500);
    expect(clampAuditLimit(0)).toBe(1);
  });

  test("serializes JSON and CSV without dropping core fields", () => {
    const sample: AuditEvent = {
      id: "11111111-1111-4111-8111-111111111111",
      tenant_id: "22222222-2222-4222-8222-222222222222",
      workspace_id: null,
      actor_id: "44444444-4444-4444-8444-444444444444",
      actor_type: "user",
      event_type: "export.generated",
      resource_type: "audit_events",
      resource_id: null,
      timestamp: "2026-10-28T12:00:00.000Z",
      request_id: "req-x",
      session_id: null,
      context: null,
      before_state: null,
      after_state: { format: "csv" },
      result: "success",
      metadata: {},
      severity: "notice",
      source: "audit.export",
    };
    const json = serializeAuditExport([sample], "json");
    expect(json.contentType).toContain("json");
    expect(json.body).toContain("export.generated");
    const csv = serializeAuditExport([sample], "csv");
    expect(csv.contentType).toContain("csv");
    expect(csv.body.split("\n")[0]).toContain("tenant_id");
    expect(csv.body).toContain("export.generated");
  });
});
