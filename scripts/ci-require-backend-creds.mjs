#!/usr/bin/env node
/**
 * Enterprise CI helper: decide whether backend-backed suites can run.
 *
 * Same-repository PRs / pushes MUST have SUPABASE_* secrets configured —
 * missing credentials fail the Critical gates job.
 * Fork PRs cannot receive secrets; they skip isolation/integration with a warning.
 *
 * Outputs:
 *   available=true|false  → $GITHUB_OUTPUT
 */
import { appendFileSync } from "node:fs";

const url = process.env.SUPABASE_URL?.trim() ?? "";
const pub = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
const role = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const available = Boolean(url && pub && role);

const eventName = process.env.GITHUB_EVENT_NAME ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const headRepo = process.env.GITHUB_HEAD_REPOSITORY ?? repository;
const isFork = Boolean(headRepo && repository && headRepo !== repository);

function writeOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

writeOutput("available", available ? "true" : "false");

if (available) {
  console.log("Backend credentials present — isolation/integration suites will run.");
  process.exit(0);
}

if (isFork || (eventName === "pull_request" && headRepo !== repository)) {
  console.warn(
    "::warning::Fork PR detected without backend secrets — skipping isolation/integration suites.",
  );
  process.exit(0);
}

console.error(
  [
    "::error::Critical gate: backend credentials are required for tenant-isolation and RLS tests.",
    "Configure repository Actions secrets (names only — never commit values):",
    "  SUPABASE_URL",
    "  SUPABASE_PUBLISHABLE_KEY",
    "  SUPABASE_SERVICE_ROLE_KEY",
    "Optional for demo-backed suites:",
    "  SMOKE_DEMO_EMAIL",
    "  SMOKE_DEMO_PASSWORD",
    "Template: .github/deployment-env.example",
    "Docs: docs/cicd/README.md",
  ].join("\n"),
);
process.exit(1);
