#!/usr/bin/env node
/**
 * Fail if privileged secret patterns appear in client-imported source.
 * Does not print matched secret values — file + pattern name only.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";
const SKIP_DIR = new Set(["node_modules", "dist", ".git"]);
/** Server-only path markers — allowed to reference env secret names. */
const SERVERISH =
  /\.(server|functions)\.(ts|tsx|js|mjs)$|[/\\]server[/\\]|[/\\]integrations[/\\]supabase[/\\]client\.server\.ts$|[/\\]routes[/\\](api|lovable)[/\\]|[/\\]email-templates[/\\]|[/\\]ops[/\\]production-config\.ts$/i;

const PATTERNS = [
  { name: "service_role_env_read", re: /process\.env\[[\"'](?:SUPABASE_SERVICE_ROLE_KEY|DB_SERVICE_ROLE_KEY)[\"']\]|process\.env\.(?:SUPABASE_SERVICE_ROLE_KEY|DB_SERVICE_ROLE_KEY)/ },
  { name: "lovable_api_key_env", re: /process\.env\[[\"']LOVABLE_API_KEY[\"']\]|process\.env\.LOVABLE_API_KEY/ },
  { name: "openai_sk_literal", re: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "anthropic_key_literal", re: /sk-ant-[a-zA-Z0-9\-_]{20,}/ },
  { name: "jwt_service_role_claim", re: /[\"']role[\"']\s*:\s*[\"']service_role[\"']/ },
];

const findings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) checkFile(p);
  }
}

function checkFile(path) {
  if (SERVERISH.test(path)) return;
  // Allow listing secret *names* in ops/docs-like modules that are not client UI —
  // still block process.env reads of those names outside .server.ts
  const text = readFileSync(path, "utf8");
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) {
      findings.push({ file: relative(process.cwd(), path).replace(/\\/g, "/"), pattern: name });
    }
  }
}

walk(ROOT);

if (findings.length) {
  console.error("Client secret boundary violations (pattern names only):");
  for (const f of findings) console.error(`- ${f.pattern} @ ${f.file}`);
  process.exit(1);
}

console.log("✓ no privileged secret patterns in client-imported src paths");
