import fs from "node:fs";

const sql = fs.readFileSync("docs/migration/full-schema.sql", "utf8");

function splitStatements(text) {
  const stmts = [];
  let i = 0;
  let start = 0;
  let inDollar = null;
  let inSingle = false;
  while (i < text.length) {
    const ch = text[i];
    if (inDollar) {
      if (text.startsWith(inDollar, i)) {
        i += inDollar.length;
        inDollar = null;
        continue;
      }
      i++;
      continue;
    }
    if (inSingle) {
      if (ch === "'" && text[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (ch === "'") {
        inSingle = false;
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      i++;
      continue;
    }
    if (ch === "$") {
      const m = text.slice(i).match(/^\$([A-Za-z_]*)\$/);
      if (m) {
        inDollar = "$" + m[1] + "$";
        i += inDollar.length;
        continue;
      }
    }
    if (ch === ";") {
      const stmt = text.slice(start, i + 1).trim();
      if (stmt) stmts.push(stmt);
      start = i + 1;
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail) stmts.push(tail);
  return stmts;
}

// --- Function dependency order (SQL language only validates at CREATE) ---
const p6 = sql.indexOf("-- Phase 6: CREATE OR REPLACE FUNCTION");
const p6b = sql.indexOf("-- Phase 6b: CREATE VIEW\n");
const phase6 = sql.slice(p6, p6b);
const funcs = splitStatements(phase6).filter((s) =>
  /^CREATE OR REPLACE FUNCTION/i.test(s),
);
const byName = new Map();
for (const body of funcs) {
  const name = body.match(/^CREATE OR REPLACE FUNCTION (public\.\w+)/i)[1];
  byName.set(name, body);
}
const names = new Set(byName.keys());
const depsOf = new Map();
for (const [name, body] of byName) {
  const asIdx = body.search(/AS\s+\$/i);
  const impl = asIdx >= 0 ? body.slice(asIdx) : body;
  const deps = [];
  const callRe = /public\.(\w+)\s*\(/g;
  let c;
  while ((c = callRe.exec(impl))) {
    const callee = "public." + c[1];
    if (callee !== name && names.has(callee) && !deps.includes(callee))
      deps.push(callee);
  }
  depsOf.set(name, deps);
}
const defined = new Set();
const forward = [];
for (const name of byName.keys()) {
  for (const d of depsOf.get(name)) {
    if (!defined.has(d)) forward.push({ fn: name, needs: d });
  }
  defined.add(name);
}

console.log("=== Function forward refs ===");
console.log(forward.length ? forward : "none");
console.log(
  "has_role @",
  [...byName.keys()].indexOf("public.has_role"),
  "is_admin_tier @",
  [...byName.keys()].indexOf("public.is_admin_tier"),
  "has_pro_entitlement @",
  [...byName.keys()].indexOf("public.has_pro_entitlement"),
);

// --- FK refs to non-unique columns ---
const tables = {};
const tableRe =
  /CREATE TABLE IF NOT EXISTS (public\.\w+)\s*\(([\s\S]*?)\n\);/g;
let m;
while ((m = tableRe.exec(sql))) {
  const unique = new Set();
  const body = m[2];
  const pk = body.match(/PRIMARY KEY\s*\(([^)]+)\)/);
  if (pk) pk[1].split(",").forEach((c) => unique.add(c.trim()));
  for (const line of body.split("\n")) {
    const cm = line.match(/^\s+(\w+)\s+.+?\bUNIQUE\b/);
    if (cm) unique.add(cm[1]);
  }
  tables[m[1]] = unique;
}
const idxRe =
  /CREATE UNIQUE INDEX[^\n]*ON\s+(public\.\w+)\s*\(([^)]+)\)/gi;
while ((m = idxRe.exec(sql))) {
  const cols = m[2].split(",").map((s) => s.trim().replace(/\s+.*$/, ""));
  if (cols.length === 1 && tables[m[1]]) tables[m[1]].add(cols[0]);
}
const brokenFk = [];
const fkRe =
  /ALTER TABLE (public\.\w+) ADD CONSTRAINT (\w+) FOREIGN KEY \(([^)]+)\) REFERENCES (public\.\w+)\s*\(([^)]+)\)/g;
while ((m = fkRe.exec(sql))) {
  const refCols = m[5].split(",").map((s) => s.trim());
  if (refCols.length === 1 && (!tables[m[4]] || !tables[m[4]].has(refCols[0]))) {
    brokenFk.push({
      constraint: m[2],
      from: m[1],
      ref: m[4],
      refCol: refCols[0],
    });
  }
}
console.log("\n=== Broken FKs ===");
console.log(brokenFk.length ? brokenFk : "none");

// --- Policies/views calling missing functions ---
const missingCalls = new Set();
const callRe = /\b(public\.[a-z_][a-z0-9_]*)\s*\(/gi;
while ((m = callRe.exec(sql))) {
  const n = m[1];
  if (!names.has(n) && !/^public\.(gen_random_uuid)$/.test(n)) {
    // ignore table-ish: if CREATE TABLE exists for it, skip
    if (tables[n]) continue;
    // ignore if only appears as DROP FUNCTION
    missingCalls.add(n);
  }
}
// Filter: keep only those that appear outside DROP FUNCTION lines
const realMissing = [...missingCalls].filter((n) => {
  const re = new RegExp(
    String.raw`(?<!DROP FUNCTION IF EXISTS )${n.replace(".", "\\.")}\s*\(`,
  );
  // simpler: if CREATE OR REPLACE FUNCTION exists, not missing
  if (sql.includes("CREATE OR REPLACE FUNCTION " + n)) return false;
  // if it's a type cast like public.app_role - types aren't functions
  if (sql.includes("CREATE TYPE " + n + " ")) return false;
  return true;
});
console.log("\n=== Possibly missing functions referenced ===");
console.log(realMissing.length ? realMissing.sort() : "none");

// Structure
console.log("\n=== Structure ===");
console.log("lines", sql.split(/\n/).length);
console.log(
  "phases",
  [1, 2, 3, 4, 5, 6, "6b", 7, 8, 9, 10, 11]
    .map((p) => {
      const marker =
        p === "6b" ? "-- Phase 6b: CREATE VIEW" : `-- Phase ${p}:`;
      // count only body markers (not TOC): prefer those followed by dashes or newline+CREATE
      return `${p}:${(sql.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length}`;
    })
    .join(" "),
);
console.log("ai_engines UNIQUE", /slug text NOT NULL UNIQUE/.test(sql));
