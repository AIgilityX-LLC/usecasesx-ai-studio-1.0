/**
 * DeploymentProfileService — facade for the four UseCasesX deployment profiles.
 */

import { meetsMaturity, type SovereigntyMaturityLevel } from "@/lib/sovereignty/maturity";
import type { SovereigntyDimensionId } from "@/lib/sovereignty/dimensions";
import type { SovereigntyPosture } from "@/lib/sovereignty/posture";
import {
  recommendDeploymentProfile,
  scoreDeploymentFit,
  type DeploymentRequirements,
  type ProfileFit,
} from "./fit";
import {
  BACKEND_OPTIONS,
  SELF_HOST_IS_OPTION_NOT_ARCHITECTURE,
  backendsForProfile,
  customerOwnsFullOps,
  type BackendOption,
  type BackendOptionId,
} from "./operator-responsibility";
import {
  DEPLOYMENT_PROFILES,
  DEPLOYMENT_PROFILE_IDS,
  deploymentProfileList,
  isDeploymentProfileId,
  type DeploymentProfile,
  type DeploymentProfileId,
} from "./profiles";

export type ProfileReadinessGap = {
  dimension: SovereigntyDimensionId;
  actual: SovereigntyMaturityLevel;
  target: SovereigntyMaturityLevel;
  met: boolean;
};

export type DeploymentProfileServiceApi = {
  profiles: typeof DEPLOYMENT_PROFILES;
  profileIds: typeof DEPLOYMENT_PROFILE_IDS;
  list: () => DeploymentProfile[];
  get: (id: DeploymentProfileId) => DeploymentProfile;
  isProfileId: (value: string) => value is DeploymentProfileId;
  scoreFit: (reqs: DeploymentRequirements) => ProfileFit[];
  recommend: (reqs: DeploymentRequirements) => ReturnType<typeof recommendDeploymentProfile>;
  backendsFor: (id: DeploymentProfileId) => BackendOption[];
  backend: (id: BackendOptionId) => BackendOption;
  customerOwnsFullOps: (backendId: BackendOptionId) => boolean;
  selfHostIsOptionNotArchitecture: string;
  /**
   * Compare an assessed sovereignty posture to the profile's target maturity.
   * Does not invent delivery — readiness ≠ sold/attested.
   */
  readinessGaps: (
    profileId: DeploymentProfileId,
    posture: SovereigntyPosture,
  ) => ProfileReadinessGap[];
  /** Public claim gate for naming a sold profile as live for a tenant. */
  mayClaimProfileLive: (
    profileId: DeploymentProfileId,
    opts: { contractuallySelected: boolean; sovereigntyAttestedForProfile: boolean },
  ) => { allowed: boolean; blockedBy: string[] };
};

export const DeploymentProfileService: DeploymentProfileServiceApi = {
  profiles: DEPLOYMENT_PROFILES,
  profileIds: DEPLOYMENT_PROFILE_IDS,
  list: deploymentProfileList,
  get: (id) => DEPLOYMENT_PROFILES[id],
  isProfileId: isDeploymentProfileId,
  scoreFit: scoreDeploymentFit,
  recommend: recommendDeploymentProfile,
  backendsFor: backendsForProfile,
  backend: (id) => BACKEND_OPTIONS[id],
  customerOwnsFullOps,
  selfHostIsOptionNotArchitecture: SELF_HOST_IS_OPTION_NOT_ARCHITECTURE,
  readinessGaps(profileId, posture) {
    const targets = DEPLOYMENT_PROFILES[profileId].sovereigntyTargets;
    const gaps: ProfileReadinessGap[] = [];
    for (const [dimension, target] of Object.entries(targets) as [
      SovereigntyDimensionId,
      SovereigntyMaturityLevel,
    ][]) {
      const actual = posture.dimensions[dimension].level;
      gaps.push({
        dimension,
        actual,
        target,
        met: meetsMaturity(actual, target),
      });
    }
    return gaps;
  },
  mayClaimProfileLive(profileId, opts) {
    const blockedBy: string[] = [];
    if (!opts.contractuallySelected) blockedBy.push("profile_not_contractually_selected");
    if (
      (profileId === "sovereign_cloud_vpc" || profileId === "sovereign_private") &&
      !opts.sovereigntyAttestedForProfile
    ) {
      blockedBy.push("sovereign_profile_requires_attested_exit_criteria");
    }
    return { allowed: blockedBy.length === 0, blockedBy };
  },
};
