import { describe, expect, it } from "vitest";
import { isUnauthorizedError, signInHref } from "@/lib/auth-errors";

describe("isUnauthorizedError", () => {
  it("recognises the server-function unauthorized envelope", () => {
    expect(isUnauthorizedError(new Error("Unauthorized: No authorization header provided"))).toBe(
      true,
    );
    expect(isUnauthorizedError("jwt expired")).toBe(true);
  });

  it("does not swallow ordinary failures", () => {
    expect(isUnauthorizedError(new Error("duplicate key value"))).toBe(false);
    expect(isUnauthorizedError(null)).toBe(false);
  });
});

describe("signInHref", () => {
  it("round-trips a safe internal redirect", () => {
    expect(signInHref("/opportunities/new")).toBe("/auth?redirect=%2Fopportunities%2Fnew");
  });

  it("rejects protocol-relative targets", () => {
    expect(signInHref("//evil.example")).toBe("/auth?redirect=%2F");
  });
});
