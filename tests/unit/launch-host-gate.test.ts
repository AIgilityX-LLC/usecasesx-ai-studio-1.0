import { describe, expect, it } from "vitest";

import { isCanonicalHost, SITE_URL } from "@/lib/seo";

/**
 * Regression: /launch announcement claims must be gated behind the canonical
 * published host on the server (head metadata + JSON-LD render pre-hydration).
 * Before the fix the page announced the launch on preview hosts.
 */
describe("launch host gate", () => {
  const canonicalHost = new URL(SITE_URL).host;

  it("returns true only for the canonical published host", () => {
    expect(isCanonicalHost(canonicalHost)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isCanonicalHost(canonicalHost.toUpperCase())).toBe(true);
  });

  it("rejects preview hosts so launch claims stay gated", () => {
    expect(isCanonicalHost("id-preview--cf64325d-2268-4dc2-8a06-bdfad5cb3a90.lovable.app")).toBe(
      false,
    );
    expect(isCanonicalHost("localhost:8080")).toBe(false);
  });

  it("rejects empty, null and undefined hosts", () => {
    expect(isCanonicalHost("")).toBe(false);
    expect(isCanonicalHost(null)).toBe(false);
    expect(isCanonicalHost(undefined)).toBe(false);
  });

  it("rejects lookalike hosts that only contain the canonical host as a substring", () => {
    expect(isCanonicalHost(`${canonicalHost}.evil.example`)).toBe(false);
    expect(isCanonicalHost(`not-${canonicalHost}`)).toBe(false);
  });
});
