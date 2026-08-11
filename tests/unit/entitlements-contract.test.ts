/**
 * Entitlement contract tests.
 *
 * These lock the commercial rules of the 14 Aug 2026 launch: who qualifies for
 * complimentary Pro Founding Access, what happens the moment it expires, and
 * which modules each tier unlocks. A regression here would either give away
 * paid capability or lock out paying users, so every assertion uses a fixed
 * clock rather than `new Date()`.
 */
import { describe, expect, it } from "bun:test";
import {
  FOUNDING_UNTIL_ISO,
  TIER_RANK,
  USECASEX_MODULES,
  daysUntil,
  effectiveTier,
  emailDomain,
  isEligibleEmail,
  tierLabel,
  tierUnlocks,
  type EntTier,
} from "@/lib/entitlements";
import { FIXED_NOW, daysFrom, entitlement } from "../fixtures/deterministic";

describe("founding access eligibility", () => {
  it("extracts the domain case-insensitively", () => {
    expect(emailDomain("Person@Example.GOV.UK")).toBe("example.gov.uk");
    expect(emailDomain("not-an-email")).toBe("");
  });

  it("accepts organizational domains", () => {
    for (const email of ["a@aigilityx.com", "b@ministry.gov.ae", "c@uni.ac.uk"]) {
      expect(isEligibleEmail(email)).toBe(true);
    }
  });

  it("rejects consumer providers and malformed addresses", () => {
    for (const email of ["a@gmail.com", "b@outlook.com", "c@proton.me", "d@localhost", "nope"]) {
      expect(isEligibleEmail(email)).toBe(false);
    }
  });
});

describe("effective tier resolution", () => {
  it("keeps a paid tier while the entitlement is live", () => {
    const ent = entitlement();
    expect(effectiveTier(ent.tier, ent.expiresAt, FIXED_NOW)).toBe("pro");
  });

  it("falls back to lite the moment founding access lapses", () => {
    const justAfter = daysFrom(new Date(FOUNDING_UNTIL_ISO), 1);
    expect(effectiveTier("pro", FOUNDING_UNTIL_ISO, justAfter)).toBe("lite");
    expect(effectiveTier("enterprise", FOUNDING_UNTIL_ISO, justAfter)).toBe("lite");
  });

  it("treats a missing or unparseable expiry as non-expiring", () => {
    expect(effectiveTier("pro", null, FIXED_NOW)).toBe("pro");
    expect(effectiveTier("pro", "not-a-date", FIXED_NOW)).toBe("pro");
  });

  it("never upgrades a lite account", () => {
    expect(effectiveTier("lite", FOUNDING_UNTIL_ISO, FIXED_NOW)).toBe("lite");
  });

  it("counts remaining days inclusively and goes negative after expiry", () => {
    expect(daysUntil(daysFrom(FIXED_NOW, 10).toISOString(), FIXED_NOW)).toBe(10);
    expect(daysUntil(null, FIXED_NOW)).toBeNull();
    expect(daysUntil(daysFrom(FIXED_NOW, -3).toISOString(), FIXED_NOW)).toBeLessThan(0);
  });
});

describe("tier gating", () => {
  const tiers: EntTier[] = ["lite", "pro", "enterprise"];

  it("is monotonic — a higher tier unlocks everything below it", () => {
    for (const tier of tiers) {
      for (const required of tiers) {
        expect(tierUnlocks(tier, required)).toBe(TIER_RANK[tier] >= TIER_RANK[required]);
      }
    }
  });

  it("keeps Pro modules locked for lite and Enterprise modules locked for Pro", () => {
    const pro = USECASEX_MODULES.filter((m) => m.required === "pro");
    const ent = USECASEX_MODULES.filter((m) => m.required === "enterprise");
    expect(pro.length).toBeGreaterThan(0);
    expect(ent.length).toBeGreaterThan(0);
    for (const m of pro) expect(tierUnlocks("lite", m.required)).toBe(false);
    for (const m of ent) expect(tierUnlocks("pro", m.required)).toBe(false);
    for (const m of USECASEX_MODULES) expect(tierUnlocks("enterprise", m.required)).toBe(true);
  });

  it("labels tiers for the UI without leaking internal keys", () => {
    expect(tierLabel("lite")).toBe("Lite");
    expect(tierLabel("pro")).toBe("Pro");
    expect(tierLabel("enterprise")).toBe("Enterprise");
  });
});
