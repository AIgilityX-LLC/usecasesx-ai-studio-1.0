import { describe, expect, it } from "vitest";
import {
  PLATFORM_PASSWORD_MAX_AGE_DAYS,
  describeSignInError,
  generatePlatformPassword,
  passwordRotationState,
  validatePlatformPassword,
  validateSignInForm,
} from "@/lib/admin/password-policy";

describe("platform password policy", () => {
  it("rejects short, low-variety and product-name passwords", () => {
    expect(validatePlatformPassword("Short1!").ok).toBe(false);
    expect(validatePlatformPassword("alllowercase-forever").ok).toBe(false);
    expect(validatePlatformPassword("UseCasesX-Admin-99!").ok).toBe(false);
    expect(validatePlatformPassword("Aaaa1111!!!!bbbb").ok).toBe(false);
  });

  it("rejects a password reusing the email local part", () => {
    const result = validatePlatformPassword("Khurrum-Rocks-92!", {
      email: "khurrum.ghori@gmail.com",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("email");
  });

  it("accepts a compliant password and reports a mismatch on confirm", () => {
    const good = "Tf9-quartz-Vale7x";
    expect(validatePlatformPassword(good).ok).toBe(true);
    expect(validatePlatformPassword(good, { confirm: "different" }).ok).toBe(false);
    expect(validatePlatformPassword(good, { confirm: good }).ok).toBe(true);
  });

  it("generates passwords that satisfy its own policy", () => {
    for (let i = 0; i < 25; i += 1) {
      expect(validatePlatformPassword(generatePlatformPassword()).ok).toBe(true);
    }
  });

  it("treats an unrecorded rotation date as unknown, never current", () => {
    expect(passwordRotationState(null).status).toBe("unknown");
    expect(passwordRotationState("not-a-date").status).toBe("unknown");
  });

  it("moves through current, due-soon and overdue as a credential ages", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    const daysAgo = (days: number) =>
      new Date(now.getTime() - days * 86_400_000).toISOString();
    expect(passwordRotationState(daysAgo(1), now).status).toBe("current");
    expect(passwordRotationState(daysAgo(PLATFORM_PASSWORD_MAX_AGE_DAYS - 5), now).status).toBe(
      "due-soon",
    );
    const overdue = passwordRotationState(daysAgo(PLATFORM_PASSWORD_MAX_AGE_DAYS + 3), now);
    expect(overdue.status).toBe("overdue");
    expect(overdue.daysRemaining).toBeLessThan(0);
  });
});

describe("sign-in validation messages", () => {
  it("flags missing and malformed input before submitting", () => {
    expect(validateSignInForm("", "")).toHaveLength(2);
    expect(validateSignInForm("nope", "secret")[0]).toContain("formatted");
    expect(validateSignInForm("a@b.co", "secret")).toEqual([]);
  });

  it("never reveals whether an address exists", () => {
    const message = describeSignInError(new Error("Invalid login credentials"));
    expect(message).toContain("not recognised");
    expect(message.toLowerCase()).not.toContain("no user");
  });

  it("explains disabled accounts and rate limits", () => {
    expect(describeSignInError(new Error("User is banned"))).toContain("disabled");
    expect(describeSignInError(new Error("Too many requests"))).toContain("Too many attempts");
    expect(describeSignInError(new Error("Current password required"))).toContain(
      "current password",
    );
  });
});
