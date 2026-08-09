#!/usr/bin/env node
/**
 * Synthetic production probe.
 *
 * Hits the critical public routes, records latency and status for each, and
 * exits non-zero on a 5xx spike so the monitoring workflow alerts. Metrics are
 * written to `monitoring-metrics.json` and uploaded as a run artifact, which is
 * the metric store for now — no external APM dependency.
 */
import { writeFileSync } from "node:fs";

const baseUrl = (process.env.MONITOR_BASE_URL ?? "").replace(/\/$/, "");
if (!baseUrl) {
  console.error("MONITOR_BASE_URL is not set — configure the PRODUCTION_URL repository variable.");
  process.exit(1);
}

/** Routes that must always answer; a 5xx on any of these is user-visible. */
const ROUTES = ["/", "/repository", "/discover", "/auth", "/robots.txt"];
/** Share of probes allowed to fail with 5xx before we page. */
const ERROR_RATE_THRESHOLD = 0.2;
/** Latency above this is degraded service even when the status is 200. */
const SLOW_MS = 5_000;

const samples = [];

for (const route of ROUTES) {
  const url = `${baseUrl}${route}`;
  const started = Date.now();
  let status = 0;
  let error = null;
  try {
    const response = await fetch(url, { redirect: "manual" });
    status = response.status;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }
  const latencyMs = Date.now() - started;
  samples.push({ route, status, latencyMs, error, slow: latencyMs > SLOW_MS });
  console.log(
    `${status || "ERR"} ${String(latencyMs).padStart(5)}ms  ${route}${error ? `  (${error})` : ""}`,
  );
}

const failures = samples.filter((s) => s.error || s.status === 0 || s.status >= 500);
const errorRate = failures.length / samples.length;
const slow = samples.filter((s) => s.slow);

const metrics = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  samples,
  errorRate,
  p95LatencyMs: percentile(
    samples.map((s) => s.latencyMs),
    0.95,
  ),
  failing: failures.map((s) => s.route),
  slow: slow.map((s) => s.route),
};
writeFileSync("monitoring-metrics.json", `${JSON.stringify(metrics, null, 2)}\n`);

if (errorRate > ERROR_RATE_THRESHOLD) {
  await page(
    `5xx spike on ${baseUrl}: ${failures.map((f) => `${f.route} → ${f.status}`).join(", ")}`,
  );
  console.error(`Error rate ${(errorRate * 100).toFixed(0)}% exceeds threshold.`);
  process.exit(1);
}

if (slow.length > 0) {
  await page(`Degraded latency on ${baseUrl}: ${slow.map((s) => s.route).join(", ")}`);
}

console.log(`OK — error rate ${(errorRate * 100).toFixed(0)}%, p95 ${metrics.p95LatencyMs}ms`);

function percentile(values, q) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1);
  return sorted[index];
}

async function page(text) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) {
    console.warn(`ALERT_WEBHOOK_URL not configured; alert not delivered: ${text}`);
    return;
  }
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (cause) {
    console.warn(`Alert delivery failed: ${cause instanceof Error ? cause.message : cause}`);
  }
}
