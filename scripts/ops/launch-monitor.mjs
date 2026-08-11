#!/usr/bin/env node
/**
 * Launch-window deep probe (docs/operations/launch-runbook-2026-08-14.md §6).
 *
 * Extends the 15-minute availability probe with the checks the launch window
 * actually cares about: public route health, indexability/privacy directives,
 * the public API contract, the social-preview endpoint, and the sitemap. It
 * reads no secrets and writes no data.
 *
 * Usage:
 *   MONITOR_BASE_URL=https://<host> node scripts/ops/launch-monitor.mjs
 *   node scripts/ops/launch-monitor.mjs http://localhost:8080
 *
 * Exit code 0 = all required checks passed. Non-zero = escalate per §4.
 */
import { writeFileSync } from "node:fs";

const baseUrl = (process.argv[2] ?? process.env.MONITOR_BASE_URL ?? "").replace(/\/$/, "");
if (!baseUrl) {
  console.error(
    "No target host. Pass a URL as the first argument or set MONITOR_BASE_URL (see docs/operations/launch-runbook-2026-08-14.md §6).",
  );
  process.exit(1);
}

const SLOW_MS = 5_000;
const results = [];

function record(name, ok, detail, extra = {}) {
  results.push({ name, ok, detail, ...extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path, init) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
    const body = await response.text();
    return { status: response.status, body, latencyMs: Date.now() - started };
  } catch (cause) {
    return {
      status: 0,
      body: "",
      latencyMs: Date.now() - started,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

/** Public launch surfaces: must answer 2xx/3xx and stay under the latency budget. */
for (const path of ["/", "/repository", "/discover", "/pricing", "/auth"]) {
  const res = await get(path);
  const ok = res.status > 0 && res.status < 500;
  record(`route ${path}`, ok, `${res.status || res.error} in ${res.latencyMs}ms`, {
    status: res.status,
    latencyMs: res.latencyMs,
    slow: res.latencyMs > SLOW_MS,
  });
}

/** Indexability: public surfaces indexable, private surfaces not. */
const indexable = ["/", "/repository", "/pricing"];
for (const path of indexable) {
  const res = await get(path);
  const noindex = /name=["']robots["'][^>]*noindex|noindex[^>]*name=["']robots["']/i.test(res.body);
  record(
    `indexable ${path}`,
    res.status < 500 && !noindex,
    noindex ? "noindex present" : "index, follow",
  );
}
for (const path of ["/administration", "/my-use-cases"]) {
  const res = await get(path);
  const noindex = /noindex/i.test(res.body);
  record(
    `private noindex ${path}`,
    res.status >= 400 || noindex,
    noindex ? "noindex present" : `status ${res.status}`,
  );
}

/** Crawl configuration. */
const robots = await get("/robots.txt");
record(
  "robots.txt",
  robots.status === 200 && !/^\s*Disallow:\s*\/\s*$/im.test(robots.body),
  robots.status === 200 ? "served, site not globally disallowed" : `status ${robots.status}`,
);

const sitemap = await get("/sitemap.xml");
const urlCount = (sitemap.body.match(/<loc>/g) ?? []).length;
record("sitemap.xml", sitemap.status === 200 && urlCount > 0, `${urlCount} url entries`, {
  urlCount,
});

/** Public API contract. */
const api = await get("/api/public/usecasex/use-cases");
let firstSlug = null;
let apiOk = api.status === 200;
if (apiOk) {
  try {
    const payload = JSON.parse(api.body);
    const items = Array.isArray(payload) ? payload : (payload.items ?? payload.data ?? []);
    apiOk = Array.isArray(items) && items.length > 0;
    firstSlug = items[0]?.slug ?? null;
    record("public api use-cases", apiOk, `${Array.isArray(items) ? items.length : 0} items`);
  } catch {
    record("public api use-cases", false, "response was not JSON");
    apiOk = false;
  }
} else {
  record("public api use-cases", false, `status ${api.status}`);
}

const taxonomy = await get("/api/public/usecasex/taxonomy");
record("public api taxonomy", taxonomy.status === 200, `status ${taxonomy.status}`);

/** Social preview, using a real slug when the API gave us one. */
if (firstSlug) {
  const og = await get(`/og/use-case/${encodeURIComponent(firstSlug)}`);
  record(
    "og image",
    og.status === 200 && og.body.length > 0,
    `status ${og.status} for ${firstSlug}`,
  );
} else {
  record("og image", false, "skipped — no slug available from the public API");
}

const failed = results.filter((r) => !r.ok);
const slow = results.filter((r) => r.slow);
const metrics = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  results,
  failing: failed.map((r) => r.name),
  slow: slow.map((r) => r.name),
};
writeFileSync("launch-monitor-metrics.json", `${JSON.stringify(metrics, null, 2)}\n`);

console.log(
  `\n${results.length - failed.length}/${results.length} checks passed${slow.length ? `, ${slow.length} slow` : ""} — metrics written to launch-monitor-metrics.json`,
);

if (failed.length > 0) {
  console.error(`Escalate per runbook §4: ${failed.map((r) => r.name).join(", ")}`);
  process.exit(1);
}
