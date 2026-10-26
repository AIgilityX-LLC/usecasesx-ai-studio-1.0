import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";

const reportPath = "scripts/audit/gitleaks-report.json";
if (!existsSync(reportPath)) {
  console.error("missing", reportPath);
  process.exit(1);
}

const findings = JSON.parse(readFileSync(reportPath, "utf8"));
const rows = findings.map((f) => ({
  type: f.RuleID,
  file: f.File,
  commit: (f.Commit || "").slice(0, 12),
}));

const byType = {};
const byFile = {};
for (const r of rows) {
  byType[r.type] = (byType[r.type] || 0) + 1;
  byFile[r.file] = (byFile[r.file] || 0) + 1;
}

const lines = [
  "# Gitleaks summary (redacted)",
  "",
  "Scanned: full git history (`gitleaks detect --log-opts=--all`, 2651 commits). **Secret values are not stored in this file.**",
  "",
  "| Metric | Value |",
  "| ------ | ----- |",
  `| Findings | ${rows.length} |`,
  "",
  "## By rule",
  "",
  ...Object.entries(byType).map(([k, v]) => `- \`${k}\`: ${v}`),
  "",
  "## By file",
  "",
  ...Object.entries(byFile).map(([k, v]) => `- \`${k}\`: ${v}`),
  "",
  "## Findings (type / file / commit only)",
  "",
  "| Type | File | Commit |",
  "| ---- | ---- | ------ |",
  ...rows.map((r) => `| ${r.type} | \`${r.file}\` | ${r.commit} |`),
  "",
  "Human follow-up: historical `.env` material in git history — rotate any keys that remain valid; keep `.env` untracked.",
  "",
];

writeFileSync("docs/refactor/gitleaks-summary.md", lines.join("\n"), "utf8");
unlinkSync(reportPath);
console.log("wrote docs/refactor/gitleaks-summary.md; removed raw report");
