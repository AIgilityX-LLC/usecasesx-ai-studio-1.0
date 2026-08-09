/**
 * Capability flags referenced by the entitlement catalogue.
 * A capability whose flag is `false` is inaccessible to every role and edition,
 * and the UI must say so honestly ("not available yet") rather than upsell it.
 *
 * Pure module: defaults only. Environment overrides are applied at the edges
 * (see `src/lib/feature-flags.ts` for the browser surface).
 */

export type CapabilityFlagKey =
  | "opportunityMap"
  | "workshopMode"
  | "stageGates"
  | "multiEntity"
  | "integrations"
  | "sso"
  | "fullAudit";

export type CapabilityFlags = Record<CapabilityFlagKey, boolean>;

/**
 * Day-20 (14 Aug 2026) truth. Enterprise capabilities that are designed but not
 * shipped stay OFF so no surface can claim they are live.
 */
export const DEFAULT_CAPABILITY_FLAGS: CapabilityFlags = Object.freeze({
  opportunityMap: true,
  workshopMode: true,
  stageGates: false,
  multiEntity: false,
  integrations: false,
  sso: false,
  fullAudit: false,
});

export function mergeCapabilityFlags(overrides?: Partial<CapabilityFlags> | null): CapabilityFlags {
  return { ...DEFAULT_CAPABILITY_FLAGS, ...(overrides ?? {}) };
}
