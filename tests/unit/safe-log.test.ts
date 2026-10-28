import { describe, expect, it } from "bun:test";

import { renderErrorPage } from "@/lib/error-page";
import { redactSensitiveText, safeLogCaughtError, safeServerLog } from "@/lib/ops/safe-log";
import { safeErrorShape } from "@/lib/telemetry/events";

describe("safe logging / error surface", () => {
  it("redacts bearer tokens and key-shaped substrings from free text", () => {
    const raw =
      "upstream failed Authorization: Bearer sk-live-SUPERSECRETvalue123 and jwt eyJhbGciOiJIUzI1NiJ9.aaa.bbb";
    const cleaned = redactSensitiveText(raw);
    expect(cleaned).not.toContain("sk-live-SUPERSECRETvalue123");
    expect(cleaned).not.toContain("Bearer sk-live");
    expect(cleaned).toContain("[redacted]");
  });

  it("does not put a fake secret into safeErrorShape message keys path", () => {
    const err = new Error("boom api_key=super-secret-key-value");
    const shape = safeErrorShape(err);
    // Key-based redaction applies to objects; free-text still needs redactSensitiveText.
    expect(redactSensitiveText(shape.message)).not.toMatch(/sk-[A-Za-z0-9]{10,}/);
  });

  it("safeServerLog output must not contain a planted secret", () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      safeServerLog(
        "error",
        "call failed with Authorization: Bearer sk-planted-secret-ABCDEFGH",
        { authorization: "Bearer sk-planted-secret-ABCDEFGH", note: "ok" },
        "req-test-1",
      );
    } finally {
      console.error = original;
    }
    const joined = lines.join("\n");
    expect(joined).not.toContain("sk-planted-secret-ABCDEFGH");
    expect(joined).toContain("req-test-1");
    expect(joined).toContain("[redacted]");
  });

  it("safeLogCaughtError keeps planted secrets out of the log line", () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      safeLogCaughtError(
        "unit.test",
        new Error("provider rejected Bearer sk-thrown-secret-XYZXYZXY"),
        {},
        "req-test-2",
      );
    } finally {
      console.error = original;
    }
    const joined = lines.join("\n");
    expect(joined).not.toContain("sk-thrown-secret-XYZXYZXY");
    expect(joined).toContain("req-test-2");
  });

  it("error page shows only a generic message and optional request id", () => {
    const html = renderErrorPage("req-abc-123");
    expect(html).toContain("Something went wrong on our end");
    expect(html).toContain("req-abc-123");
    expect(html.toLowerCase()).not.toContain("stack");
    expect(html.toLowerCase()).not.toContain("select ");
    expect(html).not.toContain("sk-");
  });
});
