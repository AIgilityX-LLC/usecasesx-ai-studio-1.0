import { describe, expect, it } from "bun:test";
import {
  PilotOnboardingSchema,
  aiExperienceLabel,
  availabilityLabel,
  enrollmentFunnel,
  onboardingDefaults,
} from "@/lib/pilot/pilot.onboarding";

const valid = {
  fullName: "Ada Lovelace",
  roleTitle: "Director of Digital",
  organization: "Ministry of Transport",
  sector: "Central government" as const,
  country: "UK",
  teamSize: "6–20" as const,
  aiExperience: "piloting",
  primaryGoal: "Build a defensible shortlist of three use cases for the 2027 budget submission.",
  expectedUseCases: null,
  availability: "1_3h",
  contactConsent: true,
};

describe("pilot onboarding intake", () => {
  it("accepts a complete intake", () => {
    expect(PilotOnboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a goal that says nothing", () => {
    const result = PilotOnboardingSchema.safeParse({ ...valid, primaryGoal: "AI stuff" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing role", () => {
    expect(PilotOnboardingSchema.safeParse({ ...valid, roleTitle: "" }).success).toBe(false);
  });

  it("treats optional fields as omittable", () => {
    const result = PilotOnboardingSchema.safeParse({
      ...valid,
      country: null,
      teamSize: null,
      availability: null,
    });
    expect(result.success).toBe(true);
  });

  it("prefills from the invited seat", () => {
    const defaults = onboardingDefaults({ fullName: "Ada", organization: "Ministry" });
    expect(defaults.fullName).toBe("Ada");
    expect(defaults.organization).toBe("Ministry");
    expect(defaults.contactConsent).toBe(false);
  });

  it("labels vocabulary values and falls back for unknown ones", () => {
    expect(aiExperienceLabel("scaling")).toContain("Scaling");
    expect(availabilityLabel("1_3h")).toBe("1–3 hours");
    expect(availabilityLabel(null)).toBe("—");
  });

  it("counts the enrolment funnel and excludes revoked seats", () => {
    const funnel = enrollmentFunnel(
      [
        { status: "invited", userId: null },
        { status: "registered", userId: "u1" },
        { status: "activated", userId: "u2" },
        { status: "revoked", userId: "u3" },
      ],
      ["u2"],
    );
    expect(funnel).toEqual({ invited: 3, claimed: 2, onboarded: 1, revoked: 1 });
  });
});
