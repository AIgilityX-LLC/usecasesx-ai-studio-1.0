/**
 * Edition configuration — single source of truth for Lite / Pro / Enterprise.
 * Pure module: no React, no Supabase, no `import.meta` — safe to import from
 * server-function modules and from tests.
 */

export type Edition = "lite" | "pro" | "enterprise";

export const EDITION_RANK: Record<Edition, number> = {
  lite: 0,
  pro: 1,
  enterprise: 2,
};

export const EDITION_LABEL: Record<Edition, string> = {
  lite: "Lite",
  pro: "Pro Founding Access",
  enterprise: "Enterprise",
};

/** Plan codes that may appear in `profiles.plan_type`, `organizations.plan` or `entitlements.plan_code`. */
const PLAN_CODE_TO_EDITION: Record<string, Edition> = {
  lite: "lite",
  free: "lite",
  free_lite: "lite",
  pro: "pro",
  founding: "pro",
  pro_founding: "pro",
  enterprise: "enterprise",
  sovereign: "enterprise",
};

export function editionFromPlanCode(code: string | null | undefined): Edition {
  if (!code) return "lite";
  return PLAN_CODE_TO_EDITION[code.trim().toLowerCase()] ?? "lite";
}

export function editionUnlocks(edition: Edition, required: Edition): boolean {
  return EDITION_RANK[edition] >= EDITION_RANK[required];
}

/**
 * Pro Founding Access — configured centrally, never inline.
 * Override the expiry with `FOUNDING_ACCESS_UNTIL` (server) or
 * `VITE_FOUNDING_ACCESS_UNTIL` (client); both are read at the edge of the app,
 * never inside this pure module.
 */
export type FoundingAccessConfig = {
  /** Edition granted while founding access is live. */
  grantedEdition: Edition;
  /** ISO timestamp at which complimentary founding access lapses. */
  expiresAt: string;
  label: string;
};

export const DEFAULT_FOUNDING_ACCESS: FoundingAccessConfig = Object.freeze({
  grantedEdition: "pro",
  expiresAt: "2026-12-31T23:59:59.000Z",
  label: "31 Dec 2026",
});

export function resolveFoundingAccess(
  overrideIso?: string | null,
): FoundingAccessConfig {
  if (!overrideIso) return DEFAULT_FOUNDING_ACCESS;
  const parsed = new Date(overrideIso);
  if (Number.isNaN(parsed.getTime())) return DEFAULT_FOUNDING_ACCESS;
  return {
    grantedEdition: DEFAULT_FOUNDING_ACCESS.grantedEdition,
    expiresAt: parsed.toISOString(),
    label: parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

export function foundingAccessActive(
  config: FoundingAccessConfig = DEFAULT_FOUNDING_ACCESS,
  now: Date = new Date(),
): boolean {
  return now.getTime() <= new Date(config.expiresAt).getTime();
}

export type EditionInputs = {
  /** Stored tier on the profile (`entitlement_tier`). */
  storedTier?: string | null;
  /** Expiry stored against the profile entitlement. */
  expiresAt?: string | Date | null;
  /** Legacy plan column on the profile. */
  planType?: string | null;
  /** Organization-level plan / entitlement plan code (tenancy v2). */
  orgPlanCode?: string | null;
  /** Organization entitlement expiry (tenancy v2). */
  orgPlanExpiresAt?: string | Date | null;
  /** Founding-member flag on the profile. */
  foundingMember?: boolean | null;
};

function notExpired(value: string | Date | null | undefined, now: Date): boolean {
  if (!value) return true;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return true;
  return now.getTime() <= date.getTime();
}

/**
 * Resolve the effective edition from every known signal. The highest still-valid
 * grant wins; anything expired silently degrades to Lite.
 */
export function resolveEdition(
  inputs: EditionInputs,
  founding: FoundingAccessConfig = DEFAULT_FOUNDING_ACCESS,
  now: Date = new Date(),
): Edition {
  const candidates: Edition[] = ["lite"];

  const profileEdition = editionFromPlanCode(inputs.storedTier ?? inputs.planType);
  if (notExpired(inputs.expiresAt, now)) candidates.push(profileEdition);

  const orgEdition = editionFromPlanCode(inputs.orgPlanCode);
  if (notExpired(inputs.orgPlanExpiresAt, now)) candidates.push(orgEdition);

  if (inputs.foundingMember && foundingAccessActive(founding, now)) {
    candidates.push(founding.grantedEdition);
  }

  return candidates.reduce((best, next) =>
    EDITION_RANK[next] > EDITION_RANK[best] ? next : best,
  );
}

export function daysUntilFoundingExpiry(
  founding: FoundingAccessConfig = DEFAULT_FOUNDING_ACCESS,
  now: Date = new Date(),
): number {
  return Math.ceil(
    (new Date(founding.expiresAt).getTime() - now.getTime()) / 86_400_000,
  );
}
