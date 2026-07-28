#!/usr/bin/env node
/**
 * CI nav-integrity check.
 *
 * Validates that every PRIMARY_NAV_TARGETS and SIDEBAR_NAV_TARGETS entry in
 * src/lib/nav-integrity.ts resolves to a real route in src/routeTree.gen.ts,
 * and that any redirect target is declared in EXPECTED_REDIRECTS. Mirrors the
 * dev-only useNavLinkIntegrityCheck hook so navigation drift fails the PR.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const navSrc = readFileSync(resolve(root, "src/lib/nav-integrity.ts"), "utf8");

function arrayLiteral(name) {
  const re = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`);
  const m = navSrc.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const primary = arrayLiteral("PRIMARY_NAV_TARGETS");
const sidebar = arrayLiteral("SIDEBAR_NAV_TARGETS");
const redirects = {};
const redirectBlock = navSrc.match(/EXPECTED_REDIRECTS[^{]*\{([\s\S]*?)\}/);
if (redirectBlock) {
  for (const m of redirectBlock[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) {
    redirects[m[1]] = m[2];
  }
}

const treePath = resolve(root, "src/routeTree.gen.ts");
if (!existsSync(treePath)) {
  console.error("nav-integrity: routeTree.gen.ts missing — run a build first.");
  process.exit(1);
}
const tree = readFileSync(treePath, "utf8");

// Collect declared paths from the generated route tree.
const declared = new Set(["/"]);
for (const m of tree.matchAll(/path:\s*['"]([^'"]+)['"]/g)) declared.add(m[1]);
// Full paths string also appears in the generated file id map; index it too.
for (const m of tree.matchAll(/'(\/[a-zA-Z0-9/_$:-]*)'/g)) declared.add(m[1]);

const targets = [...new Set([...primary, ...sidebar])];
const failures = [];

for (const t of targets) {
  if (redirects[t]) continue; // intentional redirect, covered separately
  // A target resolves if its first segment maps to a declared route path.
  const base = "/" + (t.split("/").filter(Boolean)[0] ?? "");
  const ok =
    declared.has(t) ||
    declared.has(base) ||
    [...declared].some((d) => d.startsWith(base + "/")) ||
    base === "/";
  if (!ok) failures.push(t);
}

// Every redirect source must point to a resolvable destination.
for (const [from, to] of Object.entries(redirects)) {
  const base = "/" + (to.split("/").filter(Boolean)[0] ?? "");
  const ok =
    declared.has(to) || declared.has(base) || [...declared].some((d) => d.startsWith(base + "/"));
  if (!ok) failures.push(`${from} -> ${to} (redirect destination missing)`);
}

if (failures.length) {
  console.error("✗ nav-integrity failed. Unresolved navigation targets:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}

console.log(
  `✓ nav-integrity passed: ${targets.length} nav targets + ${Object.keys(redirects).length} redirects resolve against the route tree.`,
);
