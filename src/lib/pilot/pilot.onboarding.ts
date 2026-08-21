/**
 * Pilot onboarding intake — client-safe schema, vocabulary and pure helpers.
 *
 * A participant claims a seat with an invitation link, then completes this short
 * intake so the cohort report knows who is actually in the room: their role,
 * sector, experience and the outcome they came for. Completing it is what moves
 * a seat from "registered" to "activated" — no self-reported status.
 */

import { z } from "zod";

export const PILOT_SECTORS = [
  "Central government",
  "Regional or local government",
  "Defence and security",
  "Healthcare",
  "Education and research",
  "Financial services",
  "Energy and utilities",
  "Transport and logistics",
  "Manufacturing and industry",
  "Telecommunications and media",
  "Professional services",
  "Other",
] as const;

export const PILOT_AI_EXPERIENCE = [
  { value: "exploring", label: "Exploring — no AI in production yet" },
  { value: "piloting", label: "Piloting — one or two experiments running" },
  { value: "scaling", label: "Scaling — AI in production, expanding" },
  { value: "governing", label: "Governing — portfolio and assurance in place" },
] as const;

export const PILOT_TEAM_SIZES = ["Just me", "2–5", "6–20", "21–100", "100+"] as const;

export const PILOT_AVAILABILITY = [
  { value: "under_1h", label: "Under 1 hour" },
  { value: "1_3h", label: "1–3 hours" },
  { value: "3_6h", label: "3–6 hours" },
  { value: "over_6h", label: "More than 6 hours" },
] as const;

export const PilotOnboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  roleTitle: z.string().trim().min(2, "Enter your role or job title.").max(140),
  organization: z.string().trim().min(2, "Enter your organisation.").max(160),
  sector: z.enum(PILOT_SECTORS, { message: "Choose the sector you work in." }),
  country: z.string().trim().max(80).nullable().optional(),
  teamSize: z.enum(PILOT_TEAM_SIZES).nullable().optional(),
  aiExperience: z.enum(PILOT_AI_EXPERIENCE.map((o) => o.value) as [string, ...string[]], {
    message: "Choose where your organisation is with AI today.",
  }),
  primaryGoal: z
    .string()
    .trim()
    .min(20, "Tell us in a sentence or two what you want out of the pilot.")
    .max(1000),
  expectedUseCases: z.string().trim().max(1000).nullable().optional(),
  availability: z
    .enum(PILOT_AVAILABILITY.map((o) => o.value) as [string, ...string[]])
    .nullable()
    .optional(),
  contactConsent: z.boolean().default(false),
});

export type PilotOnboardingInput = z.infer<typeof PilotOnboardingSchema>;

export type PilotOnboardingProfile = PilotOnboardingInput & {
  id: string;
  cohort: string;
  invitationId: string | null;
  completedAt: string;
  updatedAt: string;
};

export function aiExperienceLabel(value: string | null | undefined): string {
  return PILOT_AI_EXPERIENCE.find((o) => o.value === value)?.label ?? value ?? "—";
}

export function availabilityLabel(value: string | null | undefined): string {
  return PILOT_AVAILABILITY.find((o) => o.value === value)?.label ?? value ?? "—";
}

/** Prefill values for a first-time intake, from the seat we already hold. */
export function onboardingDefaults(seed: {
  fullName?: string | null;
  organization?: string | null;
}): PilotOnboardingInput {
  return {
    fullName: seed.fullName ?? "",
    roleTitle: "",
    organization: seed.organization ?? "",
    sector: "Central government",
    country: null,
    teamSize: null,
    aiExperience: "exploring",
    primaryGoal: "",
    expectedUseCases: null,
    availability: null,
    contactConsent: false,
  };
}

/** Enrollment funnel for the cohort view: invited → claimed → onboarded. */
export function enrollmentFunnel(
  rows: readonly { status: string; userId: string | null }[],
  onboardedUserIds: readonly string[],
): { invited: number; claimed: number; onboarded: number; revoked: number } {
  const active = rows.filter((r) => r.status !== "revoked");
  const onboarded = new Set(onboardedUserIds);
  return {
    invited: active.length,
    claimed: active.filter((r) => Boolean(r.userId)).length,
    onboarded: active.filter((r) => r.userId && onboarded.has(r.userId)).length,
    revoked: rows.length - active.length,
  };
}
