#!/usr/bin/env node
/**
 * Fails a deploy early when a required environment variable is missing, so a
 * broken build never reaches staging or a preview URL.
 *
 * Usage: node scripts/verify-deploy-env.mjs <staging|preview|production>
 */
const target = process.argv[2] ?? "staging";

const REQUIRED = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = REQUIRED.filter((name) => !process.env[name]);

if (missing.length > 0) {
  // Names only — never echo values.
  console.error(`[${target}] missing required environment variables:`);
  for (const name of missing) console.error(`  - ${name}`);
  console.error(
    "\nSet repository variables (VITE_*/URL values) and repository secrets (service role key) for this environment.",
  );
  process.exit(1);
}

console.log(`[${target}] all ${REQUIRED.length} required environment variables are present.`);
