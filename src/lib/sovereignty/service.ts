/**
 * SovereigntyService — central product facade for the Sovereignty Architecture™.
 *
 * Routes and server functions should call through this module rather than
 * re-interpreting dimension catalogues or inventing maturity claims.
 */

import {
  SOVEREIGNTY_DIMENSIONS,
  SOVEREIGNTY_DIMENSION_IDS,
  isSovereigntyDimensionId,
  sovereigntyDimensionList,
  type SovereigntyDimension,
  type SovereigntyDimensionId,
} from "./dimensions";
import {
  DEFAULT_TARGET_MATURITY,
  canAdvanceMaturity,
  meetsMaturity,
  nextMaturityStep,
  type SovereigntyMaturityLevel,
  type SovereigntyPlanTier,
} from "./maturity";
import {
  assessSovereigntyPosture,
  compareToPlanTargets,
  type SovereigntyPosture,
  type SovereigntySignals,
  type TargetGap,
} from "./posture";
import {
  GRADUAL_EVOLUTION_RULE,
  ZERO_TRUST_MAPPINGS,
  type ZeroTrustMapping,
} from "./zero-trust";

export type SovereigntyServiceApi = {
  dimensions: typeof SOVEREIGNTY_DIMENSIONS;
  dimensionIds: typeof SOVEREIGNTY_DIMENSION_IDS;
  listDimensions: () => SovereigntyDimension[];
  getDimension: (id: SovereigntyDimensionId) => SovereigntyDimension;
  isDimensionId: (value: string) => value is SovereigntyDimensionId;
  assess: (signals: SovereigntySignals, opts?: { now?: Date }) => SovereigntyPosture;
  gapsForTier: (posture: SovereigntyPosture, tier: SovereigntyPlanTier) => TargetGap[];
  targetsForTier: (tier: SovereigntyPlanTier) => Partial<
    Record<SovereigntyDimensionId, SovereigntyMaturityLevel>
  >;
  meets: (actual: SovereigntyMaturityLevel, required: SovereigntyMaturityLevel) => boolean;
  nextStep: (current: SovereigntyMaturityLevel) => SovereigntyMaturityLevel | null;
  canAdvance: typeof canAdvanceMaturity;
  zeroTrust: readonly ZeroTrustMapping[];
  gradualEvolutionRule: string;
  /** Safe public claim: never assert air-gap/sovereign without attested criteria. */
  publicClaimAllowed: (posture: SovereigntyPosture) => {
    allowed: boolean;
    blockedBy: string[];
  };
};

export const SovereigntyService: SovereigntyServiceApi = {
  dimensions: SOVEREIGNTY_DIMENSIONS,
  dimensionIds: SOVEREIGNTY_DIMENSION_IDS,
  listDimensions: sovereigntyDimensionList,
  getDimension: (id) => SOVEREIGNTY_DIMENSIONS[id],
  isDimensionId: isSovereigntyDimensionId,
  assess: assessSovereigntyPosture,
  gapsForTier: compareToPlanTargets,
  targetsForTier: (tier) => DEFAULT_TARGET_MATURITY[tier],
  meets: meetsMaturity,
  nextStep: nextMaturityStep,
  canAdvance: canAdvanceMaturity,
  zeroTrust: ZERO_TRUST_MAPPINGS,
  gradualEvolutionRule: GRADUAL_EVOLUTION_RULE,
  publicClaimAllowed(posture) {
    const blockedBy = [...posture.claimsBlocked];
    const hasSovereign = SOVEREIGNTY_DIMENSION_IDS.some(
      (id) => posture.dimensions[id].level === "sovereign",
    );
    if (hasSovereign && posture.claimsBlocked.length > 0) {
      blockedBy.push("inconsistent_sovereign_claim");
    }
    return { allowed: blockedBy.length === 0 && hasSovereign, blockedBy };
  },
};
