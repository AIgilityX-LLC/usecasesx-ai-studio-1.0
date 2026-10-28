/**
 * Point-in-Time Recovery (PITR) posture for production-class deployments.
 *
 * Supabase/Lovable Cloud can offer PITR with restore to chosen recovery points.
 * Production guidance also includes backups, network restrictions, SSL, MFA and
 * RLS — those remain mandatory regardless of PITR.
 *
 * This module does **not** enable PITR (platform dashboard / human ops). It
 * records the checklist and tier expectations.
 */

import { RECOVERY_OBJECTIVES, type SloTier } from "./slo";

export type PitrChecklistItem = {
  id: string;
  label: string;
  requiredFor: readonly Exclude<SloTier, "platform">[];
  /** Who flips this — never the app process. */
  owner: "platform_dashboard" | "security" | "engineering";
};

export const PITR_CHECKLIST: readonly PitrChecklistItem[] = [
  {
    id: "pitr_enabled",
    label: "Enable PITR on the production Supabase/Lovable Cloud project",
    requiredFor: ["pro", "enterprise"],
    owner: "platform_dashboard",
  },
  {
    id: "daily_backups",
    label: "Confirm automated backups are on and retention meets RPO",
    requiredFor: ["lite", "pro", "enterprise"],
    owner: "platform_dashboard",
  },
  {
    id: "network_restrictions",
    label: "Restrict database network access (allow-lists / private connectivity as available)",
    requiredFor: ["enterprise"],
    owner: "security",
  },
  {
    id: "ssl_enforced",
    label: "Enforce SSL for database clients",
    requiredFor: ["pro", "enterprise"],
    owner: "platform_dashboard",
  },
  {
    id: "mfa_admins",
    label: "Require MFA for platform admin and dashboard operators",
    requiredFor: ["pro", "enterprise"],
    owner: "security",
  },
  {
    id: "rls_verified",
    label: "RLS enabled on all public tenant tables; isolation suites green",
    requiredFor: ["lite", "pro", "enterprise"],
    owner: "engineering",
  },
  {
    id: "restore_drill",
    label: "Run restore drill and record RTO evidence",
    requiredFor: ["pro", "enterprise"],
    owner: "engineering",
  },
] as const;

export function pitrRequired(tier: Exclude<SloTier, "platform">): boolean {
  return tier === "pro" || tier === "enterprise";
}

export function pitrGuidance(tier: Exclude<SloTier, "platform">) {
  const recovery = RECOVERY_OBJECTIVES[tier];
  return {
    tier,
    pitrRequired: pitrRequired(tier),
    rpoHours: recovery.rpoHours,
    rtoHours: recovery.rtoHours,
    checklist: PITR_CHECKLIST.filter((i) => i.requiredFor.includes(tier)),
    disclaimer:
      "PITR and dashboard security settings are operator actions. The application cannot enable them from code.",
  };
}
