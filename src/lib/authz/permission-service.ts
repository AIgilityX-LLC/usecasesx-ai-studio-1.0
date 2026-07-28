/**
 * Permission service — the only place that decides "may this subject do X?".
 * Pure and isomorphic: the browser uses it to keep the UI honest, server
 * functions use it to actually enforce access.
 */

import {
  ENTITLEMENT_CATALOGUE,
  ENTITLEMENT_KEYS,
  type EntitlementDefinition,
  type EntitlementKey,
} from "./catalogue";
import { EDITION_LABEL, editionUnlocks, type Edition } from "./editions";
import { DEFAULT_CAPABILITY_FLAGS, mergeCapabilityFlags, type CapabilityFlags } from "./flags";
import type { WorkspaceRole } from "./roles";

export type AuthzSubject = {
  userId: string | null;
  edition: Edition;
  workspaceRole: WorkspaceRole | null;
  isPlatformAdmin: boolean;
  flags?: Partial<CapabilityFlags> | null;
};

export type DenyReason = "unauthenticated" | "no_membership" | "role" | "edition" | "not_available";

export type AuthzDecision = {
  allowed: boolean;
  reason?: DenyReason;
  /** Human-readable, honest explanation for locked-state UI. */
  message?: string;
  requiredEdition: Edition;
  definition: EntitlementDefinition;
};

export const ANONYMOUS_SUBJECT: AuthzSubject = Object.freeze({
  userId: null,
  edition: "lite",
  workspaceRole: null,
  isPlatformAdmin: false,
});

function flagsFor(subject: AuthzSubject): CapabilityFlags {
  return subject.flags ? mergeCapabilityFlags(subject.flags) : DEFAULT_CAPABILITY_FLAGS;
}

export function evaluate(subject: AuthzSubject, key: EntitlementKey): AuthzDecision {
  const definition = ENTITLEMENT_CATALOGUE[key];
  const base = { requiredEdition: definition.minEdition, definition };

  // A capability that is not built yet is off for everyone, admins included.
  if (definition.flag && !flagsFor(subject)[definition.flag]) {
    return {
      ...base,
      allowed: false,
      reason: "not_available",
      message: `${definition.label} is not available yet.`,
    };
  }

  const adminBypass = definition.platformAdminBypass ?? true;
  if (subject.isPlatformAdmin && adminBypass && subject.userId) {
    return { ...base, allowed: true };
  }

  if (!subject.userId) {
    if (definition.anonymous) return { ...base, allowed: true };
    return {
      ...base,
      allowed: false,
      reason: "unauthenticated",
      message: `Sign in to use ${definition.label.toLowerCase()}.`,
    };
  }

  if (definition.roles.length === 0) {
    return {
      ...base,
      allowed: false,
      reason: "role",
      message: `${definition.label} is restricted to platform staff.`,
    };
  }

  if (!subject.workspaceRole) {
    return {
      ...base,
      allowed: false,
      reason: "no_membership",
      message: "You are not a member of this workspace.",
    };
  }

  if (!definition.roles.includes(subject.workspaceRole)) {
    return {
      ...base,
      allowed: false,
      reason: "role",
      message: `Your workspace role cannot ${definition.label.toLowerCase()}.`,
    };
  }

  if (!editionUnlocks(subject.edition, definition.minEdition)) {
    return {
      ...base,
      allowed: false,
      reason: "edition",
      message: `${definition.label} requires ${EDITION_LABEL[definition.minEdition]}.`,
    };
  }

  return { ...base, allowed: true };
}

export function can(subject: AuthzSubject, key: EntitlementKey): boolean {
  return evaluate(subject, key).allowed;
}

/** Full decision map — used by the server to hand a precomputed set to the UI. */
export function evaluateAll(subject: AuthzSubject): Record<EntitlementKey, boolean> {
  const out = {} as Record<EntitlementKey, boolean>;
  for (const key of ENTITLEMENT_KEYS) out[key] = can(subject, key);
  return out;
}

export class EntitlementError extends Error {
  readonly key: EntitlementKey;
  readonly reason: DenyReason;
  constructor(key: EntitlementKey, decision: AuthzDecision) {
    super(decision.message ?? `Not permitted: ${key}`);
    this.name = "EntitlementError";
    this.key = key;
    this.reason = decision.reason ?? "role";
  }
}

/** Throwing variant for server handlers. */
export function assertEntitled(subject: AuthzSubject, key: EntitlementKey): void {
  const decision = evaluate(subject, key);
  if (!decision.allowed) throw new EntitlementError(key, decision);
}
