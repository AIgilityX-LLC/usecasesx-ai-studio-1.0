/**
 * NIST Zero Trust alignment for UseCasesX Sovereignty Architecture™.
 *
 * Guidance moves trust decisions away from network location toward users,
 * resources, identities, and continuous authorization — and recommends
 * gradual evolution rather than wholesale replacement of existing architecture.
 */

import type { SovereigntyDimensionId } from "./dimensions";

export const ZERO_TRUST_PILLARS = [
  "users",
  "resources",
  "identities",
  "continuous_authorization",
] as const;

export type ZeroTrustPillar = (typeof ZERO_TRUST_PILLARS)[number];

export type ZeroTrustMapping = {
  pillar: ZeroTrustPillar;
  principle: string;
  /** Sovereignty dimensions that primarily serve this pillar. */
  dimensions: readonly SovereigntyDimensionId[];
  /** Existing product enforcement seam. */
  enforcement: string;
};

export const ZERO_TRUST_MAPPINGS: readonly ZeroTrustMapping[] = [
  {
    pillar: "users",
    principle: "Authenticate every actor; never trust network location alone.",
    dimensions: ["identity", "operational"],
    enforcement: "Supabase Auth + org SSO; support grants without impersonation",
  },
  {
    pillar: "resources",
    principle: "Protect data and AI resources by classification, residency, and allow-lists.",
    dimensions: ["data", "ai", "cryptographic", "infrastructure"],
    enforcement: "tenant-policy · RLS · evidence confidentiality · AI route allow-list",
  },
  {
    pillar: "identities",
    principle: "Customer IdP and workspace roles are authoritative for who may act.",
    dimensions: ["identity"],
    enforcement: "organization_sso_configs · user_roles · has_role()",
  },
  {
    pillar: "continuous_authorization",
    principle: "Authorize per request/session against membership, entitlements, and policy.",
    dimensions: ["operational", "audit", "exit"],
    enforcement: "requireSupabaseAuth · entitlements · append-only audit · export receipts",
  },
] as const;

/** Product rule: evolve one maturity step at a time (see maturity.canAdvanceMaturity). */
export const GRADUAL_EVOLUTION_RULE =
  "Sovereignty and Zero Trust controls advance one maturity level at a time. Do not replace the running architecture wholesale to claim a higher posture.";
