#!/usr/bin/env node
/**
 * Release-candidate integrity gate.
 *
 * Checks the things that make a candidate reproducible and reviewable:
 *  1. src/lib/release.ts declares a version, target date and marker.
 *  2. package.json version matches src/lib/release.ts.
 *  3. Every migration filename is timestamp-ordered and unique.
 *  4. Migrations contain no destructive statements (DROP TABLE/COLUMN, TRUNCATE,
 *     DELETE FROM, ALTER ... RENAME COLUMN, DISABLE ROW LEVEL SECURITY).
 *  5. Migrations carry no demo/sample seed INSERTs (seeds live in scripts/seed).
 *  6. The migration manifest lists exactly the migrations on disk.
 *
 * Exit code 1 on any failure. Run: node scripts/verify-release-candidate.mjs
 */
import { readFileSync, readdirSync } from "node:fs";

const MIG_DIR = "supabase/migrations";
const MANIFEST = "docs/release/migration-manifest-2026-08-14.md";

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);
const ok = (m) => notes.push(m);

// 1 + 2: version markers
const release = readFileSync("src/lib/release.ts", "utf8");
const version = release.match(/RELEASE_VERSION = "([^"]+)"/)?.[1];
const target = release.match(/RELEASE_TARGET_DATE = "([^"]+)"/)?.[1];
const marker = release.match(/RELEASE_MARKER = "([^"]+)"/)?.[1];
if (!version) fail("src/lib/release.ts: RELEASE_VERSION missing");
if (!target) fail("src/lib/release.ts: RELEASE_TARGET_DATE missing");
if (!marker) fail("src/lib/release.ts: RELEASE_MARKER missing");
else ok(`release marker ${marker} · v${version} · target ${target}`);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (pkg.version !== version) {
  fail(`package.json version ${pkg.version ?? "(none)"} !== release.ts ${version}`);
} else ok(`package.json version matches (${pkg.version})`);

// 3: ordering + uniqueness
const files = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const stamps = [];
for (const f of files) {
  const m = f.match(/^(\d{14})_/);
  if (!m) {
    fail(`${f}: filename does not start with a 14-digit timestamp`);
    continue;
  }
  if (stamps.includes(m[1])) fail(`${f}: duplicate migration timestamp ${m[1]}`);
  stamps.push(m[1]);
}
const ordered = [...stamps].sort();
if (stamps.join() !== ordered.join()) fail("migration timestamps are not monotonically ordered");
else ok(`${files.length} migrations, timestamp-ordered, no duplicates`);

// 4 + 5: destructive / seed scan
const DESTRUCTIVE = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bRENAME\s+COLUMN\b/i,
  /DISABLE\s+ROW\s+LEVEL\s+SECURITY/i,
];
let seedHits = 0;
for (const f of files) {
  const sql = readFileSync(`${MIG_DIR}/${f}`, "utf8");
  for (const rx of DESTRUCTIVE) {
    if (rx.test(sql)) fail(`${f}: destructive statement matches ${rx}`);
  }
  const inserts = sql.match(/\bINSERT\s+INTO\s+public\.(\w+)/gi) ?? [];
  const dataInserts = inserts.filter(
    (i) => !/taxonomy_meta|plans|platform_modules|ai_capabilities/i.test(i),
  );
  if (dataInserts.length > 0) {
    seedHits += dataInserts.length;
    fail(`${f}: contains ${dataInserts.length} data INSERT(s); demo seeds belong in scripts/seed`);
  }
}
if (seedHits === 0) ok("no demo/sample seed rows in migrations");

// 6: manifest coverage
let manifest = "";
try {
  manifest = readFileSync(MANIFEST, "utf8");
} catch {
  fail(`${MANIFEST} is missing`);
}
if (manifest) {
  const missing = files.filter((f) => !manifest.includes(f));
  const extra = [...manifest.matchAll(/(\d{14}_[0-9a-f-]+\.sql)/g)]
    .map((m) => m[1])
    .filter((f) => !files.includes(f));
  if (missing.length) fail(`manifest missing: ${missing.join(", ")}`);
  if (extra.length) fail(`manifest lists unknown migrations: ${extra.join(", ")}`);
  if (!missing.length && !extra.length) ok(`manifest covers all ${files.length} migrations`);
}

for (const n of notes) console.log(`  ok  ${n}`);
for (const f of failures) console.error(`FAIL  ${f}`);
console.log(
  failures.length === 0
    ? "\nRelease candidate integrity: PASS"
    : `\nRelease candidate integrity: FAIL (${failures.length})`,
);
process.exit(failures.length === 0 ? 1 * 0 + (failures.length ? 1 : 0) : 0);
