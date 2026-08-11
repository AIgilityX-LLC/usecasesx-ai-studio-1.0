/**
 * Runs every tests/*.e2e.ts integration suite against the configured backend.
 *
 * Unlike a fail-fast loop, this runs ALL suites so one early regression does not
 * hide the rest, and writes standardized evidence for each gate:
 *
 *   test-evidence/integration/<suite>.log   per-suite stdout+stderr
 *   test-evidence/integration/summary.json  machine-readable pass/fail summary
 *   test-evidence/integration/summary.md    human summary (also in the CI job log)
 *
 * Exits non-zero when any suite fails, so CI fails the build on regressions.
 * Pass --only=<substring> to narrow the run locally.
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const evidenceDir = path.resolve("test-evidence/integration");
await mkdir(evidenceDir, { recursive: true });

const files = (await readdir(new URL("../tests/", import.meta.url)))
  .filter((file) => file.endsWith(".e2e.ts"))
  .filter((file) => (only ? file.includes(only) : true))
  .sort();

const results = [];

for (const file of files) {
  const suite = file.replace(/\.e2e\.ts$/, "");
  const logPath = path.join(evidenceDir, `${suite}.log`);
  const log = createWriteStream(logPath);
  console.log(`\n━━ tests/${file} ━━`);
  const startedAt = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn("bun", ["run", `tests/${file}`], { env: process.env });
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      log.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      log.write(chunk);
    });
    child.on("exit", (status) => resolve(status ?? 1));
  });
  log.end();
  results.push({
    suite,
    file: `tests/${file}`,
    passed: code === 0,
    exitCode: code,
    durationMs: Date.now() - startedAt,
    log: path.relative(process.cwd(), logPath),
  });
}

const failed = results.filter((result) => !result.passed);

await writeFile(
  path.join(evidenceDir, "summary.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      total: results.length,
      failed: failed.length,
      results,
    },
    null,
    2,
  ),
);

const summaryMd = [
  `# Integration suite evidence`,
  ``,
  `Generated ${new Date().toISOString()} — ${results.length - failed.length}/${results.length} suites passed.`,
  ``,
  `| Suite | Result | Duration | Log |`,
  `| --- | --- | --- | --- |`,
  ...results.map(
    (r) =>
      `| ${r.suite} | ${r.passed ? "pass" : `FAIL (exit ${r.exitCode})`} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.log} |`,
  ),
  ``,
].join("\n");
await writeFile(path.join(evidenceDir, "summary.md"), summaryMd);
console.log(`\n${summaryMd}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, summaryMd, { flag: "a" });
}

if (failed.length > 0) {
  console.error(`\n❌ ${failed.length} suite(s) failed: ${failed.map((r) => r.suite).join(", ")}`);
  process.exit(1);
}

console.log(`\n✅ ${results.length} launch-readiness suites passed.`);
