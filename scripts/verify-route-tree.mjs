#!/usr/bin/env node
/**
 * Preflight: verify every file referenced by src/routeTree.gen.ts exists.
 * Fails loudly with a clear message instead of letting Vite serve a blank
 * screen when a route file was deleted but the generated tree is stale.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const treePath = resolve(root, "src/routeTree.gen.ts");

if (!existsSync(treePath)) {
  // Not generated yet — the router plugin will create it on first dev/build.
  process.exit(0);
}

const src = readFileSync(treePath, "utf8");
// Match: from './routes/foo.tsx' or "./routes/foo/bar.tsx"
const importRe = /from\s+['"](\.\/routes\/[^'"]+)['"]/g;
const missing = [];
const seen = new Set();

for (const m of src.matchAll(importRe)) {
  const rel = m[1];
  if (seen.has(rel)) continue;
  seen.add(rel);
  const abs = resolve(root, "src", rel);
  // Try as-is, then with .tsx/.ts/.jsx/.js extensions, then /index variants.
  const candidates = [
    abs,
    `${abs}.tsx`,
    `${abs}.ts`,
    `${abs}.jsx`,
    `${abs}.js`,
    resolve(abs, "index.tsx"),
    resolve(abs, "index.ts"),
  ];
  if (!candidates.some((p) => existsSync(p))) {
    missing.push(rel);
  }
}

if (missing.length > 0) {
  console.error("\n\u001b[31m✗ routeTree.gen.ts references missing route files:\u001b[0m");
  for (const m of missing) console.error(`   - src/${m}`);
  console.error(
    "\nThis usually means a route file was deleted but the generated route tree is stale.\n" +
      "Fix: run `node scripts/clean-dev.mjs` (or `bun run clean`) and restart the dev server.\n",
  );
  process.exit(1);
}

console.log(`✓ routeTree.gen.ts OK (${seen.size} route files verified)`);
