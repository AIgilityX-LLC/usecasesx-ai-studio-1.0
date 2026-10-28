#!/usr/bin/env node
/**
 * Generates / updates CHANGELOG.md Unreleased (or a version section) from git.
 *
 * Usage:
 *   node scripts/generate-changelog.mjs                 # refresh [Unreleased]
 *   node scripts/generate-changelog.mjs --version v1.2.0
 *   node scripts/generate-changelog.mjs --version v1.2.0 --write
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const write = args.includes("--write");
const version = flag("--version"); // e.g. v1.2.0

function git(...cmd) {
  return execFileSync("git", cmd, { encoding: "utf8" }).trim();
}

let from;
try {
  from = git("describe", "--tags", "--abbrev=0");
} catch {
  from = git("rev-list", "--max-parents=0", "HEAD").split("\n")[0];
}
const to = "HEAD";
const log = git("log", "--no-merges", "--pretty=format:%s", `${from}..${to}`);
const subjects = log ? log.split("\n") : [];

const buckets = {
  Added: [],
  Changed: [],
  Fixed: [],
  Security: [],
  Migrations: [],
  Removed: [],
};

for (const subject of subjects) {
  const m = /^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/.exec(subject);
  const type = m?.[1]?.toLowerCase() ?? "";
  const text = m?.[2] ?? subject;
  const bullet = `- ${text}`;
  if (type === "feat") buckets.Added.push(bullet);
  else if (type === "fix") buckets.Fixed.push(bullet);
  else if (type === "security") buckets.Security.push(bullet);
  else if (type === "refactor" || type === "perf" || type === "chore" || type === "ci")
    buckets.Changed.push(bullet);
  else if (/migration|supabase\/migrations/i.test(subject)) buckets.Migrations.push(bullet);
  else if (type === "docs" || type === "test") buckets.Changed.push(bullet);
  else buckets.Changed.push(bullet);
}

const heading = version
  ? `## [${version.replace(/^v/, "")}] — ${new Date().toISOString().slice(0, 10)}`
  : "## [Unreleased]";

const sectionLines = [heading, ""];
for (const [title, items] of Object.entries(buckets)) {
  if (items.length === 0) continue;
  sectionLines.push(`### ${title}`, "", ...items, "");
}
if (sectionLines.length === 2) {
  sectionLines.push("### Changed", "", "- No user-facing changes in this range.", "");
}

const generated = sectionLines.join("\n");
console.log(generated);

if (!write) process.exit(0);

const path = "CHANGELOG.md";
if (!existsSync(path)) {
  writeFileSync(
    path,
    `# Changelog\n\n${generated}\n`,
  );
  console.error(`Wrote new ${path}`);
  process.exit(0);
}

const existing = readFileSync(path, "utf8");
const unreleasedRe = /## \[Unreleased\][\s\S]*?(?=\n## |\n$)/;
if (version) {
  // Insert version section after the title block / Unreleased
  const next = existing.replace(
    unreleasedRe,
    `## [Unreleased]\n\n### Added\n\n- None yet.\n\n---\n\n${generated}\n\n`,
  );
  writeFileSync(path, next);
} else if (unreleasedRe.test(existing)) {
  writeFileSync(path, existing.replace(unreleasedRe, `${generated}\n`));
} else {
  writeFileSync(path, existing.replace(/^# Changelog\s*\n/, `# Changelog\n\n${generated}\n`));
}
console.error(`Updated ${path}`);
