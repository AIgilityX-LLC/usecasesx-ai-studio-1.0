/**
 * Sovereignty posture assessment — product signals → per-dimension maturity.
 *
 * Pure. Call sites supply declared/enforced facts from tenant policy, SSO,
 * support grants, AI routes, and export/audit availability. Never invents
 * a “sovereign” level without exit-criteria evidence.
 */

import {
  SOVEREIGNTY_DIMENSION_IDS,
  type SovereigntyDimensionId,
} from "./dimensions";
import {
  DEFAULT_TARGET_MATURITY,
  meetsMaturity,
  type SovereigntyMaturityLevel,
  type SovereigntyPlanTier,
} from "./maturity";

export type SovereigntySignals = {
  /** Tenant data_region other than unspecified. */
  dataRegionDeclared: boolean;
  /** Region is private or airgap_reserved (still declaration-only). */
  dataRegionPrivateOrAirgap: boolean;
  /** AI provider allow-list is set and enforced at call sites. */
  aiProviderAllowlistEnforced: boolean;
  /** Workspace or local AI route configured (customer-chosen provider). */
  customerAiProviderConfigured: boolean;
  /** Org SSO enabled against customer IdP. */
  customerIdpEnabled: boolean;
  /** Workspace-owned provider keys allowed/used. */
  workspaceKeysEnabled: boolean;
  /** Platform envelope encryption for stored keys is active. */
  engineKeyEncryptionConfigured: boolean;
  /** Support access model in use (time-bound, no impersonation). */
  supportAccessControlsEnforced: boolean;
  /** Append-only audit + export receipts available to the tenant. */
  auditExportAvailable: boolean;
  /** Documented workspace/portfolio/report export paths usable. */
  exitExportAvailable: boolean;
  /**
   * Operator-attested evidence that private/air-gap exit criteria passed.
   * Must never be set from UI preference alone.
   */
  sovereignExitCriteriaAttested?: boolean;
};

export type DimensionPosture = {
  dimension: SovereigntyDimensionId;
  level: SovereigntyMaturityLevel;
  gaps: string[];
};

export type SovereigntyPosture = {
  assessedAt: string;
  dimensions: Record<SovereigntyDimensionId, DimensionPosture>;
  /** Lowest non-NA maturity across dimensions (for roll-up badges). */
  floor: SovereigntyMaturityLevel;
  claimsBlocked: string[];
};

function assessData(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  if (!s.dataRegionDeclared) gaps.push("declare_data_region");
  if (s.dataRegionPrivateOrAirgap && !s.sovereignExitCriteriaAttested) {
    gaps.push("private_airgap_not_yet_operational");
  }
  let level: SovereigntyMaturityLevel = "not_applicable";
  if (s.dataRegionDeclared) level = "declared";
  if (s.dataRegionDeclared && s.auditExportAvailable) level = "enforced";
  if (s.dataRegionDeclared && s.dataRegionPrivateOrAirgap && s.sovereignExitCriteriaAttested) {
    level = "customer_controlled";
  }
  return { dimension: "data", level, gaps };
}

function assessInfrastructure(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  let level: SovereigntyMaturityLevel = "not_applicable";
  if (s.dataRegionDeclared) level = "declared";
  if (s.dataRegionPrivateOrAirgap) {
    level = "declared";
    gaps.push("regional_private_pack_not_deployed");
  }
  if (s.sovereignExitCriteriaAttested && s.dataRegionPrivateOrAirgap) {
    level = "customer_controlled";
    gaps.length = 0;
  }
  return { dimension: "infrastructure", level, gaps };
}

function assessIdentity(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  let level: SovereigntyMaturityLevel = "declared";
  if (!s.customerIdpEnabled) {
    gaps.push("enable_customer_idp_sso");
  } else {
    level = "customer_controlled";
  }
  return { dimension: "identity", level, gaps };
}

function assessCryptographic(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  let level: SovereigntyMaturityLevel = "not_applicable";
  if (s.engineKeyEncryptionConfigured) level = "enforced";
  else gaps.push("configure_engine_key_encryption");
  if (s.workspaceKeysEnabled) level = "customer_controlled";
  else if (s.engineKeyEncryptionConfigured) gaps.push("optional_workspace_keys_not_enabled");
  return { dimension: "cryptographic", level, gaps };
}

function assessAi(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  let level: SovereigntyMaturityLevel = "declared";
  if (s.aiProviderAllowlistEnforced) level = "enforced";
  else gaps.push("enforce_ai_provider_allowlist");
  if (s.customerAiProviderConfigured && s.aiProviderAllowlistEnforced) {
    level = "customer_controlled";
  } else if (s.aiProviderAllowlistEnforced) {
    gaps.push("customer_ai_provider_not_configured");
  }
  return { dimension: "ai", level, gaps };
}

function assessOperational(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  let level: SovereigntyMaturityLevel = "declared";
  if (s.supportAccessControlsEnforced) level = "customer_controlled";
  else gaps.push("enable_support_access_controls");
  return { dimension: "operational", level, gaps };
}

function assessAudit(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  let level: SovereigntyMaturityLevel = "declared";
  if (s.auditExportAvailable) level = "customer_controlled";
  else gaps.push("enable_audit_export");
  return { dimension: "audit", level, gaps };
}

function assessExit(s: SovereigntySignals): DimensionPosture {
  const gaps: string[] = [];
  let level: SovereigntyMaturityLevel = "declared";
  if (s.exitExportAvailable) level = "enforced";
  else gaps.push("enable_workspace_exports");
  if (s.exitExportAvailable && s.sovereignExitCriteriaAttested) {
    level = "customer_controlled";
  }
  return { dimension: "exit", level, gaps };
}

const ASSESSORS: Record<SovereigntyDimensionId, (s: SovereigntySignals) => DimensionPosture> = {
  data: assessData,
  infrastructure: assessInfrastructure,
  identity: assessIdentity,
  cryptographic: assessCryptographic,
  ai: assessAi,
  operational: assessOperational,
  audit: assessAudit,
  exit: assessExit,
};

const FLOOR_ORDER: SovereigntyMaturityLevel[] = [
  "sovereign",
  "customer_controlled",
  "enforced",
  "declared",
  "not_applicable",
];

function computeFloor(
  dims: Record<SovereigntyDimensionId, DimensionPosture>,
): SovereigntyMaturityLevel {
  let worst: SovereigntyMaturityLevel = "sovereign";
  for (const id of SOVEREIGNTY_DIMENSION_IDS) {
    const level = dims[id].level;
    if (level === "not_applicable") continue;
    if (FLOOR_ORDER.indexOf(level) > FLOOR_ORDER.indexOf(worst)) worst = level;
  }
  if (worst === "sovereign" && SOVEREIGNTY_DIMENSION_IDS.every((id) => dims[id].level === "not_applicable")) {
    return "not_applicable";
  }
  return worst;
}

/**
 * Assess tenant sovereignty posture from product signals.
 * Never returns `sovereign` unless `sovereignExitCriteriaAttested` is true
 * AND every dimension already meets `customer_controlled`.
 */
export function assessSovereigntyPosture(
  signals: SovereigntySignals,
  opts?: { now?: Date },
): SovereigntyPosture {
  const dimensions = {} as Record<SovereigntyDimensionId, DimensionPosture>;
  for (const id of SOVEREIGNTY_DIMENSION_IDS) {
    dimensions[id] = ASSESSORS[id](signals);
  }

  const claimsBlocked: string[] = [];
  const allCustomer =
    signals.sovereignExitCriteriaAttested === true &&
    SOVEREIGNTY_DIMENSION_IDS.every((id) => {
      const level = dimensions[id].level;
      return level === "not_applicable" || meetsMaturity(level, "customer_controlled");
    });

  if (signals.sovereignExitCriteriaAttested && allCustomer) {
    for (const id of SOVEREIGNTY_DIMENSION_IDS) {
      if (dimensions[id].level === "customer_controlled") {
        dimensions[id] = { ...dimensions[id], level: "sovereign", gaps: [] };
      }
    }
  } else if (signals.dataRegionPrivateOrAirgap) {
    claimsBlocked.push("do_not_claim_airgap_or_private_cloud_support");
  }

  if (!signals.sovereignExitCriteriaAttested) {
    claimsBlocked.push("sovereign_maturity_requires_attested_exit_criteria");
  }

  return {
    assessedAt: (opts?.now ?? new Date()).toISOString(),
    dimensions,
    floor: computeFloor(dimensions),
    claimsBlocked,
  };
}

export type TargetGap = {
  dimension: SovereigntyDimensionId;
  actual: SovereigntyMaturityLevel;
  target: SovereigntyMaturityLevel;
  met: boolean;
};

export function compareToPlanTargets(
  posture: SovereigntyPosture,
  tier: SovereigntyPlanTier,
): TargetGap[] {
  const targets = DEFAULT_TARGET_MATURITY[tier];
  const gaps: TargetGap[] = [];
  for (const id of SOVEREIGNTY_DIMENSION_IDS) {
    const target = targets[id];
    if (!target) continue;
    const actual = posture.dimensions[id].level;
    gaps.push({
      dimension: id,
      actual,
      target,
      met: meetsMaturity(actual, target),
    });
  }
  return gaps;
}
