/**
 * Lightweight profile fit — maps stated enterprise requirements to the
 * four deployment profiles. Advisory only; commercial selection is contractual.
 */

import {
  DEPLOYMENT_PROFILE_IDS,
  DEPLOYMENT_PROFILES,
  type DeploymentProfileId,
} from "./profiles";

export type DeploymentRequirements = {
  /** Needs dedicated DB / non-shared tenancy plane. */
  dedicatedEnvironment?: boolean;
  /** Customer cloud account / VPC required. */
  customerVpc?: boolean;
  /** On-prem, private cloud, or disconnected. */
  onPremOrDisconnected?: boolean;
  /** Customer KMS / IAM / logs as hard requirements. */
  customerKeyAndIam?: boolean;
  /** Enterprise SSO / customer IdP required. */
  enterpriseSso?: boolean;
  /** Regulated / public-sector posture. */
  regulatedSector?: boolean;
};

export type ProfileFit = {
  profileId: DeploymentProfileId;
  score: number;
  reasons: string[];
  blockers: string[];
};

const WEIGHTS: Record<keyof DeploymentRequirements, Partial<Record<DeploymentProfileId, number>>> =
  {
    dedicatedEnvironment: {
      cloud_saas: -2,
      dedicated_cloud: 3,
      sovereign_cloud_vpc: 2,
      sovereign_private: 2,
    },
    customerVpc: {
      cloud_saas: -3,
      dedicated_cloud: 0,
      sovereign_cloud_vpc: 4,
      sovereign_private: 2,
    },
    onPremOrDisconnected: {
      cloud_saas: -4,
      dedicated_cloud: -2,
      sovereign_cloud_vpc: 1,
      sovereign_private: 5,
    },
    customerKeyAndIam: {
      cloud_saas: -2,
      dedicated_cloud: 1,
      sovereign_cloud_vpc: 4,
      sovereign_private: 4,
    },
    enterpriseSso: {
      cloud_saas: 0,
      dedicated_cloud: 2,
      sovereign_cloud_vpc: 2,
      sovereign_private: 2,
    },
    regulatedSector: {
      cloud_saas: -1,
      dedicated_cloud: 1,
      sovereign_cloud_vpc: 3,
      sovereign_private: 3,
    },
  };

export function scoreDeploymentFit(reqs: DeploymentRequirements): ProfileFit[] {
  const fits: ProfileFit[] = DEPLOYMENT_PROFILE_IDS.map((id) => ({
    profileId: id,
    score: 0,
    reasons: [] as string[],
    blockers: [] as string[],
  }));

  for (const key of Object.keys(WEIGHTS) as (keyof DeploymentRequirements)[]) {
    if (!reqs[key]) continue;
    const byProfile = WEIGHTS[key];
    for (const fit of fits) {
      const w = byProfile[fit.profileId] ?? 0;
      fit.score += w;
      if (w > 0) fit.reasons.push(key);
      if (w < -2) fit.blockers.push(`profile_weak_for_${key}`);
    }
  }

  // Hard blockers: disconnected requires sovereign_private as primary.
  if (reqs.onPremOrDisconnected) {
    for (const fit of fits) {
      if (fit.profileId !== "sovereign_private") {
        fit.blockers.push("on_prem_or_disconnected_requires_sovereign_private");
        fit.score -= 5;
      }
    }
  }

  return fits.sort((a, b) => b.score - a.score);
}

export function recommendDeploymentProfile(
  reqs: DeploymentRequirements,
): { profileId: DeploymentProfileId; productName: string; alternatives: DeploymentProfileId[] } {
  const ranked = scoreDeploymentFit(reqs);
  const top = ranked[0]!;
  const alternatives = ranked.slice(1, 3).map((f) => f.profileId);
  return {
    profileId: top.profileId,
    productName: DEPLOYMENT_PROFILES[top.profileId].productName,
    alternatives,
  };
}
