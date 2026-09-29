/**
 * Validated canonical lifecycle transitions + permission requirements.
 * Gate UI is out of scope (V2-10); this module only enforces the state machine.
 */

import type { ScopedPermission } from "@/lib/authz/scoped-permissions";
import { CANONICAL_STATES, type CanonicalState } from "./states";

/**
 * Allowed next states from each canonical state.
 * Decision outcomes from `under_review` require `decide`; most other moves need `edit`/`submit`.
 */
export const CANONICAL_TRANSITIONS: Record<CanonicalState, CanonicalState[]> = {
  idea: ["triage", "on_hold", "rejected", "archived"],
  triage: ["designing", "on_hold", "rejected", "archived", "idea"],
  designing: ["review_ready", "on_hold", "archived", "triage"],
  review_ready: ["under_review", "designing", "on_hold", "archived"],
  under_review: ["approved_pilot", "on_hold", "rejected", "review_ready"],
  approved_pilot: ["pilot", "on_hold", "rejected", "archived"],
  on_hold: [
    "idea",
    "triage",
    "designing",
    "review_ready",
    "pilot",
    "production",
    "archived",
  ],
  rejected: ["triage", "archived"],
  pilot: ["approved_scale", "measuring", "on_hold", "rejected", "archived"],
  approved_scale: ["production", "on_hold", "archived"],
  production: ["measuring", "retired", "on_hold", "archived"],
  measuring: ["production", "approved_scale", "retired", "archived"],
  retired: ["archived"],
  archived: [],
};

/** Minimum scoped permission required to perform a transition. */
export function permissionForTransition(
  from: CanonicalState,
  to: CanonicalState,
): ScopedPermission {
  // Gate decisions — human decide only (SRS §6 / FR-08).
  if (
    from === "under_review" &&
    (to === "approved_pilot" || to === "rejected" || to === "on_hold")
  ) {
    return "decide";
  }
  if (from === "review_ready" && to === "under_review") return "submit";
  if (to === "archived" || to === "retired") return "admin";
  if (to === "on_hold" || from === "on_hold") return "edit";
  return "edit";
}

export class ForbiddenTransitionError extends Error {
  readonly from: CanonicalState;
  readonly to: CanonicalState;
  constructor(from: CanonicalState, to: CanonicalState) {
    super(`Forbidden lifecycle transition: ${from} → ${to}`);
    this.name = "ForbiddenTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class MissingPermissionError extends Error {
  readonly required: ScopedPermission;
  constructor(required: ScopedPermission, from: CanonicalState, to: CanonicalState) {
    super(`Permission '${required}' required for lifecycle transition ${from} → ${to}`);
    this.name = "MissingPermissionError";
    this.required = required;
  }
}

export function canTransition(from: CanonicalState, to: CanonicalState): boolean {
  return CANONICAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedNextStates(from: CanonicalState): CanonicalState[] {
  return [...(CANONICAL_TRANSITIONS[from] ?? [])];
}

/**
 * Validate a transition. Does not mutate records and does not write audit —
 * callers must log via `logLifecycleTransition` after a successful persist.
 */
export function assertTransition(
  from: CanonicalState,
  to: CanonicalState,
  hasPermission: (permission: ScopedPermission) => boolean,
): void {
  if (!canTransition(from, to)) {
    throw new ForbiddenTransitionError(from, to);
  }
  const required = permissionForTransition(from, to);
  if (!hasPermission(required)) {
    throw new MissingPermissionError(required, from, to);
  }
}

/** Exhaustiveness guard — every canonical state must appear in the transition map. */
export function assertTransitionTableComplete(): void {
  for (const state of CANONICAL_STATES) {
    if (!(state in CANONICAL_TRANSITIONS)) {
      throw new Error(`Missing transition row for canonical state: ${state}`);
    }
  }
}
