/**
 * Idempotent launch-data baseline refresh.
 *
 * Re-applies the reference baseline used by the RLS / tenancy / authz suites:
 *   1. canonical taxonomy + published reference use cases (SQL, ON CONFLICT DO NOTHING)
 *   2. demo accounts with their organization, workspace and entitlement
 *
 * Safe to run repeatedly: nothing is dropped and no tenant data is touched.
 * Credentials come from DEMO_SEED_PASSWORD / SMOKE_DEMO_PASSWORD, or a strong
 * password is generated for the run and printed once.
 *
 *   bun run seed:refresh                 # taxonomy + use cases + accounts
 *   bun run seed:refresh -- --accounts   # accounts only
 *   bun run seed:refresh -- --data       # taxonomy + use cases only
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (accounts) and psql
 * connection env (PGHOST etc.) for the SQL step.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
const only = args.has("--accounts") ? "accounts" : args.has("--data") ? "data" : "all";
const perIndustry = process.env.BASELINE_PER_INDUSTRY ?? "2";

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, { stdio: "inherit", ...opts });
  if (res.status !== 0) {
    console.error(`\n[refresh-baseline] "${cmd} ${cmdArgs.join(" ")}" failed.`);
    process.exit(res.status ?? 1);
  }
}

if (only !== "accounts") {
  console.log(`\n▸ Reference data (taxonomy + ${perIndustry} use cases/industry)…`);
  const emit = spawnSync("python3", ["scripts/seed/emit_baseline.py", perIndustry], {
    encoding: "utf8",
  });
  if (emit.status !== 0) {
    console.error(emit.stderr || "emit_baseline.py failed");
    process.exit(emit.status ?? 1);
  }
  const sqlPath = join(mkdtempSync(join(tmpdir(), "ucx-baseline-")), "baseline.sql");
  writeFileSync(sqlPath, emit.stdout);
  run("psql", ["-v", "ON_ERROR_STOP=1", "-q", "-f", sqlPath]);
  console.log("  reference data applied (idempotent).");
}

if (only !== "data") {
  console.log("\n▸ Demo accounts…");
  run("bun", ["run", "scripts/seed/demo-accounts.mjs"]);
}

console.log("\n✔ Baseline refresh complete.");
