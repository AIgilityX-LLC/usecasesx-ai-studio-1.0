/**
 * Unit tests for the telemetry vocabulary and privacy helpers.
 * Pure functions only — no network, no database. Run with `bun run test:unit`.
 */
import { describe, expect, test } from "bun:test";

import {
  ACTIVATION_FUNNEL,
  AUDIT_EVENTS,
  PRODUCT_EVENTS,
  isSensitiveKey,
  newRequestId,
  redact,
  redactRecord,
  safeErrorShape,
} from "../../src/lib/telemetry/events";

describe("event catalogue", () => {
  test("audit names are namespaced and unique", () => {
    const names = Object.values(AUDIT_EVENTS);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toContain(".");
  });

  test("activation funnel is ordered and drawn from the product catalogue", () => {
    const product = new Set<string>(Object.values(PRODUCT_EVENTS));
    for (const step of ACTIVATION_FUNNEL) expect(product.has(step)).toBe(true);
    expect(ACTIVATION_FUNNEL[0]).toBe(PRODUCT_EVENTS.registered);
    expect(ACTIVATION_FUNNEL.at(-1)).toBe(PRODUCT_EVENTS.reportExported);
  });
});

describe("correlation ids", () => {
  test("are unique and non-empty", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newRequestId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.length).toBeGreaterThan(8);
  });
});

describe("privacy redaction", () => {
  test("flags sensitive keys case-insensitively", () => {
    expect(isSensitiveKey("Authorization")).toBe(true);
    expect(isSensitiveKey("OPENAI_API_KEY")).toBe(true);
    expect(isSensitiveKey("user_prompt")).toBe(true);
    expect(isSensitiveKey("contact_email")).toBe(true);
    expect(isSensitiveKey("portfolio_type")).toBe(false);
  });

  test("removes secrets, prompts and personal data at any depth", () => {
    const out = redactRecord({
      name: "Portfolio A",
      apiKey: "sb_secret_abc",
      nested: { system_prompt: "you are...", email: "a@b.com", count: 3 },
    });
    expect(out.name).toBe("Portfolio A");
    expect(out.apiKey).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).system_prompt).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).email).toBe("[redacted]");
    expect((out.nested as Record<string, unknown>).count).toBe(3);
  });

  test("truncates long strings and limits depth", () => {
    const long = redact("x".repeat(900)) as string;
    expect(long.endsWith("[truncated]")).toBe(true);
    expect(long.length).toBeLessThan(560);
    const deep = redact({ a: { b: { c: { d: { e: 1 } } } } }) as Record<
      string,
      Record<string, Record<string, Record<string, unknown>>>
    >;
    expect(deep.a.b.c.d).toBe("[depth-limited]");
  });

  test("error shapes never leak payloads", () => {
    const shape = safeErrorShape(new Error("boom"));
    expect(shape).toEqual({ name: "Error", message: "boom" });
    expect(safeErrorShape("plain").name).toBe("UnknownError");
  });
});
