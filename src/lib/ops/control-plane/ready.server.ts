/**
 * Server-only readiness + dependency probes.
 * Never returns secret values. Caps probe time to keep LB checks cheap.
 */

import { correlationFromRequest, correlationResponseHeaders } from "./correlation";
import { log } from "./logging";
import { METRIC_NAMES, recordMetric } from "./metrics";
import {
  evaluateReadiness,
  httpStatusForReady,
  type DependencyProbeResult,
  type ReadyReport,
} from "./ready";

const PROBE_TIMEOUT_MS = 2_500;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`probe_timeout_${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Lightweight DB reachability via a bounded select (RLS-safe, no tenant data). */
export async function probeDatabase(): Promise<DependencyProbeResult> {
  const started = Date.now();
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        detail: "Database probe skipped — env incomplete",
      };
    }
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Tiny public/catalogue read; failure means data plane is down for clients.
    await withTimeout(
      client
        .from("use_cases")
        .select("id")
        .limit(1)
        .then(({ error }) => {
          if (error) throw error;
        }),
      PROBE_TIMEOUT_MS,
    );
    const latencyMs = Date.now() - started;
    recordMetric(METRIC_NAMES.dbQueryMs, latencyMs, { probe: "ready" });
    return { ok: true, latencyMs, detail: "Database responded" };
  } catch (err) {
    const latencyMs = Date.now() - started;
    recordMetric(METRIC_NAMES.dbErrors, 1, { probe: "ready" });
    const message = err instanceof Error ? err.message : "database_unreachable";
    return { ok: false, latencyMs, detail: message.slice(0, 160) };
  }
}

/** Auth dependency: URL reachable conceptually via env; no credential round-trip. */
export function probeAuthConfig(): DependencyProbeResult {
  const started = Date.now();
  const ok = Boolean(process.env.SUPABASE_URL?.trim());
  return {
    ok,
    latencyMs: Date.now() - started,
    detail: ok ? "Auth config present" : "Auth config missing",
  };
}

export async function buildReadyReport(request: Request): Promise<{
  report: ReadyReport;
  status: number;
  headers: HeadersInit;
}> {
  const started = Date.now();
  const ctx = correlationFromRequest(request);
  const database = await probeDatabase();
  const auth = probeAuthConfig();
  const report = evaluateReadiness(
    process.env as Record<string, string | undefined>,
    { database, auth },
    { correlationId: ctx.correlationId },
  );
  recordMetric(
    METRIC_NAMES.healthCheckMs,
    Date.now() - started,
    { mode: "ready" },
    ctx.correlationId,
  );
  log.info(
    "ready.check",
    { status: report.status, ready: report.ready, dbOk: database.ok },
    ctx.correlationId,
  );
  return {
    report,
    status: httpStatusForReady(report.ready, report.status),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...correlationResponseHeaders(ctx),
    },
  };
}
