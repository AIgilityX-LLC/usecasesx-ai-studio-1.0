/**
 * Demo maintenance authorization — pure (no DB client).
 */

import { timingSafeEqual } from "node:crypto";

/**
 * Authorize destructive demo maintenance.
 *
 * Requires DEMO_PERSONA_PASSWORD (timing-safe compare) AND an explicit enable
 * flag in production (`DEMO_RESET_ENABLED=true`). Email-suffix trust is not used:
 * caller-controlled email must never grant service-role demo wipe.
 */
export function demoResetAuthorized(
  password: string | undefined,
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {},
): boolean {
  const expected = (env["DEMO_PERSONA_PASSWORD"] ?? "").trim();
  const provided = (password ?? "").trim();
  if (!expected || !provided) return false;

  const nodeEnv = (env["NODE_ENV"] ?? "").toLowerCase();
  const explicitlyEnabled = (env["DEMO_RESET_ENABLED"] ?? "").toLowerCase() === "true";
  if (nodeEnv === "production" && !explicitlyEnabled) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
