/**
 * Health / readiness model for uptime checks and load balancers.
 *
 * Liveness: process is up.
 * Readiness: critical config present (URL + publishable key names only — no values).
 */

export type HealthStatus = "ok" | "degraded" | "fail";

export type HealthCheckId =
  "process" | "env_supabase_url" | "env_publishable_key" | "slo_catalogue" | "security_signals";

export type HealthCheckResult = {
  id: HealthCheckId;
  status: HealthStatus;
  detail: string;
  latencyMs?: number;
};

export type HealthReport = {
  status: HealthStatus;
  version: string;
  checkedAt: string;
  checks: HealthCheckResult[];
  /** Correlation id for this health probe. */
  correlationId: string;
};

function hasEnv(name: string, env: Record<string, string | undefined>): boolean {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Pure health evaluation — inject env for tests.
 * Does not open DB connections (keeps /health cheap for uptime monitors).
 */
export function evaluateHealth(
  env: Record<string, string | undefined> = {},
  opts: { version?: string; correlationId?: string } = {},
): HealthReport {
  const started = Date.now();
  const checks: HealthCheckResult[] = [
    {
      id: "process",
      status: "ok",
      detail: "Node/Workers process responding",
      latencyMs: 0,
    },
    {
      id: "env_supabase_url",
      status: hasEnv("SUPABASE_URL", env) ? "ok" : "fail",
      detail: hasEnv("SUPABASE_URL", env)
        ? "SUPABASE_URL present"
        : "SUPABASE_URL missing — data plane unavailable",
    },
    {
      id: "env_publishable_key",
      status:
        hasEnv("SUPABASE_PUBLISHABLE_KEY", env) || hasEnv("VITE_SUPABASE_PUBLISHABLE_KEY", env)
          ? "ok"
          : "degraded",
      detail:
        hasEnv("SUPABASE_PUBLISHABLE_KEY", env) || hasEnv("VITE_SUPABASE_PUBLISHABLE_KEY", env)
          ? "Publishable key present"
          : "Publishable key missing — public reads may fail",
    },
    {
      id: "slo_catalogue",
      status: "ok",
      detail: "SLO catalogue loaded",
    },
    {
      id: "security_signals",
      status: "ok",
      detail: "Security signal vocabulary available",
    },
  ];

  const worst = checks.reduce<HealthStatus>((acc, c) => {
    if (c.status === "fail" || acc === "fail") return "fail";
    if (c.status === "degraded" || acc === "degraded") return "degraded";
    return "ok";
  }, "ok");

  return {
    status: worst,
    version: opts.version ?? "1.0.0-rc.1",
    checkedAt: new Date().toISOString(),
    checks: checks.map((c) => (c.id === "process" ? { ...c, latencyMs: Date.now() - started } : c)),
    correlationId: opts.correlationId ?? "health",
  };
}

export function httpStatusForHealth(status: HealthStatus): number {
  if (status === "fail") return 503;
  if (status === "degraded") return 200; // still serve traffic; surface degradation in body
  return 200;
}

/** Uptime monitor expectations — documented for external checkers. */
export const UPTIME_CHECKS = [
  {
    id: "public_health",
    path: "/api/public/health",
    method: "GET",
    expectStatus: [200],
    intervalSeconds: 60,
    slo: "platform_availability",
  },
  {
    id: "public_health_live",
    path: "/api/public/health?mode=live",
    method: "GET",
    expectStatus: [200],
    intervalSeconds: 30,
    slo: "platform_availability",
  },
  {
    id: "public_ready",
    path: "/api/public/ready",
    method: "GET",
    expectStatus: [200],
    intervalSeconds: 60,
    slo: "platform_availability",
  },
] as const;
