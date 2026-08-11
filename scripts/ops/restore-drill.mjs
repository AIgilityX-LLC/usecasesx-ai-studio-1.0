#!/usr/bin/env node
/**
 * Backup/restore rehearsal into a throwaway recovery environment.
 *
 * The managed platform owns snapshot restore, so what the product team can
 * actually rehearse — and what this script measures — is the documented
 * rebuild path: bring up an empty Postgres cluster, recreate the
 * platform-managed prerequisites, replay the ordered additive migration set,
 * and assert the recovered schema (tables, RLS, policies, functions).
 *
 * Usage:
 *   PGBIN=/path/to/postgres/bin node scripts/ops/restore-drill.mjs \
 *     --owner "Name <email>" --environment "sandbox recovery cluster"
 *
 * Writes docs/release/restore-drill.json (machine evidence) and prints a
 * summary. Never reads or prints a secret value.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const PGBIN = process.env.PGBIN;
if (!PGBIN) {
  console.error("PGBIN is required (directory containing initdb/pg_ctl/psql).");
  process.exit(1);
}
const ROOT = process.cwd();
const DATA = arg("data-dir", "/tmp/recovery-drill");
const PORT = arg("port", "55433");
const UID = arg("uid", "1000");
const OWNER = arg("owner", "AIgilityX platform owner");
const ENVIRONMENT = arg("environment", "ephemeral recovery cluster (Postgres 17)");
const DB = "recovery";

const asUser = (bin, args) =>
  execFileSync(
    "setpriv",
    [`--reuid=${UID}`, `--regid=${UID}`, "--clear-groups", `${PGBIN}/${bin}`, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

const psql = (args, input) =>
  execFileSync(
    "setpriv",
    [
      `--reuid=${UID}`,
      `--regid=${UID}`,
      "--clear-groups",
      `${PGBIN}/psql`,
      "-h",
      DATA,
      "-p",
      PORT,
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      ...args,
    ],
    { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] },
  );

const scalar = (sql) => psql(["-d", DB, "-tAc", sql]).trim();
const seconds = (start) => Number(((Date.now() - start) / 1000).toFixed(2));

const steps = [];
let migrationResults = [];
let baselineGaps = new Set();
const step = (id, label, fn) => {
  const start = Date.now();
  try {
    const detail = fn() ?? "";
    steps.push({ id, label, status: "pass", seconds: seconds(start), detail: String(detail) });
  } catch (error) {
    steps.push({
      id,
      label,
      status: "fail",
      seconds: seconds(start),
      detail: (error.stderr || error.message || "").toString().slice(0, 600),
    });
    throw error;
  }
};

const migrations = readdirSync(path.join(ROOT, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

const startedAt = new Date().toISOString();
const wall = Date.now();
let failed = false;

try {
  step("provision", "Provision an empty recovery cluster", () => {
    rmSync(DATA, { recursive: true, force: true });
    mkdirSync(DATA, { recursive: true });
    execFileSync("chown", ["-R", `${UID}:${UID}`, DATA]);
    asUser("initdb", ["-D", `${DATA}/data`, "-U", "postgres"]);
    asUser("pg_ctl", [
      "-D",
      `${DATA}/data`,
      "-o",
      `-p ${PORT} -k ${DATA}`,
      "-l",
      `${DATA}/pg.log`,
      "-w",
      "start",
    ]);
    psql(["-d", "postgres", "-c", `CREATE DATABASE ${DB}`]);
    return `Postgres ${scalar("select current_setting('server_version')")} on port ${PORT}`;
  });

  step("bootstrap", "Recreate platform-managed prerequisites", () => {
    psql(["-d", DB, "-f", path.join(ROOT, "scripts/ops/restore-drill.sql")]);
    return "roles, auth/storage schemas and helper functions restored";
  });

  step("migrations", `Replay ${migrations.length} ordered migrations`, () => {
    // Replay continues past a failure on purpose: the migration set is
    // incremental over a schema baseline that only exists inside the managed
    // snapshot, so the gaps themselves are the evidence this drill captures.
    for (const file of migrations) {
      const start = Date.now();
      try {
        psql(["-d", DB, "-f", path.join(ROOT, "supabase/migrations", file)]);
        migrationResults.push({ file, status: "applied", seconds: seconds(start) });
      } catch (error) {
        const message = (error.stderr || error.message || "").toString();
        for (const match of message.matchAll(/relation "([^"]+)" does not exist/g)) {
          baselineGaps.add(match[1]);
        }
        for (const match of message.matchAll(/type "([^"]+)" does not exist/g)) {
          baselineGaps.add(match[1]);
        }
        migrationResults.push({
          file,
          status: "blocked",
          seconds: seconds(start),
          detail:
            message
              .split("\n")
              .find((line) => line.includes("ERROR:"))
              ?.slice(0, 240) ?? "",
        });
      }
    }
    const applied = migrationResults.filter((m) => m.status === "applied").length;
    return `${applied}/${migrations.length} applied · ${baselineGaps.size} pre-migration objects missing from the rebuild path`;
  });

  step("verify-schema", "Verify recovered schema", () => {
    const tables = Number(scalar("select count(*) from pg_tables where schemaname='public'"));
    const rlsOff = scalar(
      "select coalesce(string_agg(c.relname, ', '), '') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    );
    const policies = Number(scalar("select count(*) from pg_policies where schemaname='public'"));
    const functions = Number(
      scalar(
        "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'",
      ),
    );
    if (rlsOff) throw new Error(`row-level security missing on: ${rlsOff}`);
    return `${tables} tables · RLS on all of them · ${policies} policies · ${functions} functions`;
  });

  step("verify-writes", "Verify the recovered database accepts writes", () => {
    psql([
      "-d",
      DB,
      "-c",
      "insert into auth.users (email) values ('recovery-drill@example.invalid')",
    ]);
    const users = scalar("select count(*) from auth.users");
    return `write path healthy (${users} identity row)`;
  });
} catch {
  failed = true;
} finally {
  try {
    asUser("pg_ctl", ["-D", `${DATA}/data`, "-m", "immediate", "-w", "stop"]);
  } catch {
    /* cluster already down */
  }
}

const record = {
  id: `restore-drill-${startedAt.slice(0, 10)}`,
  performedAt: startedAt,
  environment: ENVIRONMENT,
  method:
    "Ordered migration replay into an empty cluster (platform snapshot restore is not self-serve)",
  owner: OWNER,
  migrations: migrations.length,
  restoreSeconds: seconds(wall),
  status: failed ? "fail" : baselineGaps.size > 0 ? "partial" : "pass",
  steps,
  migrationResults,
  baselineGaps: [...baselineGaps].sort(),
};

const out = path.join(ROOT, "docs/release/restore-drill.json");
writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);

console.log(`\nRestore rehearsal: ${record.status.toUpperCase()} in ${record.restoreSeconds}s`);
for (const s of steps) console.log(`  [${s.status}] ${s.label} — ${s.seconds}s — ${s.detail}`);
console.log(`\nEvidence: ${path.relative(ROOT, out)}`);
if (record.baselineGaps.length > 0) {
  console.log(
    `\nRebuild-path gap: ${record.baselineGaps.length} object(s) exist only in the managed snapshot: ${record.baselineGaps.join(", ")}`,
  );
}
if (failed) process.exit(1);
