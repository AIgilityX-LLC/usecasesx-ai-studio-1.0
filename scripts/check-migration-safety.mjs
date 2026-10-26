#!/usr/bin/env node
/**
 * Static migration safety gate (no live DB).
 * For every CREATE TABLE public.<t> in supabase/migrations/*.sql, require
 * GRANT, ENABLE ROW LEVEL SECURITY, and CREATE POLICY in the same file.
 * Also refuse reserved-schema touches and destructive DROP TABLE/COLUMN.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
// storage.objects policies are an established app pattern; refuse structural
// DDL against auth / realtime / supabase_functions / vault.
const FORBIDDEN_SCHEMA_DDL =
  /\b(CREATE|ALTER|DROP)\b(?![\s\S]{0,40}POLICY)[\s\S]{0,80}\b(auth|realtime|supabase_functions|vault)\./i;
const CREATE_TABLE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)/gi;
const DROP_TABLE = /DROP\s+TABLE\b/i;
const DROP_COLUMN = /ALTER\s+TABLE[\s\S]{0,80}DROP\s+COLUMN\b/i;

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No migrations found under", DIR);
  process.exit(1);
}

const errors = [];
let tablesChecked = 0;

for (const file of files) {
  const path = join(DIR, file);
  const sql = readFileSync(path, "utf8");
  const upper = sql.toUpperCase();

  for (const line of sql.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("--")) continue;
    if (FORBIDDEN_SCHEMA_DDL.test(t)) {
      errors.push(`${file}: forbidden reserved-schema DDL → ${t.slice(0, 120)}`);
    }
  }

  if (DROP_TABLE.test(sql) || DROP_COLUMN.test(sql)) {
    errors.push(`${file}: destructive DROP TABLE/COLUMN requires staged plan (fail closed)`);
  }

  const tables = [...sql.matchAll(CREATE_TABLE)].map((m) => m[1]);
  for (const table of tables) {
    tablesChecked += 1;
    const hasGrant = new RegExp(`GRANT\\b[\\s\\S]{0,200}\\b${table}\\b`, "i").test(sql);
    const hasRls =
      upper.includes("ENABLE ROW LEVEL SECURITY") || upper.includes("ENABLE ROW LEVEL SECURITY;");
    // Prefer table-scoped RLS enable when present
    const rlsForTable = new RegExp(
      `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      "i",
    ).test(sql);
    const hasPolicy = /CREATE\s+POLICY\b/i.test(sql);

    if (!hasGrant) errors.push(`${file}: CREATE TABLE public.${table} missing GRANT in same file`);
    if (!hasRls && !rlsForTable)
      errors.push(`${file}: CREATE TABLE public.${table} missing ENABLE ROW LEVEL SECURITY`);
    if (!hasPolicy)
      errors.push(`${file}: CREATE TABLE public.${table} missing CREATE POLICY in same file`);
  }
}

console.log(
  JSON.stringify(
    { migrations: files.length, create_tables_checked: tablesChecked, errors: errors.length },
    null,
    2,
  ),
);

if (errors.length) {
  for (const e of errors) console.error("FAIL:", e);
  process.exit(1);
}

console.log("✓ migration safety checks passed");
