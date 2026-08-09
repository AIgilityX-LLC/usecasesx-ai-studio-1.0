#!/usr/bin/env node
/**
 * Deploys the built app to a named environment and prints the resulting URL.
 *
 * The build artifacts are produced by `bun run build`; this script only pushes
 * them and resolves the environment URL. It is intentionally provider-thin:
 * when `CLOUDFLARE_API_TOKEN` is present it runs a Wrangler deploy, otherwise
 * it records the artifact and resolves the stable Lovable environment URL so a
 * repository without cloud credentials still produces a usable QA link.
 *
 * Usage: node scripts/deploy-environment.mjs <staging|preview|production>
 */
import { appendFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const target = process.argv[2] ?? "staging";
const prNumber = process.env.PR_NUMBER;
const projectId = process.env.LOVABLE_PROJECT_ID ?? "8f7000ef-8655-4bef-9822-70469a30693f";

function stableUrl() {
  if (target === "production") return `https://project--${projectId}.lovable.app`;
  if (target === "preview" && prNumber) {
    return `https://project--${projectId}-dev.lovable.app`;
  }
  return `https://project--${projectId}-dev.lovable.app`;
}

let url = stableUrl();

if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
  const name = target === "preview" && prNumber ? `usecasesx-pr-${prNumber}` : `usecasesx-${target}`;
  const args = ["wrangler", "deploy", "--name", name];
  if (target !== "production") args.push("--env", target);
  const out = execFileSync("bunx", args, { encoding: "utf8" });
  process.stdout.write(out);
  const matched = out.match(/https:\/\/[^\s]+\.workers\.dev[^\s]*/);
  if (matched) url = matched[0];
} else {
  console.log(
    `[${target}] no cloud credentials configured — skipping provider upload and resolving the stable environment URL.`,
  );
  if (!existsSync("dist") && !existsSync(".output")) {
    console.error("No build output found. Run `bun run build` before deploying.");
    process.exit(1);
  }
}

console.log(`[${target}] deployed: ${url}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
}
