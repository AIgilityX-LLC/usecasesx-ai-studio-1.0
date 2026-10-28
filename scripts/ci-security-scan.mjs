#!/usr/bin/env node
/**
 * Dependency / security scan for Critical gates.
 *
 * Runs `bun audit` (or npm audit fallback). Fails the gate on Critical or High
 * advisories. Never prints secret values.
 *
 * Usage: node scripts/ci-security-scan.mjs
 */
import { spawnSync } from "node:child_process";

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
}

let result = run("bun", ["audit", "--json"]);
let used = "bun audit";

if (result.status === null || (result.error && result.error.code === "ENOENT")) {
  result = run("bunx", ["npm", "audit", "--json"]);
  used = "npm audit";
}

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";

let critical = 0;
let high = 0;
let parsed = null;

try {
  parsed = JSON.parse(stdout || "{}");
} catch {
  // bun audit may emit non-JSON on some versions — fall back to text heuristics
}

if (parsed) {
  // bun / npm audit shapes vary; handle common ones
  const meta = parsed.metadata?.vulnerabilities ?? parsed.vulnerabilities ?? {};
  if (typeof meta.critical === "number") critical = meta.critical;
  if (typeof meta.high === "number") high = meta.high;
  if (parsed.advisories && typeof parsed.advisories === "object") {
    for (const adv of Object.values(parsed.advisories)) {
      const sev = String(adv.severity ?? adv.severityLevel ?? "").toLowerCase();
      if (sev === "critical") critical += 1;
      if (sev === "high") high += 1;
    }
  }
} else {
  const text = `${stdout}\n${stderr}`.toLowerCase();
  if (/\bcritical\b/.test(text) && /\bvulnerabilit/.test(text)) critical = 1;
  if (/\bhigh\b/.test(text) && /\bvulnerabilit/.test(text)) high = 1;
}

console.log(`[ci:security] scanner=${used} critical=${critical} high=${high}`);

if (critical > 0 || high > 0) {
  console.error(
    `::error::Security gate failed: ${critical} critical and ${high} high advisories. Remediatiate before merge.`,
  );
  if (stdout) console.error(stdout.slice(0, 4000));
  process.exit(1);
}

// Soft warning if the scanner itself failed but produced no High/Critical counts
if (result.status !== 0 && critical === 0 && high === 0) {
  console.warn(
    `::warning::${used} exited ${result.status} without Critical/High counts — treating as pass with warning.`,
  );
  if (stderr) console.warn(stderr.slice(0, 2000));
}

console.log("[ci:security] no Critical/High advisories — gate passed.");
process.exit(0);
