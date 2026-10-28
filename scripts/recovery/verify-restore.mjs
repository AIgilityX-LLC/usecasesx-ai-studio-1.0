#!/usr/bin/env node
/**
 * After restore into TEST: verify table presence + approximate row counts via psql.
 * Never prints credentials. Refuses production ref.
 *
 * Required env:
 *   DATABASE_URL
 * Optional:
 *   SUPABASE_URL + PRODUCTION_SUPABASE_PROJECT_REF for guard
 *   RECOVERY_SMOKE_EMAIL / RECOVERY_SMOKE_PASSWORD — if both set, attempt auth smoke
 *     via SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY (TEST only)
 */
import { spawnSync } from "node:child_process";
import { assertNotProductionTarget } from "./lib/prod-guard.mjs";

assertNotProductionTarget(process.env.SUPABASE_URL, process.env.PRODUCTION_SUPABASE_PROJECT_REF);

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required (TEST project).");
  process.exit(1);
}

const sql = `
SELECT 'organizations' AS tbl, count(*)::text AS n FROM public.organizations
UNION ALL SELECT 'workspaces', count(*)::text FROM public.workspaces
UNION ALL SELECT 'use_cases', count(*)::text FROM public.use_cases
UNION ALL SELECT 'user_roles', count(*)::text FROM public.user_roles
ORDER BY 1;
`;

const psql = process.env.PSQL_BIN?.trim() || "psql";
const probe = spawnSync(psql, [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
  encoding: "utf8",
});

if (probe.status !== 0) {
  console.error("verify-restore: psql probe failed (exit", probe.status, ").");
  process.exit(probe.status ?? 1);
}

console.log("Row-count probe (TEST):");
console.log(probe.stdout);

const email = process.env.RECOVERY_SMOKE_EMAIL?.trim();
const password = process.env.RECOVERY_SMOKE_PASSWORD?.trim();
const url = process.env.SUPABASE_URL?.trim();
const anon = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

if (email && password && url && anon) {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    console.error("Smoke login failed (details omitted).");
    process.exit(1);
  }
  console.log("Smoke login: ok (user id present; email not printed).");
  await client.auth.signOut();
} else {
  console.log("Smoke login: skipped (set RECOVERY_SMOKE_EMAIL/PASSWORD + SUPABASE_* to enable).");
}

console.log("verify-restore: PASS (written evidence — human must archive timestamps).");
