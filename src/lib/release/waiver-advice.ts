/**
 * Waiver advice (pure).
 *
 * A launch waiver is a temporary, named override for missing pilot evidence.
 * It should never outlive the evidence it stands in for, so this module answers
 * two questions from measured counts alone: is a waiver still warranted, and
 * once real evidence exists, should it be retired?
 */

import { PILOT_SEAT_TARGET_MIN } from "@/lib/pilot/pilot.model";

export type WaiverEvidence = {
  /** Active pilot seats. */
  seats: number;
  /** Recorded checkpoint responses across the cohort. */
  checkpointResponses: number;
  /** Completed onboarding intakes across the cohort. */
  onboardingProfiles: number;
};

export type WaiverAdvice = {
  /** True when the measured evidence now covers both pilot gates. */
  evidenceComplete: boolean;
  /** True when a waiver is in force but no longer needed. */
  shouldRetire: boolean;
  /** True when the gates fail and no waiver is standing in for them. */
  shouldGrant: boolean;
  headline: string;
};

export function waiverAdvice(evidence: WaiverEvidence, waiverActive: boolean): WaiverAdvice {
  const seatsOk = evidence.seats >= PILOT_SEAT_TARGET_MIN;
  const evidenceOk = evidence.checkpointResponses > 0;
  const evidenceComplete = seatsOk && evidenceOk;

  if (evidenceComplete) {
    return {
      evidenceComplete: true,
      shouldRetire: waiverActive,
      shouldGrant: false,
      headline: waiverActive
        ? "Real pilot evidence now covers both gates — retire the waiver so the board is evidence-backed."
        : "Both pilot gates are covered by measured evidence. No waiver is needed.",
    };
  }

  const missing: string[] = [];
  if (!seatsOk) missing.push(`${evidence.seats} of ${PILOT_SEAT_TARGET_MIN} seats`);
  if (!evidenceOk) {
    missing.push(
      evidence.onboardingProfiles > 0
        ? `${evidence.onboardingProfiles} intake(s) but no checkpoint responses`
        : "no checkpoint responses",
    );
  }

  return {
    evidenceComplete: false,
    shouldRetire: false,
    shouldGrant: !waiverActive,
    headline: waiverActive
      ? `Waiver in force while evidence is gathered — ${missing.join(", ")}.`
      : `Pilot evidence is short (${missing.join(", ")}). Record an approved waiver to unblock the decision, or enrol the cohort.`,
  };
}
