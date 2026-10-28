#!/usr/bin/env node
/**
 * Ensures database changes land only as version-controlled migrations.
 *
 * On pull_request events (when GITHUB_BASE_REF is set), fails if SQL files were
 * added/changed outside supabase/migrations/.
 *
 * Usage: node scripts/ci-migration-guard.mjs
 */
import { execFileSync } from "node:child_process";

const base = process.env.GITHUB_BASE_REF;
if (!base) {
  console.log("ci-migration-guard: no GITHUB_BASE_REF — skipped (not a PR).");
  process.exit(0);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

try {
  git("fetch", "origin", base, "--depth=1");
} catch {
  // shallow fetch may already include base
}

let diff = "";
try {
  diff = git("diff", "--name-only", `origin/${base}...HEAD`);
} catch {
  diff = git("diff", "--name-only", `origin/${base}`, "HEAD");
}

const files = diff ? diff.split("\n").filter(Boolean) : [];
const sqlOutside = files.filter(
  (f) =>
    f.endsWith(".sql") &&
    !f.startsWith("supabase/migrations/") &&
    !f.startsWith("scripts/seed/") &&
    !f.startsWith("docs/"),
);

if (sqlOutside.length > 0) {
  console.error("::error::Database SQL changes must use version-controlled migrations.");
  console.error("Offending paths:");
  for (const f of sqlOutside) console.error(`  - ${f}`);
  console.error("Place additive migrations under supabase/migrations/ (see AGENTS.md §5).");
  process.exit(1);
}

const migrations = files.filter((f) => f.startsWith("supabase/migrations/") && f.endsWith(".sql"));
if (migrations.length) {
  console.log(`ci-migration-guard: ${migrations.length} migration file(s) in this PR.`);
} else {
  console.log("ci-migration-guard: no migration changes.");
}
process.exit(0);
