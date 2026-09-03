import { describe, expect, it } from "vitest";
import { waiverAdvice } from "@/lib/release/waiver-advice";

describe("waiver advice", () => {
  it("recommends granting a waiver when evidence is short and none is in force", () => {
    const advice = waiverAdvice({ seats: 1, checkpointResponses: 0, onboardingProfiles: 0 }, false);
    expect(advice.shouldGrant).toBe(true);
    expect(advice.shouldRetire).toBe(false);
    expect(advice.evidenceComplete).toBe(false);
    expect(advice.headline).toContain("1 of 15 seats");
  });

  it("does not recommend a second waiver while one is already in force", () => {
    const advice = waiverAdvice({ seats: 3, checkpointResponses: 0, onboardingProfiles: 2 }, true);
    expect(advice.shouldGrant).toBe(false);
    expect(advice.headline).toContain("Waiver in force");
    expect(advice.headline).toContain("no checkpoint responses");
  });

  it("recommends retiring the waiver once seats and checkpoints are real", () => {
    const advice = waiverAdvice(
      { seats: 18, checkpointResponses: 4, onboardingProfiles: 18 },
      true,
    );
    expect(advice.evidenceComplete).toBe(true);
    expect(advice.shouldRetire).toBe(true);
  });

  it("stays quiet when evidence is complete and no waiver exists", () => {
    const advice = waiverAdvice(
      { seats: 20, checkpointResponses: 6, onboardingProfiles: 20 },
      false,
    );
    expect(advice.shouldRetire).toBe(false);
    expect(advice.shouldGrant).toBe(false);
    expect(advice.headline).toContain("No waiver is needed");
  });
});
