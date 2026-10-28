import { describe, expect, it } from "bun:test";

import { assertNotProductionTarget } from "../../scripts/recovery/lib/prod-guard.mjs";

describe("recovery prod guard", () => {
  it("rejects empty URL", () => {
    expect(() => assertNotProductionTarget("", undefined)).toThrow(/SUPABASE_URL is required/);
  });

  it("rejects when URL contains production project ref", () => {
    expect(() =>
      assertNotProductionTarget("https://abcdefghijklmnop.supabase.co", "abcdefghijklmnop"),
    ).toThrow(/PRODUCTION_SUPABASE_PROJECT_REF/);
  });

  it("allows a clearly non-matching test URL", () => {
    expect(() =>
      assertNotProductionTarget("https://testprojectref123.supabase.co", "prodprojectref456"),
    ).not.toThrow();
  });
});
