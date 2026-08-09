#!/usr/bin/env node
/**
 * Generates release notes from the commits between the last tag and HEAD.
 *
 * Commits are grouped by Conventional Commit type; anything unprefixed lands
 * under "Other changes" rather than being dropped, so the notes never quietly
 * omit work. Output goes to stdout and, in CI, to $GITHUB_OUTPUT as `notes`.
 *
 * Usage: node scripts/release-notes.mjs [--from <ref>] [--to <ref>]
 */
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function git(...cmd) {
  return execFileSync("git", cmd, { encoding: "utf8" }).trim();
}

let from = flag("--from");
if (!from) {
  try {
    from = git("describe", "--tags", "--abbrev=0");
  } catch {
    from = git("rev-list", "--max-parents=0", "HEAD").split("\n")[0];
  }
}
const to = flag("--to") ?? "HEAD";

const log = git("log", "--no-merges", "--pretty=format:%s|%h", `${from}..${to}`);
const commits = log ? log.split("\n") : [];

const SECTIONS = [
  ["feat", "Features"],
  ["fix", "Fixes"],
  ["perf", "Performance"],
  ["security", "Security"],
  ["refactor", "Refactoring"],
  ["docs", "Documentation"],
  ["test", "Tests"],
  ["chore", "Chores"],
  ["ci", "CI & release"],
];

const buckets = new Map(SECTIONS.map(([key]) => [key, []]));
const other = [];

for (const line of commits) {
  const [subject, sha] = line.split("|");
  const match = /^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/.exec(subject ?? "");
  const entry = (text) => `- ${text} (${sha})`;
  if (match && buckets.has(match[1].toLowerCase())) {
    buckets.get(match[1].toLowerCase()).push(entry(match[2]));
  } else {
    other.push(entry(subject ?? ""));
  }
}

const lines = [`## Changes since ${from}`, ""];
for (const [key, title] of SECTIONS) {
  const items = buckets.get(key);
  if (items.length === 0) continue;
  lines.push(`### ${title}`, ...items, "");
}
if (other.length > 0) lines.push("### Other changes", ...other, "");
if (commits.length === 0) lines.push("_No commits in this range._", "");

lines.push(
  "### Release gate",
  "See `docs/RELEASE_CHECKLIST.md` — every item must be ticked before promoting to production.",
);

const notes = lines.join("\n");
console.log(notes);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `notes<<RELEASE_NOTES_EOF\n${notes}\nRELEASE_NOTES_EOF\n`,
  );
}
