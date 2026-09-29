/**
 * Canonical V2 lifecycle states (SRS §6).
 * Pure module — no React, no Supabase. Safe for client + server + tests.
 */

export const CANONICAL_STATES = [
  "idea",
  "triage",
  "designing",
  "review_ready",
  "under_review",
  "approved_pilot",
  "on_hold",
  "rejected",
  "pilot",
  "approved_scale",
  "production",
  "measuring",
  "retired",
  "archived",
] as const;

export type CanonicalState = (typeof CANONICAL_STATES)[number];

export const CANONICAL_STATE_LABEL: Record<CanonicalState, string> = {
  idea: "Idea",
  triage: "Triage",
  designing: "Designing",
  review_ready: "Review ready",
  under_review: "Under review",
  approved_pilot: "Approved for pilot",
  on_hold: "On hold",
  rejected: "Rejected",
  pilot: "Pilot",
  approved_scale: "Approved to scale",
  production: "Production",
  measuring: "Measuring",
  retired: "Retired",
  archived: "Archived",
};

/** Journey stages that map onto the canonical state machine (SRS §6 narrative). */
export const JOURNEY_STAGES = [
  "Discover",
  "Capture",
  "Design",
  "Evidence",
  "Score",
  "Review",
  "Prioritize",
  "Approve/Hold/Reject",
  "Roadmap",
  "Deliver",
  "Measure",
  "Scale/Retire",
] as const;

export function isCanonicalState(value: string): value is CanonicalState {
  return (CANONICAL_STATES as readonly string[]).includes(value);
}
