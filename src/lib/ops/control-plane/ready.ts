/**
 * Readiness model — separate from liveness (/health).
 *
 * Ready means the process can serve tenant traffic: critical env present and
 * (when probed) the database dependency answers. Keep probes short.
 */

import type { HealthStatus } from "./health";

export type ReadyCheckId =
  "env_supabase_url" | "env_publishable_key" | "dependency_database" | "dependency_auth";

export type ReadyCheckResult = {
  id: ReadyCheckId;
  status: HealthStatus;
  detail: string;
  latencyMs?: number;
};

export type ReadyReport = {
  ready: boolean;
  status: HealthStatus;
  checkedAt: string;
  checks: ReadyCheckResult[];
  correlationId: string;
};

export type DependencyProbeResult = {
  ok: boolean;
  latencyMs: number;
  detail: string;
};

function hasEnv(name: string, env: Record<string, string | undefined>): boolean {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Pure readiness evaluation. Inject dependency probe results from the server
 * layer so unit tests stay network-free.
 */
export function evaluateReadiness(
  env: Record<string, string | undefined>,
  deps: {
    database?: DependencyProbeResult | null;
    auth?: DependencyProbeResult | null;
  } = {},
  opts: { correlationId?: string } = {},
): ReadyReport {
  const checks: ReadyCheckResult[] = [
    {
      id: "env_supabase_url",
      status: hasEnv("SUPABASE_URL", env) ? "ok" : "fail",
      detail: hasEnv("SUPABASE_URL", env) ? "SUPABASE_URL present" : "SUPABASE_URL missing",
    },
    {
      id: "env_publishable_key",
      status:
        hasEnv("SUPABASE_PUBLISHABLE_KEY", env) || hasEnv("VITE_SUPABASE_PUBLISHABLE_KEY", env)
          ? "ok"
          : "fail",
      detail:
        hasEnv("SUPABASE_PUBLISHABLE_KEY", env) || hasEnv("VITE_SUPABASE_PUBLISHABLE_KEY", env)
          ? "Publishable key present"
          : "Publishable key missing",
    },
  ];

  if (deps.database) {
    checks.push({
      id: "dependency_database",
      status: deps.database.ok ? "ok" : "fail",
      detail: deps.database.detail,
      latencyMs: deps.database.latencyMs,
    });
  }

  if (deps.auth) {
    checks.push({
      id: "dependency_auth",
      status: deps.auth.ok ? "ok" : "degraded",
      detail: deps.auth.detail,
      latencyMs: deps.auth.latencyMs,
    });
  }

  const status = checks.reduce<HealthStatus>((acc, c) => {
    if (c.status === "fail" || acc === "fail") return "fail";
    if (c.status === "degraded" || acc === "degraded") return "degraded";
    return "ok";
  }, "ok");

  return {
    ready: status !== "fail",
    status,
    checkedAt: new Date().toISOString(),
    checks,
    correlationId: opts.correlationId ?? "ready",
  };
}

export function httpStatusForReady(ready: boolean, status: HealthStatus): number {
  if (!ready || status === "fail") return 503;
  return 200;
}

export const READINESS_CHECKS = [
  {
    id: "public_ready",
    path: "/api/public/ready",
    method: "GET",
    expectStatus: [200],
    intervalSeconds: 60,
    slo: "platform_availability",
  },
] as const;
