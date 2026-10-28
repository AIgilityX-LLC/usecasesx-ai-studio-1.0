/**
 * Configurable sovereignty vocabulary.
 *
 * Region / provider / classification codes are opaque product tokens —
 * never encode jurisdiction-specific statutes in business logic. Legal
 * mapping (which law applies to which code) belongs in customer policy
 * packs or advisory docs, not in evaluators.
 */

/** Built-in region tokens; tenants may also use custom string codes via packs. */
export const BUILTIN_REGION_CODES = [
  "unspecified",
  "eu",
  "us",
  "me",
  "apac",
  "private",
  "airgap_reserved",
] as const;

export type BuiltinRegionCode = (typeof BUILTIN_REGION_CODES)[number];

/** Opaque residency / processing region — builtin or customer-defined. */
export type RegionCode = BuiltinRegionCode | (string & {});

export const DATA_CLASSIFICATIONS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export const CROSS_BORDER_MODES = [
  /** No cross-border rule configured. */
  "unrestricted",
  /** Transfers only among permittedRegions. */
  "permit_list_only",
  /** Transfers denied when target is in prohibitedRegions. */
  "deny_prohibited",
  /** Transfers require an explicit allow entry (strictest configurable). */
  "deny_by_default",
] as const;

export type CrossBorderMode = (typeof CROSS_BORDER_MODES)[number];

export const KEY_MANAGEMENT_MODES = [
  "platform_managed",
  "customer_managed",
  /** Capability reserved — not live until BYOK adapter ships. */
  "byok_reserved",
] as const;

export type KeyManagementMode = (typeof KEY_MANAGEMENT_MODES)[number];

export type DecisionEffect = "allow" | "deny";

export type PolicyDecision = {
  effect: DecisionEffect;
  /** Machine reason code — never a statute citation. */
  reason: string;
  /** Which policy clause produced the decision. */
  clause: string;
  details?: Record<string, string | number | boolean | null>;
};

export function allow(clause: string, reason = "allowed", details?: PolicyDecision["details"]): PolicyDecision {
  return { effect: "allow", reason, clause, details };
}

export function deny(clause: string, reason: string, details?: PolicyDecision["details"]): PolicyDecision {
  return { effect: "deny", reason, clause, details };
}
