/**
 * Pure, framework-free entitlement helpers shared by client + server.
 *
 * Edition ranking / unlock / founding expiry are owned by `src/lib/authz/editions.ts`
 * (V2-03 centralization). This module keeps commercial helpers that the authz
 * package does not own (email eligibility, module catalogue labels) and re-exports
 * the shared edition primitives so existing `import { … } from "@/lib/entitlements"`
 * call sites keep working.
 */

import {
  DEFAULT_FOUNDING_ACCESS,
  EDITION_RANK,
  editionUnlocks,
  type Edition,
} from "@/lib/authz/editions";

export type EntTier = Edition;
export const TIER_RANK: Record<EntTier, number> = EDITION_RANK;

export const FOUNDING_UNTIL_ISO = DEFAULT_FOUNDING_ACCESS.expiresAt;
export const FOUNDING_UNTIL_LABEL = DEFAULT_FOUNDING_ACCESS.label;

/** Free / consumer email providers are NOT eligible for founding gratis Pro. */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "zoho.com",
  "hey.com",
  "fastmail.com",
  "qq.com",
  "163.com",
  "126.com",
]);

export function emailDomain(email: string): string {
  return (email.split("@")[1] ?? "").trim().toLowerCase();
}

/** Eligible = a valid work/organizational email (not a free consumer domain). */
export function isEligibleEmail(email: string): boolean {
  const d = emailDomain(email);
  if (!d || !d.includes(".")) return false;
  return !FREE_EMAIL_DOMAINS.has(d);
}

/**
 * Resolve the effective tier considering an optional expiration date.
 * Expired founding entitlements silently fall back to Lite.
 */
export function effectiveTier(
  storedTier: EntTier,
  expiresAt: string | Date | null | undefined,
  now: Date = new Date(),
): EntTier {
  if (storedTier === "lite") return "lite";
  if (!expiresAt) return storedTier;
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (isNaN(exp.getTime())) return storedTier;
  return now.getTime() > exp.getTime() ? "lite" : storedTier;
}

export function daysUntil(
  expiresAt: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null;
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (isNaN(exp.getTime())) return null;
  return Math.ceil((exp.getTime() - now.getTime()) / 86_400_000);
}

/** Can `tier` unlock a feature that requires `required`? Delegates to authz. */
export function tierUnlocks(tier: EntTier, required: EntTier): boolean {
  return editionUnlocks(tier, required);
}

/** Canonical UseCasesX module catalogue with the tier required to unlock each. */
export type UseCasesXModule = { title: string; required: EntTier };
export const USECASEX_MODULES: UseCasesXModule[] = [
  { title: "AI Readiness Navigator™", required: "lite" },
  { title: "AI Cost/ROI Navigator™", required: "lite" },
  { title: "AI Performance Index™", required: "lite" },
  { title: "Risk-Adjusted ROI Snapshot™", required: "lite" },
  { title: "Agentic AI Readiness Scorecard™", required: "pro" },
  { title: "Agentic AI ROI Scorecard™", required: "pro" },
  { title: "AI Value Gap Analyzer™", required: "pro" },
  { title: "AI Investment Engine™", required: "pro" },
  { title: "Sovereign AI Maturity Snapshot™", required: "pro" },
  { title: "SERT™ Value Confidence Layer", required: "enterprise" },
  { title: "AI Impact & Value Realization Engine™", required: "enterprise" },
  { title: "AI Portfolio & Board Value Center™", required: "enterprise" },
];

export function tierLabel(tier: EntTier): string {
  return tier === "enterprise" ? "Enterprise" : tier === "pro" ? "Pro" : "Lite";
}
