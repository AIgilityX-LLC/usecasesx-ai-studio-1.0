import fs from "node:fs";

const path = "docs/migration/full-schema.sql";
const sql = fs.readFileSync(path, "utf8");

const P6 = "-- Phase 6: CREATE OR REPLACE FUNCTION";
const P6B = "-- Phase 6b: CREATE VIEW\n-- ---------------------------------------------------------------------------";

const firstP6 = sql.indexOf(P6);
const secondP6 = sql.indexOf(P6, firstP6 + 10);
const realP6b = sql.indexOf(P6B);

if (firstP6 < 0 || secondP6 < 0 || realP6b < 0) {
  throw new Error(`Markers missing: firstP6=${firstP6} secondP6=${secondP6} realP6b=${realP6b}`);
}

// Prefix: everything through Phase 6 title + following dashes line
const afterFirstP6 = sql.indexOf("\n", firstP6);
const dashes = sql.indexOf("-- ---------------------------------------------------------------------------\n", afterFirstP6);
if (dashes < 0 || dashes > secondP6) {
  throw new Error("Could not find Phase 6 separator after first marker");
}
const prefixEnd = dashes + "-- ---------------------------------------------------------------------------\n".length;
const prefix = sql.slice(0, prefixEnd);

// Function bodies from the intact second Phase 6 copy
const secondDashes = sql.indexOf("-- ---------------------------------------------------------------------------\n", secondP6);
const funcsStart = secondDashes + "-- ---------------------------------------------------------------------------\n".length;
const funcsRaw = sql.slice(funcsStart, realP6b);
const suffix = sql.slice(realP6b);

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

const stmts = splitStatements(funcsRaw).filter((s) =>
  /^CREATE OR REPLACE FUNCTION/i.test(s),
);

if (stmts.length < 40) {
  throw new Error(`Expected ~45 functions, got ${stmts.length}`);
}

const funcs = stmts.map((body) => {
  const hm = body.match(/^CREATE OR REPLACE FUNCTION (public\.\w+)\s*\(/i);
  if (!hm) throw new Error("Unparseable:\n" + body.slice(0, 160));
  const name = hm[1];
  const lang = (body.match(/LANGUAGE\s+(\w+)/i) || [])[1]?.toLowerCase() || "unknown";
  const asIdx = body.search(/AS\s+\$/i);
  const impl = asIdx >= 0 ? body.slice(asIdx) : body;
  const calls = new Set();
  const callRe = /public\.(\w+)\s*\(/g;
  let c;
  while ((c = callRe.exec(impl))) {
    const callee = "public." + c[1];
    if (callee !== name) calls.add(callee);
  }
  return { name, lang, body, calls: [...calls] };
});

const names = new Set(funcs.map((f) => f.name));
const depsOf = new Map();
for (const f of funcs) {
  depsOf.set(
    f.name,
    f.calls.filter((c) => names.has(c)),
  );
}

console.log("Restored functions:", funcs.length);
for (const f of funcs) {
  const deps = depsOf.get(f.name);
  if (deps.length) console.log(`  ${f.name} [${f.lang}] -> ${deps.join(", ")}`);
}

const indeg = new Map(funcs.map((f) => [f.name, 0]));
const reverse = new Map(funcs.map((f) => [f.name, []]));
for (const f of funcs) {
  for (const d of depsOf.get(f.name)) {
    indeg.set(f.name, indeg.get(f.name) + 1);
    reverse.get(d).push(f.name);
  }
}

const byName = new Map(funcs.map((f) => [f.name, f]));
const orderIndex = new Map(funcs.map((f, i) => [f.name, i]));
const ready = funcs
  .filter((f) => indeg.get(f.name) === 0)
  .map((f) => f.name)
  .sort((a, b) => orderIndex.get(a) - orderIndex.get(b));

const sorted = [];
while (ready.length) {
  const n = ready.shift();
  sorted.push(byName.get(n));
  for (const dep of reverse.get(n)) {
    indeg.set(dep, indeg.get(dep) - 1);
    if (indeg.get(dep) === 0) {
      ready.push(dep);
      ready.sort((a, b) => orderIndex.get(a) - orderIndex.get(b));
    }
  }
}

if (sorted.length !== funcs.length) {
  const left = funcs.filter((f) => !sorted.includes(f));
  console.error("CYCLE leftover:", left.map((f) => f.name));
  for (const f of left) sorted.push(f);
}

const defined = new Set();
const remaining = [];
for (const f of sorted) {
  for (const d of depsOf.get(f.name)) {
    if (!defined.has(d)) remaining.push({ fn: f.name, needs: d, lang: f.lang });
  }
  defined.add(f.name);
}
console.log("Forward refs after sort:", remaining.length);
remaining.forEach((o) => console.log(`  ${o.fn} [${o.lang}] needs ${o.needs}`));

const phase6Body =
  sorted.map((f) => f.body.replace(/\s*;\s*$/, "") + ";").join("\n\n") + "\n\n";

const out = prefix + phase6Body + suffix;
fs.writeFileSync(path, out);

const lines = out.split(/\n/).length;
console.log("Wrote", path, "lines=", lines);
console.log(
  "Key order:",
  ["public.has_role", "public.is_admin_tier", "public.has_pro_entitlement", "public.is_editor_tier"]
    .map((n) => `${n.split(".")[1]}=${sorted.findIndex((f) => f.name === n)}`)
    .join(", "),
);

// sanity: no duplication of Phase 1
const p1 = out.split("-- Phase 1: DROP FUNCTION").length - 1;
const p6 = out.split("-- Phase 6: CREATE OR REPLACE FUNCTION").length - 1;
console.log("Phase 1 count:", p1, "Phase 6 count:", p6);
console.log("ai_engines UNIQUE still present:", /slug text NOT NULL UNIQUE/.test(out));
