import { describe, expect, test } from "bun:test";
import { assertSafeOutboundUrl } from "@/lib/security/outbound-url";
import { engineUpsertSchema } from "@/lib/ai/engines";
import {
  assertNoForbiddenKeys,
  FORBIDDEN_TENANT_WRITE_KEYS,
  pickAllowed,
} from "@/lib/security/mass-assignment";
import { demoResetAuthorized } from "@/lib/demo/demo-auth";
import { isSensitiveKey, redactRecord } from "@/lib/telemetry/events";

describe("SSRF outbound URL guard", () => {
  test("allows public https providers", () => {
    const d = assertSafeOutboundUrl("https://api.openai.com/v1");
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.href).toContain("https://api.openai.com");
  });

  test("blocks metadata and private hosts", () => {
    expect(assertSafeOutboundUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(assertSafeOutboundUrl("https://127.0.0.1/chat").ok).toBe(false);
    expect(assertSafeOutboundUrl("https://10.0.0.5/v1").ok).toBe(false);
    expect(assertSafeOutboundUrl("https://192.168.1.1/v1").ok).toBe(false);
    expect(assertSafeOutboundUrl("https://metadata.google.internal/").ok).toBe(false);
    expect(assertSafeOutboundUrl("https://localhost/v1").ok).toBe(false);
  });

  test("requires https and rejects credentials in URL", () => {
    expect(assertSafeOutboundUrl("http://api.openai.com/v1").reason).toBe("https_required");
    expect(assertSafeOutboundUrl("https://user:pass@api.openai.com/v1").reason).toBe(
      "credentials_in_url_forbidden",
    );
  });

  test("engine upsert schema rejects private baseUrl", () => {
    expect(() =>
      engineUpsertSchema.parse({
        slug: "evil",
        label: "Evil",
        provider: "custom",
        route: "openai-compatible",
        modelId: "x",
        baseUrl: "https://169.254.169.254/",
        tier: "fast",
        enabled: true,
        allowWorkspaceKeys: false,
        fallbackToDefault: true,
        editions: ["pro"],
      }),
    ).toThrow();
  });
});

describe("demo reset authorization", () => {
  test("never trusts email alone; requires secret + enable in production", () => {
    expect(demoResetAuthorized(undefined)).toBe(false);
    expect(
      demoResetAuthorized("secret", {
        DEMO_PERSONA_PASSWORD: "secret",
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      demoResetAuthorized("secret", {
        DEMO_PERSONA_PASSWORD: "secret",
        NODE_ENV: "production",
        DEMO_RESET_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      demoResetAuthorized("wrong", {
        DEMO_PERSONA_PASSWORD: "secret",
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });
});

describe("mass assignment + redaction", () => {
  test("pickAllowed drops unexpected keys", () => {
    const picked = pickAllowed(
      { name: "Acme", organization_id: "evil", plan: "enterprise" } as Record<string, unknown>,
      ["name"] as const,
    );
    expect(picked).toEqual({ name: "Acme" });
  });

  test("forbidden tenant keys detected", () => {
    expect(
      assertNoForbiddenKeys({ name: "x", organization_id: "y" }, FORBIDDEN_TENANT_WRITE_KEYS).ok,
    ).toBe(false);
  });

  test("redacts ciphertext and bearer material", () => {
    expect(isSensitiveKey("key_ciphertext")).toBe(true);
    expect(isSensitiveKey("client_secret")).toBe(true);
    const redacted = redactRecord({
      key_ciphertext: "AAAA",
      bearer: "tok",
      safe: "ok",
    });
    expect(redacted.key_ciphertext).toBe("[redacted]");
    expect(redacted.bearer).toBe("[redacted]");
    expect(redacted.safe).toBe("ok");
  });
});
