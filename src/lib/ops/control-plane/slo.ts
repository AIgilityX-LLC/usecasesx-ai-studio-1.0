/**
 * Service Level Objectives — operational targets for UseCasesX.
 *
 * These are product/ops contracts. Measurement wiring is incremental; claiming
 * a target is met requires evidence from metrics/health, not this catalogue alone.
 */

export type SloTier = "lite" | "pro" | "enterprise" | "platform";

export type SloId =
  | "platform_availability"
  | "api_p95_latency"
  | "critical_transaction_success"
  | "rpo"
  | "rto"
  | "security_event_logging"
  | "tenant_isolation_tests";

export type SloDefinition = {
  id: SloId;
  service: string;
  /** Human target as published to ops. */
  target: string;
  /** Machine-comparable where applicable. */
  numericTarget?: number;
  unit?: "percent" | "ms" | "hours" | "coverage";
  /** Which commercial/ops tier the target applies to. */
  tiers: readonly SloTier[];
  /** How we intend to measure. */
  measurement: string;
  /** Related automated check when present. */
  evidence?: string;
};

/**
 * RPO/RTO by deployment tier — defined here; enable PITR on production-class
 * projects (see pitr.ts / ops docs). Values are contracts, not live probes.
 */
export const RECOVERY_OBJECTIVES: Record<
  Exclude<SloTier, "platform">,
  { rpoHours: number; rtoHours: number; notes: string }
> = {
  lite: {
    rpoHours: 24,
    rtoHours: 24,
    notes: "Daily backup class; PITR optional.",
  },
  pro: {
    rpoHours: 4,
    rtoHours: 8,
    notes: "PITR recommended for production Founding Access / Pro.",
  },
  enterprise: {
    rpoHours: 1,
    rtoHours: 4,
    notes: "PITR required for production-class Enterprise deployments.",
  },
};

export const SLO_CATALOGUE: Record<SloId, SloDefinition> = {
  platform_availability: {
    id: "platform_availability",
    service: "Platform availability",
    target: "99.9%",
    numericTarget: 99.9,
    unit: "percent",
    tiers: ["platform", "pro", "enterprise"],
    measurement: "Uptime checks against /api/public/health + synthetic journey probes",
    evidence: "src/lib/ops/control-plane/health.ts",
  },
  api_p95_latency: {
    id: "api_p95_latency",
    service: "API P95 latency",
    target: "<500 ms",
    numericTarget: 500,
    unit: "ms",
    tiers: ["platform", "pro", "enterprise"],
    measurement: "Server-fn / public API duration histograms (METRIC_NAMES.apiLatencyMs)",
  },
  critical_transaction_success: {
    id: "critical_transaction_success",
    service: "Critical transaction success",
    target: ">99.9%",
    numericTarget: 99.9,
    unit: "percent",
    tiers: ["pro", "enterprise"],
    measurement: "Success ratio for submit / gate decide / export / entitlement grant paths",
  },
  rpo: {
    id: "rpo",
    service: "RPO",
    target: "Defined per tier (see RECOVERY_OBJECTIVES)",
    tiers: ["lite", "pro", "enterprise"],
    measurement: "Backup / PITR configuration review on the managed database",
    evidence: "src/lib/ops/control-plane/pitr.ts",
  },
  rto: {
    id: "rto",
    service: "RTO",
    target: "Defined per tier (see RECOVERY_OBJECTIVES)",
    tiers: ["lite", "pro", "enterprise"],
    measurement: "Restore drill wall-clock (scripts/ops/restore-drill.mjs + recovery-drill.ts)",
    evidence: "src/lib/ops/recovery-drill.ts",
  },
  security_event_logging: {
    id: "security_event_logging",
    service: "Security event logging",
    target: "100%",
    numericTarget: 100,
    unit: "coverage",
    tiers: ["platform", "enterprise"],
    measurement: "Security signals via observability model + structuredLog level=security",
    evidence: "src/lib/observability/observability.model.ts",
  },
  tenant_isolation_tests: {
    id: "tenant_isolation_tests",
    service: "Tenant-isolation tests",
    target: "100% pass",
    numericTarget: 100,
    unit: "coverage",
    tiers: ["platform", "enterprise"],
    measurement: "CI: bun run test:rls / test:tenancy / test:cross-tenant / test:cross-workspace",
    evidence: "tests/rls-isolation.e2e.ts",
  },
};

export function sloList(): SloDefinition[] {
  return Object.values(SLO_CATALOGUE);
}

export function recoveryForTier(tier: Exclude<SloTier, "platform">) {
  return RECOVERY_OBJECTIVES[tier];
}

/** Pure helper: is an observed P95 within the API latency SLO? */
export function meetsApiP95(p95Ms: number): boolean {
  return Number.isFinite(p95Ms) && p95Ms < (SLO_CATALOGUE.api_p95_latency.numericTarget ?? 500);
}
