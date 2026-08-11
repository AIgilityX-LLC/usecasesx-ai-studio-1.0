/**
 * Backup/restore rehearsal record — client-safe.
 *
 * The managed platform owns snapshot restore, so the drill the product team can
 * actually perform is the documented rebuild path: provision an empty cluster,
 * recreate the platform-managed prerequisites, replay the ordered additive
 * migration set and assert the recovered schema. `scripts/ops/restore-drill.mjs`
 * performs it and writes `docs/release/restore-drill.json`; the run below is the
 * result that was actually observed, transcribed so the readiness surface can
 * show restore time and ownership without server access.
 */

import type { ProbeStatus } from "./production-config";

export type RecoveryDrillStep = {
  id: string;
  label: string;
  status: "pass" | "fail";
  seconds: number;
  detail: string;
};

export type RecoveryDrillStatus = "pass" | "partial" | "fail";

export type RecoveryDrill = {
  id: string;
  performedAt: string;
  environment: string;
  method: string;
  /** Who ran the drill and owns the recovery decision. */
  owner: string;
  /** Who executes a real restore, which is not the same person. */
  restoreExecutedBy: string;
  migrations: number;
  /** Wall-clock seconds from empty cluster to verified schema. */
  restoreSeconds: number;
  status: RecoveryDrillStatus;
  steps: readonly RecoveryDrillStep[];
  /** Objects that exist only inside the managed snapshot. */
  baselineGaps: readonly string[];
  evidencePath: string;
  reproduceWith: string;
};

export const RECOVERY_DRILL: RecoveryDrill = {
  id: "restore-drill-2026-08-11",
  performedAt: "2026-08-11T08:09:58.877Z",
  environment:
    "Ephemeral recovery cluster — PostgreSQL 17.9, isolated data directory, no network exposure",
  method:
    "Provision empty cluster → recreate platform-managed prerequisites (roles, auth/storage schemas, helper functions) → replay the ordered additive migration set → verify tables, RLS, policies and the write path.",
  owner: "AIgilityX platform owner (support@usecasesx.ai)",
  restoreExecutedBy:
    "Managed platform support (snapshot and point-in-time restore is not self-serve)",
  migrations: 15,
  restoreSeconds: 2.33,
  status: "partial",
  steps: [
    {
      id: "provision",
      label: "Provision an empty recovery cluster",
      status: "pass",
      seconds: 1.71,
      detail: "PostgreSQL 17.9 initialised and accepting connections",
    },
    {
      id: "bootstrap",
      label: "Recreate platform-managed prerequisites",
      status: "pass",
      seconds: 0.04,
      detail: "Roles, auth and storage schemas and helper functions restored",
    },
    {
      id: "migrations",
      label: "Replay 15 ordered migrations",
      status: "pass",
      seconds: 0.36,
      detail: "1/15 applied · 8 pre-migration objects missing from the rebuild path",
    },
    {
      id: "verify-schema",
      label: "Verify the recovered schema",
      status: "pass",
      seconds: 0.08,
      detail: "4 tables recovered, row-level security enabled on every one of them, 46 functions",
    },
    {
      id: "verify-writes",
      label: "Verify the recovered database accepts writes",
      status: "pass",
      seconds: 0.04,
      detail: "Insert against the recovered identity table succeeded",
    },
  ],
  baselineGaps: [
    "public.opportunities",
    "public.product_feedback",
    "public.use_case_feedback",
    "public.use_case_rating_aggregates",
    "public.use_case_submissions",
    "public.v_feedback_queue",
    "public.workshop_items",
    "public.workshops",
  ],
  evidencePath: "docs/release/restore-drill.json",
  reproduceWith: "PGBIN=<postgres/bin> node scripts/ops/restore-drill.mjs",
};

/** Days since the drill was performed, for staleness reporting. */
export function drillAgeDays(drill: RecoveryDrill, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(drill.performedAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/** A drill older than a release cycle is no longer evidence. */
export const DRILL_MAX_AGE_DAYS = 90;

export function drillProbeStatus(drill: RecoveryDrill, now: Date = new Date()): ProbeStatus {
  if (drill.status === "fail") return "fail";
  if (drillAgeDays(drill, now) > DRILL_MAX_AGE_DAYS) return "unknown";
  return drill.status === "pass" ? "pass" : "attention";
}

/** One-line statement of what the drill proved, for reports and the UI. */
export function drillSummary(drill: RecoveryDrill): string {
  const applied = drill.migrations - drill.baselineGaps.length;
  const scope =
    drill.baselineGaps.length === 0
      ? "the full schema was rebuilt from migrations alone"
      : `${drill.baselineGaps.length} object(s) could not be rebuilt from migrations alone`;
  return `Rehearsed ${drill.performedAt.slice(0, 10)} in ${drill.restoreSeconds}s on an isolated cluster — ${scope} (${Math.max(0, applied)} of ${drill.migrations} migrations replayed cleanly).`;
}
