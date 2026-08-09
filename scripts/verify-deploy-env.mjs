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
  const scope = target.toUpperCase();
  // Names only — never echo values.
  console.error(
    `::error::[${target}] deploy stopped: ${missing.length} required environment variable(s) missing.`,
  );
  console.error(`\n[${target}] missing required environment variables:`);
  for (const name of missing) console.error(`  - ${name}`);
  console.error(
    [
      "",
      "How to fix:",
      `  1. Open GitHub → Settings → Secrets and variables → Actions.`,
      `  2. Add the ${scope}_* entries under Variables (URLs, publishable keys, project id).`,
      `  3. Add the service role key and CLOUDFLARE_* credentials under Secrets.`,
      "  4. Re-run this workflow.",
      "",
      "Full name-by-name template: .github/deployment-env.example",
      "Reference table:            docs/process/deployment-environment.md",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`[${target}] all ${REQUIRED.length} required environment variables are present.`);
