/**
 * Gradual sovereignty maturity — NIST Zero Trust style evolution.
 *
 * Trust decisions move from network location toward users, resources,
 * identities, and continuous authorization. Dimensions advance one level
 * at a time; wholesale “sovereign overnight” claims are rejected.
 */

import type { SovereigntyDimensionId } from "./dimensions";

export const SOVEREIGNTY_MATURITY_LEVELS = [
  /** Control not relevant for this plan/tier. */
  "not_applicable",
  /** Preference recorded; not yet enforced at runtime. */
  "declared",
  /** Product enforces the control on the default platform. */
  "enforced",
  /** Customer supplies IdP / keys / provider / region binding. */
  "customer_controlled",
  /** Private / air-gapped / full customer custody — claim only when exit criteria pass. */
  "sovereign",
] as const;

export type SovereigntyMaturityLevel = (typeof SOVEREIGNTY_MATURITY_LEVELS)[number];

const RANK: Record<SovereigntyMaturityLevel, number> = {
  not_applicable: 0,
  declared: 1,
  enforced: 2,
  customer_controlled: 3,
  sovereign: 4,
};

export function maturityRank(level: SovereigntyMaturityLevel): number {
  return RANK[level];
}

export function meetsMaturity(
  actual: SovereigntyMaturityLevel,
  required: SovereigntyMaturityLevel,
): boolean {
  if (required === "not_applicable") return true;
  if (actual === "not_applicable") return false;
  return RANK[actual] >= RANK[required];
}

/**
 * Next allowed step. Jumping more than one level is a policy error —
 * sovereignty is evolved, not wholesale-replaced.
 */
export function nextMaturityStep(
  current: SovereigntyMaturityLevel,
): SovereigntyMaturityLevel | null {
  const i = SOVEREIGNTY_MATURITY_LEVELS.indexOf(current);
  if (i < 0 || i >= SOVEREIGNTY_MATURITY_LEVELS.length - 1) return null;
  return SOVEREIGNTY_MATURITY_LEVELS[i + 1]!;
}

export function canAdvanceMaturity(
  from: SovereigntyMaturityLevel,
  to: SovereigntyMaturityLevel,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: true };
  if (to === "not_applicable") {
    return { ok: false, reason: "cannot_regress_to_not_applicable" };
  }
  const delta = RANK[to] - RANK[from];
  if (delta < 0) return { ok: false, reason: "maturity_regression_requires_change_control" };
  if (delta > 1) {
    return {
      ok: false,
      reason: "gradual_evolution_only",
    };
  }
  if (to === "sovereign") {
    return {
      ok: false,
      reason: "sovereign_requires_exit_criteria_evidence",
    };
  }
  return { ok: true };
}

/** Default target maturity by commercial plan — aspirational product contract. */
export type SovereigntyPlanTier = "lite" | "pro" | "enterprise" | "sovereign";

export const DEFAULT_TARGET_MATURITY: Record<
  SovereigntyPlanTier,
  Partial<Record<SovereigntyDimensionId, SovereigntyMaturityLevel>>
> = {
  lite: {
    data: "declared",
    ai: "enforced",
    audit: "enforced",
    exit: "enforced",
  },
  pro: {
    data: "enforced",
    identity: "declared",
    ai: "enforced",
    operational: "enforced",
    audit: "enforced",
    exit: "enforced",
    cryptographic: "declared",
  },
  enterprise: {
    data: "customer_controlled",
    infrastructure: "declared",
    identity: "customer_controlled",
    cryptographic: "enforced",
    ai: "customer_controlled",
    operational: "customer_controlled",
    audit: "customer_controlled",
    exit: "customer_controlled",
  },
  sovereign: {
    data: "customer_controlled",
    infrastructure: "customer_controlled",
    identity: "customer_controlled",
    cryptographic: "customer_controlled",
    ai: "customer_controlled",
    operational: "customer_controlled",
    audit: "customer_controlled",
    exit: "customer_controlled",
  },
};
