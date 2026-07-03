#!/usr/bin/env node
/**
 * Quick CI / build-time guard for the /compare page.
 *
 * 1. Ensures src/routes/_app.compare.tsx exists and type-checks (compiles).
 * 2. Ensures every expected compare analytics event is still wired up, so a
 *    refactor can't silently drop a `trackModuleEvent("compare", ...)` call.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const file = resolve(root, "src/routes/_app.compare.tsx");

if (!existsSync(file)) {
  console.error("\u001b[31m✗ src/routes/_app.compare.tsx is missing\u001b[0m");
  process.exit(1);
}

const src = readFileSync(file, "utf8");

// Every interaction the /compare page is expected to track.
const EXPECTED_INTERACTIONS = [
  "remove_from_compare",
  "clear_comparison",
  "export_pdf",
  "share_comparison",
  "sort_table",
  "paginate_table",
  "row_expand",
];

const missing = EXPECTED_INTERACTIONS.filter(
  (i) => !src.includes(`interaction: "${i}"`),
);

if (missing.length > 0) {
  console.error("\u001b[31m✗ /compare is missing analytics events:\u001b[0m");
  for (const m of missing) console.error(`   - interaction: "${m}"`);
  process.exit(1);
}

// Sanity: each event must fire through trackModuleEvent("compare", ...).
const compareCalls = (src.match(/trackModuleEvent\("compare"/g) || []).length;
if (compareCalls < EXPECTED_INTERACTIONS.length) {
  console.error(
    `\u001b[31m✗ expected >= ${EXPECTED_INTERACTIONS.length} trackModuleEvent("compare", ...) calls, found ${compareCalls}\u001b[0m`,
  );
  process.exit(1);
}

// Type-check the project so a broken /compare page fails the build.
console.log("• type-checking (tsgo)…");
const tc = spawnSync("bunx", ["tsgo", "--noEmit"], { cwd: root, stdio: "inherit" });
if (tc.status !== 0) {
  console.error("\u001b[31m✗ type-check failed — /compare (or the project) does not compile\u001b[0m");
  process.exit(tc.status ?? 1);
}

console.log(
  `\u001b[32m✓ /compare compiles and all ${EXPECTED_INTERACTIONS.length} compare analytics events are wired.\u001b[0m`,
);
