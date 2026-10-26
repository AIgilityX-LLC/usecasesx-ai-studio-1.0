import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const log = execSync("git log --first-parent --since=2026-07-28 --format=%s", {
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const sec = [];
const fix = [];
const add = [];
const chg = [];

const isSec = (s) =>
  /security|rls|secret|\.env|auth polic|hardened|secured|vulnerab|SELECT_SCALARS|service-role|stop tracking \.env/i.test(
    s,
  );
const isFix = (s) => /^(fix\b|fixed\b)/i.test(s) || /\bfix(ed|es)?\b/i.test(s);
const isAdd = (s) =>
  /^(add|added|feat|ship|implement|enabled|created|provisioned|seeded)/i.test(s) ||
  /\badded\b/i.test(s);

for (const s of log) {
  if (isSec(s)) sec.push(s);
  else if (isFix(s)) fix.push(s);
  else if (isAdd(s)) add.push(s);
  else chg.push(s);
}

const uniq = (a) => [...new Set(a)];

const bullet = (items) =>
  uniq(items)
    .map((s) => `- ${s}`)
    .join("\n");

const body = `# Changelog

All notable changes to AIgilityX **UseCasesX™** are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow release tags.

Per-release detail lives in \`docs/releases/<date>-<slug>.md\` using \`docs/process/release-notes-template.md\`.

## Cutting the first release (humans only)

1. Ensure \`docs/process/github-settings.md\` items 1–4 are applied.
2. History since 2026-07-28 is reconstructed below under **[Unreleased]** — review and edit grouping if needed; do not invent entries.
3. From GitHub Actions → **Release Please** → *Run workflow* (\`workflow_dispatch\` only). Review the draft release PR; merge when ready.
4. Alternatively, after a human-approved tag \`v*\`, the existing \`.github/workflows/release.yml\` can draft GitHub release notes.
5. **Agents must not create tags** or push to \`main\`.

Manifest seed: \`.release-please-manifest.json\` → \`1.0.0-rc.1\` (matches \`package.json\`).

## [Unreleased]

> Reconstructed from git first-parent history since **2026-07-28**. Subjects are commit messages as recorded; grouping is heuristic (Added / Changed / Fixed / Security). Invented product claims were not added.

### Added

${bullet(add) || "- _(none)_"}

### Changed

${bullet(chg) || "- _(none)_"}

### Fixed

${bullet(fix) || "- _(none)_"}

### Security

${bullet(sec) || "- _(none)_"}

---

## Baseline — 2026-07-26

Baseline state pinned as \`BASELINE-T0\` (see \`docs/baseline/README.md\`). Migration head at that time: \`20260725094800_9af904b9...\`. No published GA version.
`;

writeFileSync("CHANGELOG.md", body, "utf8");
console.log(
  JSON.stringify(
    {
      added: uniq(add).length,
      changed: uniq(chg).length,
      fixed: uniq(fix).length,
      security: uniq(sec).length,
      total: log.length,
    },
    null,
    2,
  ),
);
