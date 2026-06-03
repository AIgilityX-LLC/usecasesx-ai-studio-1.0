#!/usr/bin/env node
/**
 * Clear stale Vite / TanStack caches and the generated route tree.
 * The TanStack Router Vite plugin will regenerate src/routeTree.gen.ts
 * on the next dev/build run, picking up added or removed route files.
 */
import { rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const full = process.argv.includes("--full");

const targets = [
  "node_modules/.vite",
  "node_modules/.cache",
  ".nitro",
  ".output",
  ".tanstack",
  // routeTree.gen.ts is only wiped on `--full` (explicit `bun run clean`),
  // never on plain `dev` — deleting it on every boot races the router plugin
  // and leaves Vite unable to resolve src/router.tsx's import.
  ...(full ? ["src/routeTree.gen.ts"] : []),
];

for (const rel of targets) {
  const abs = resolve(root, rel);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    console.log(`  cleaned ${rel}`);
  }
}
console.log("✓ caches cleared");
