#!/usr/bin/env node
/**
 * Export schema+data from a TEST Supabase/Postgres target via pg_dump.
 * Credentials from env only. Never prints connection strings or passwords.
 *
 * Required env:
 *   DATABASE_URL          — postgres connection URI for the TEST project
 * Optional:
 *   PRODUCTION_SUPABASE_PROJECT_REF — if set, refuse when SUPABASE_URL contains it
 *   SUPABASE_URL          — used only for the production-ref guard
 *   RECOVERY_EXPORT_PATH  — output file (default ./recovery-export.dump)
 *
 * Written, not run in CI by the agent.
 */
import { spawnSync } from "node:child_process";
import { assertNotProductionTarget } from "./lib/prod-guard.mjs";

assertNotProductionTarget(process.env.SUPABASE_URL, process.env.PRODUCTION_SUPABASE_PROJECT_REF);

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required (TEST project). Value not printed.");
  process.exit(1);
}

const out = process.env.RECOVERY_EXPORT_PATH?.trim() || "./recovery-export.dump";
const pgDump = process.env.PG_DUMP_BIN?.trim() || "pg_dump";

const result = spawnSync(
  pgDump,
  ["--format=custom", "--no-owner", "--no-acl", `--file=${out}`, databaseUrl],
  { encoding: "utf8", env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD } },
);

if (result.status !== 0) {
  console.error("pg_dump failed (stderr redacted of URIs). Exit:", result.status);
  process.exit(result.status ?? 1);
}

console.log("Export written to", out, "(contents not inspected by this script).");
