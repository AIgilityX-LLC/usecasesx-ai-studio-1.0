#!/usr/bin/env node
/**
 * CI test-mode env bootstrap.
 *
 * Playwright UI specs only need the app to boot; they never talk to a real
 * backend. Rather than failing the pipeline when backend secrets are absent,
 * we materialise a .env with clearly-labelled placeholders.
 *
 * Production protections are untouched:
 *   • runs only when CI=1 (or --force)
 *   • never overwrites an existing .env or an already-set variable
 *   • placeholder values are obviously fake and non-routable
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const force = process.argv.includes("--force");
if (!process.env.CI && !force) {
  console.log("ci-test-env: not running in CI — skipped.");
  process.exit(0);
}

const PLACEHOLDERS = {
  SUPABASE_URL: "https://placeholder-ci.supabase.co",
  SUPABASE_PROJECT_ID: "placeholder-ci",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ci_placeholder_key_not_real",
  VITE_SUPABASE_URL: "https://placeholder-ci.supabase.co",
  VITE_SUPABASE_PROJECT_ID: "placeholder-ci",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ci_placeholder_key_not_real",
};

const existing = new Map();
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) existing.set(match[1], match[2]);
  }
}

const lines = [];
const usedPlaceholder = [];
for (const [key, placeholder] of Object.entries(PLACEHOLDERS)) {
  const fromEnv = process.env[key];
  const fromFile = existing.get(key);
  const value = (fromEnv && fromEnv.length > 0 && fromEnv) || fromFile || placeholder;
  if (value === placeholder) usedPlaceholder.push(key);
  lines.push(`${key}=${value}`);
}

writeFileSync(".env", `${lines.join("\n")}\n`);
console.log(
  usedPlaceholder.length
    ? `ci-test-env: wrote .env (placeholders for ${usedPlaceholder.join(", ")})`
    : "ci-test-env: wrote .env from provided secrets.",
);
