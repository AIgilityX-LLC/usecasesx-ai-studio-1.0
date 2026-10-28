/**
 * Mass-assignment guard — pick only allowlisted keys from untrusted objects.
 * Prefer Zod schemas at server-fn boundaries; use this when merging patches.
 */

export function pickAllowed<T extends Record<string, unknown>, K extends keyof T>(
  input: T,
  allowed: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      out[key] = input[key];
    }
  }
  return out;
}

export function assertNoForbiddenKeys(
  input: Record<string, unknown>,
  forbidden: readonly string[],
): { ok: true } | { ok: false; key: string } {
  const lowerForbidden = new Set(forbidden.map((k) => k.toLowerCase()));
  for (const key of Object.keys(input)) {
    if (lowerForbidden.has(key.toLowerCase())) {
      return { ok: false, key };
    }
  }
  return { ok: true };
}

/** Columns that must never be client-writable on tenant rows. */
export const FORBIDDEN_TENANT_WRITE_KEYS = [
  "organization_id",
  "is_platform_admin",
  "role",
  "roles",
  "plan",
  "edition",
  "is_demo",
  "service_role",
] as const;
