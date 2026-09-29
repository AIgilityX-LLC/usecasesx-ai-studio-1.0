/**
 * Restructure docs/migration/full-schema.sql into dependency-safe phases.
 * Reads the current file; does not execute SQL against a database.
 */
import fs from "node:fs";

const PATH = "docs/migration/full-schema.sql";
const src = fs.readFileSync(PATH, "utf8");

/** Split SQL into statements, respecting dollar-quotes and strings. */
function splitStatements(sql) {
  const stmts = [];
  let i = 0;
  let start = 0;
  let inSingle = false;
  let dollarTag = null;
  while (i < sql.length) {
    const ch = sql[i];
    if (!inSingle && !dollarTag && ch === "'") {
      inSingle = true;
      i++;
      continue;
    }
    if (inSingle) {
      if (ch === "'" && sql[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i++;
      continue;
    }
    if (!dollarTag && ch === "$") {
      const m = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (m) {
        dollarTag = m[1];
        i += m[1].length;
        continue;
      }
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      i++;
      continue;
    }
    if (ch === ";") {
      const stmt = sql.slice(start, i + 1).trim();
      if (stmt && !/^;+$/.test(stmt)) stmts.push(stmt);
      i++;
      start = i;
      continue;
    }
    i++;
  }
  const tail = sql.slice(start).trim();
  if (tail) stmts.push(tail.endsWith(";") ? tail : tail + ";");
  return stmts;
}

/** Strip leading comment lines from a statement; return {comments, body}. */
function peelComments(stmt) {
  const lines = stmt.split("\n");
  const comments = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === "" || t.startsWith("--")) {
      comments.push(lines[i]);
      i++;
      continue;
    }
    break;
  }
  return { comments: comments.join("\n"), body: lines.slice(i).join("\n").trim() };
}

function classify(body) {
  const b = body.replace(/^\s+/, "");
  if (/^CREATE\s+EXTENSION\b/i.test(b)) return "extension";
  if (/^DROP\s+TYPE\b/i.test(b)) return "drop_type";
  if (/^DROP\s+TABLE\b/i.test(b)) return "drop_table";
  if (/^DROP\s+FUNCTION\b/i.test(b)) return "drop_function";
  if (/^DROP\s+POLICY\b/i.test(b)) return "drop_policy";
  if (/^DROP\s+VIEW\b/i.test(b)) return "drop_view";
  if (/^DROP\s+TRIGGER\b/i.test(b)) return "drop_trigger";
  if (/^DROP\s+INDEX\b/i.test(b)) return "drop_index";
  if (/^CREATE\s+TYPE\b/i.test(b)) return "create_type";
  if (/^ALTER\s+TYPE\b/i.test(b)) return "alter_type";
  if (/^CREATE\s+TABLE\b/i.test(b)) return "create_table";
  if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(b)) return "create_index";
  if (/^CREATE\s+OR\s+REPLACE\s+FUNCTION\b/i.test(b) || /^CREATE\s+FUNCTION\b/i.test(b))
    return "create_function";
  if (/^CREATE\s+(OR\s+REPLACE\s+)?VIEW\b/i.test(b)) return "create_view";
  if (/^CREATE\s+(OR\s+REPLACE\s+)?TRIGGER\b/i.test(b) || /^CREATE\s+TRIGGER\b/i.test(b))
    return "create_trigger";
  if (/^ALTER\s+TABLE\b/i.test(b) && /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(b))
    return "enable_rls";
  if (/^CREATE\s+POLICY\b/i.test(b)) return "create_policy";
  if (/^GRANT\b/i.test(b)) return "grant";
  if (/^REVOKE\b/i.test(b)) return "revoke";
  if (/^INSERT\s+INTO\s+storage\.buckets\b/i.test(b)) return "storage";
  return "other";
}

const buckets = {
  extension: [],
  drop_type: [],
  drop_table: [],
  drop_function: [],
  drop_policy: [],
  drop_view: [],
  create_type: [],
  alter_type: [],
  create_table: [],
  create_index: [],
  create_function: [],
  create_view: [],
  create_trigger: [],
  enable_rls: [],
  create_policy: [],
  grant: [],
  revoke: [],
  storage: [],
  other: [],
};

for (const raw of splitStatements(src)) {
  // Skip pure comment / header blocks that aren't statements
  const peeled = peelComments(raw);
  if (!peeled.body || peeled.body === ";") continue;
  // If the whole thing is comments only after peel empties - skip header
  const kind = classify(peeled.body);
  const text = raw.trim().endsWith(";") ? raw.trim() : raw.trim() + ";";
  // Prefer body-only for structural DDL (drop leading section comments that confuse)
  const store =
    kind === "other" || kind === "extension"
      ? text
      : peeled.body.endsWith(";")
        ? peeled.body
        : peeled.body + ";";
  buckets[kind].push(store);
}

/** Parse CREATE TABLE into {name, colsWithoutFk, fks[]} */
function parseCreateTable(stmt) {
  const m = stmt.match(
    /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(public\.[a-z0-9_]+)\s*\(([\s\S]*)\)\s*;?\s*$/i,
  );
  if (!m) return null;
  const name = m[1].toLowerCase();
  const inner = m[2];
  // Split top-level commas
  const parts = [];
  let depth = 0;
  let inSingle = false;
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (!inSingle && ch === "'") {
      inSingle = true;
      cur += ch;
      continue;
    }
    if (inSingle) {
      cur += ch;
      if (ch === "'" && inner[i + 1] === "'") {
        cur += inner[++i];
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());

  const cols = [];
  const fks = [];
  const refs = []; // referenced tables for topo sort
  for (const p of parts) {
    if (/^(CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\b/i.test(p) || /\bREFERENCES\b/i.test(p) && /^CONSTRAINT\b/i.test(p)) {
      // table-level FK
      const fk = p.replace(/,+\s*$/, "").trim();
      fks.push(fk);
      const rm = fk.match(/REFERENCES\s+(public\.[a-z0-9_]+)/i);
      if (rm) refs.push(rm[1].toLowerCase());
      continue;
    }
    // Column-level REFERENCES (rare in our file - we use CONSTRAINT form)
    if (/\bREFERENCES\s+public\./i.test(p) && !/^PRIMARY\s+KEY\b/i.test(p) && !/^UNIQUE\b/i.test(p) && !/^CHECK\b/i.test(p)) {
      // Split into column def without REFERENCES + FK constraint
      const colMatch = p.match(
        /^([a-z0-9_]+)\s+([\s\S]*?)\s+REFERENCES\s+(public\.[a-z0-9_]+)\s*\(([^)]+)\)([\s\S]*)$/i,
      );
      if (colMatch) {
        const colName = colMatch[1];
        let typeAnd = (colMatch[2] + " " + (colMatch[5] || "")).replace(/\s+/g, " ").trim();
        cols.push(`${colName} ${typeAnd}`.trim());
        const refTable = colMatch[3].toLowerCase();
        const refCols = colMatch[4];
        fks.push(
          `CONSTRAINT ${name.replace("public.", "")}_${colName}_fkey FOREIGN KEY (${colName}) REFERENCES ${colMatch[3]} (${refCols})`,
        );
        refs.push(refTable);
        continue;
      }
    }
    cols.push(p.replace(/,+\s*$/, "").trim());
  }
  return { name, cols, fks, refs };
}

const tables = [];
for (const stmt of buckets.create_table) {
  const parsed = parseCreateTable(stmt);
  if (!parsed) {
    console.error("Failed to parse CREATE TABLE:\n", stmt.slice(0, 200));
    process.exit(1);
  }
  tables.push(parsed);
}

// Build dependency graph (only public.* refs that are in our table set)
const tableSet = new Set(tables.map((t) => t.name));
const deps = new Map(tables.map((t) => [t.name, new Set()]));
for (const t of tables) {
  for (const r of t.refs) {
    if (tableSet.has(r) && r !== t.name) deps.get(t.name).add(r);
  }
}

// Kahn topological sort
function topoSort(tables, deps) {
  const indeg = new Map(tables.map((t) => [t.name, 0]));
  for (const [name, ds] of deps) {
    // indegree = number of deps that must come first... actually we need
    // nodes with no outgoing wait: edge A->B means A depends on B, so B first.
    for (const d of ds) {
      indeg.set(name, (indeg.get(name) || 0) + 1);
    }
  }
  // Ready = tables whose deps are all satisfied (indegree 0)
  const byName = new Map(tables.map((t) => [t.name, t]));
  const ready = [...indeg.entries()]
    .filter(([, n]) => n === 0)
    .map(([n]) => n)
    .sort();
  const ordered = [];
  const remaining = new Map(deps);
  while (ready.length) {
    const n = ready.shift();
    ordered.push(byName.get(n));
    for (const [name, ds] of remaining) {
      if (ds.has(n)) {
        ds.delete(n);
        indeg.set(name, indeg.get(name) - 1);
        if (indeg.get(name) === 0) {
          ready.push(name);
          ready.sort();
        }
      }
    }
    remaining.delete(n);
  }
  if (ordered.length !== tables.length) {
    const left = tables.filter((t) => !ordered.includes(t)).map((t) => t.name);
    console.warn("Cycle or unresolved deps; appending:", left.join(", "));
    for (const n of left.sort()) ordered.push(byName.get(n));
  }
  return ordered;
}

const orderedTables = topoSort(tables, deps);

// Generate DROP FUNCTION from CREATE FUNCTION signatures
function functionDropFromCreate(stmt) {
  // CREATE OR REPLACE FUNCTION public.name(args...)
  const m = stmt.match(
    /^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(public\.[a-z0-9_]+)\s*\(/i,
  );
  if (!m) return null;
  const name = m[1];
  // Extract argument types only for DROP FUNCTION name(type, type)
  const open = stmt.indexOf("(");
  let depth = 0;
  let end = -1;
  for (let i = open; i < stmt.length; i++) {
    if (stmt[i] === "(") depth++;
    else if (stmt[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return `DROP FUNCTION IF EXISTS ${name} CASCADE;`;
  const argsStr = stmt.slice(open + 1, end);
  // Split args at top-level commas; take type portion (skip default / name)
  const args = [];
  depth = 0;
  let cur = "";
  for (const ch of argsStr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());

  const types = args
    .filter(Boolean)
    .map((a) => {
      // name type ... DEFAULT ...
      // or just OUT name type
      let s = a.replace(/^(IN|OUT|INOUT|VARIADIC)\s+/i, "").trim();
      // remove DEFAULT clause
      s = s.replace(/\s+DEFAULT\s+[\s\S]*$/i, "").trim();
      // remove arg name (first identifier) if followed by type
      const parts = s.split(/\s+/);
      if (parts.length >= 2 && !/^(public\.|[a-z_]+\.)?[a-z0-9_]+(\[\])?$/i.test(parts[0]) === false) {
        // If first token looks like a name and second like a type, drop name
        // Heuristic: types often contain (), [], or are known keywords / schema.qualified
        const maybeName = parts[0];
        const rest = parts.slice(1).join(" ");
        if (
          /^[a-z_][a-z0-9_]*$/i.test(maybeName) &&
          rest &&
          !/^(DEFAULT)$/i.test(rest)
        ) {
          return rest.replace(/\s*=\s*[\s\S]*$/, "").trim();
        }
      }
      return s;
    })
    .filter(Boolean);

  return `DROP FUNCTION IF EXISTS ${name}(${types.join(", ")}) CASCADE;`;
}

const dropFunctions = [];
const seenFnDrop = new Set();
for (const stmt of buckets.create_function) {
  const d = functionDropFromCreate(stmt);
  if (d && !seenFnDrop.has(d.toLowerCase())) {
    seenFnDrop.add(d.toLowerCase());
    dropFunctions.push(d);
  }
}

// Normalize CREATE FUNCTION to OR REPLACE
const functions = buckets.create_function.map((s) =>
  s.replace(/^CREATE\s+FUNCTION\b/i, "CREATE OR REPLACE FUNCTION"),
);

// Indexes: ensure IF NOT EXISTS
const indexes = buckets.create_index.map((s) => {
  if (/IF\s+NOT\s+EXISTS/i.test(s)) return s;
  return s.replace(
    /^CREATE\s+(UNIQUE\s+)?INDEX\s+/i,
    (m, u) => `CREATE ${u || ""}INDEX IF NOT EXISTS `,
  );
});

// Triggers: prepend DROP TRIGGER IF EXISTS
function triggerDropCreate(stmt) {
  const m = stmt.match(
    /^CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-z0-9_]+)\s+[\s\S]*?\sON\s+(public\.[a-z0-9_]+)/i,
  );
  if (!m) return [stmt];
  return [
    `DROP TRIGGER IF EXISTS ${m[1]} ON ${m[2]};`,
    stmt.replace(/^CREATE\s+OR\s+REPLACE\s+TRIGGER\b/i, "CREATE TRIGGER"),
  ];
}

// Views: DROP VIEW IF EXISTS before CREATE
function viewDropCreate(stmt) {
  const m = stmt.match(
    /^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(public\.[a-z0-9_]+)/i,
  );
  if (!m) return [stmt];
  const create = stmt.replace(/^CREATE\s+VIEW\b/i, "CREATE OR REPLACE VIEW");
  return [`DROP VIEW IF EXISTS ${m[1]} CASCADE;`, create];
}

// Storage buckets from app policy
const storageStmts = [
  `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', false, 2097152,
  ARRAY['image/png','image/jpeg','image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;`,
  `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'benefit-evidence', 'benefit-evidence', false, 10485760,
  ARRAY[
    'application/pdf','image/png','image/jpeg','image/webp','text/csv','text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;`,
  `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'canvas-documents', 'canvas-documents', false, 15728640,
  ARRAY[
    'application/pdf','image/png','image/jpeg','text/csv','text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;`,
];

// Deduplicate DROP TYPE / CREATE TYPE (keep order of first occurrence)
function dedupeKeepOrder(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

const dropTypes = dedupeKeepOrder(buckets.drop_type, (s) =>
  (s.match(/DROP\s+TYPE\s+IF\s+EXISTS\s+(public\.[a-z0-9_]+)/i) || [, s])[1].toLowerCase(),
);
const createTypes = dedupeKeepOrder(buckets.create_type, (s) =>
  (s.match(/CREATE\s+TYPE\s+(public\.[a-z0-9_]+)/i) || [, s])[1].toLowerCase(),
);

// Ensure DROP TYPE exists for every CREATE TYPE
const dropTypeNames = new Set(
  dropTypes.map(
    (s) =>
      (s.match(/DROP\s+TYPE\s+IF\s+EXISTS\s+(public\.[a-z0-9_]+)/i) || [])[1]?.toLowerCase(),
  ),
);
for (const ct of createTypes) {
  const name = (ct.match(/CREATE\s+TYPE\s+(public\.[a-z0-9_]+)/i) || [])[1];
  if (name && !dropTypeNames.has(name.toLowerCase())) {
    dropTypes.push(`DROP TYPE IF EXISTS ${name} CASCADE;`);
    dropTypeNames.add(name.toLowerCase());
  }
}

// DROP TABLE for every table (phase 1) - reverse topo so dependents drop first
const dropTables = [...orderedTables]
  .reverse()
  .map((t) => `DROP TABLE IF EXISTS ${t.name} CASCADE;`);

// FK ALTER statements
const fkAlters = [];
for (const t of orderedTables) {
  for (const fk of t.fks) {
    // Ensure CONSTRAINT name form
    let clause = fk;
    if (!/^CONSTRAINT\b/i.test(clause)) {
      clause = `CONSTRAINT ${t.name.replace("public.", "")}_fkey ${clause}`;
    }
    fkAlters.push(
      `ALTER TABLE ${t.name} ADD CONSTRAINT ${clause.replace(/^CONSTRAINT\s+/i, "").replace(/^([a-z0-9_]+)\s+/i, (_, n) => `${n} `).includes("FOREIGN") ? "" : ""}`.length > 0
        ? `ALTER TABLE ${t.name} ADD ${clause};`
        : `ALTER TABLE ${t.name} ADD ${clause};`,
    );
  }
}
// Simplify FK alters - just ADD the constraint clause as-is
const fkAltersClean = [];
for (const t of orderedTables) {
  for (const fk of t.fks) {
    fkAltersClean.push(`ALTER TABLE ${t.name} ADD ${fk};`);
  }
}

// Policies: DROP then CREATE - use existing drop_policy + create_policy
// Deduplicate CREATE POLICY by (table, name) keeping last
function policyKey(stmt) {
  const m = stmt.match(/POLICY\s+"([^"]+)"\s+ON\s+(public\.[a-z0-9_]+|storage\.[a-z0-9_]+)/i);
  return m ? `${m[2].toLowerCase()}::${m[1]}` : stmt.slice(0, 80);
}
const policiesLatest = [];
{
  const map = new Map();
  for (const p of buckets.create_policy) map.set(policyKey(p), p);
  for (const v of map.values()) policiesLatest.push(v);
}
// DROP POLICY for each create
const policyDrops = policiesLatest.map((p) => {
  const m = p.match(/POLICY\s+"([^"]+)"\s+ON\s+(public\.[a-z0-9_]+|storage\.[a-z0-9_]+)/i);
  if (!m) return null;
  return `DROP POLICY IF EXISTS "${m[1]}" ON ${m[2]};`;
}).filter(Boolean);

// GRANT/REVOKE chronological: grants then... user wants phase 10 all GRANT/REVOKE
// Keep original order from file: buckets.grant and buckets.revoke were separated.
// Re-extract grant/revoke in file order from original statements.
const grantRevoke = [];
for (const raw of splitStatements(src)) {
  const { body } = peelComments(raw);
  if (!body) continue;
  if (/^GRANT\b/i.test(body) || /^REVOKE\b/i.test(body)) {
    grantRevoke.push(body.endsWith(";") ? body : body + ";");
  }
}

// ENABLE RLS dedupe by table
const rls = dedupeKeepOrder(buckets.enable_rls, (s) =>
  (s.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(public\.[a-z0-9_]+)/i) || [, s])[1].toLowerCase(),
);
// Ensure every table has RLS enable
const rlsTables = new Set(
  rls.map(
    (s) =>
      (s.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(public\.[a-z0-9_]+)/i) || [])[1]?.toLowerCase(),
  ),
);
for (const t of orderedTables) {
  if (!rlsTables.has(t.name)) {
    rls.push(`ALTER TABLE ${t.name} ENABLE ROW LEVEL SECURITY;`);
  }
}

// Build output
const out = [];
const w = (s) => out.push(s);
const section = (title) => {
  w("");
  w("-- ---------------------------------------------------------------------------");
  w(`-- ${title}`);
  w("-- ---------------------------------------------------------------------------");
};

w(`-- =============================================================================`);
w(`-- full-schema.sql`);
w(`-- Phased, dependency-safe rebuild of the public schema.`);
w(`--`);
w(`-- Phase 1:  DROP TYPE / DROP TABLE / DROP FUNCTION`);
w(`-- Phase 2:  CREATE TYPE (enums)`);
w(`-- Phase 3:  CREATE TABLE (no foreign keys; FK-dependency order)`);
w(`-- Phase 4:  ALTER TABLE ADD CONSTRAINT (foreign keys)`);
w(`-- Phase 5:  CREATE INDEX`);
w(`-- Phase 6:  CREATE OR REPLACE FUNCTION`);
w(`-- Phase 6b: CREATE VIEW (after tables + functions)`);
w(`-- Phase 7:  CREATE TRIGGER`);
w(`-- Phase 8:  ALTER TABLE ENABLE ROW LEVEL SECURITY`);
w(`-- Phase 9:  CREATE POLICY`);
w(`-- Phase 10: GRANT / REVOKE`);
w(`-- Phase 11: Storage bucket creation`);
w(`--`);
w(`-- DOCUMENTATION ARTIFACT ONLY - do not execute blindly against a live DB.`);
w(`-- Generated: ${new Date().toISOString().slice(0, 10)}`);
w(`-- Tables: ${orderedTables.length} | Enums: ${createTypes.length} | Functions: ${functions.length}`);
w(`-- =============================================================================`);

section("Extensions");
for (const s of buckets.extension) w(s);
if (!buckets.extension.length) w(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

section("Phase 1: DROP TYPE / DROP TABLE / DROP FUNCTION");
w(`-- Drop functions first (may depend on types/tables)`);
for (const s of dropFunctions.sort()) w(s);
w(`-- Drop tables (dependents first)`);
for (const s of dropTables) w(s);
w(`-- Drop types`);
for (const s of dropTypes) w(s);

section("Phase 2: CREATE TYPE (enums)");
for (const s of createTypes) {
  // Strip any IF NOT EXISTS if present
  w(s.replace(/CREATE\s+TYPE\s+IF\s+NOT\s+EXISTS\s+/i, "CREATE TYPE "));
}

section("Phase 3: CREATE TABLE (no foreign keys; dependency order)");
for (const t of orderedTables) {
  w(`CREATE TABLE IF NOT EXISTS ${t.name} (`);
  w(t.cols.map((c) => `  ${c}`).join(",\n"));
  w(`);`);
  w(``);
}

section("Phase 4: ALTER TABLE ADD CONSTRAINT (foreign keys)");
for (const s of fkAltersClean) w(s);

section("Phase 5: CREATE INDEX");
for (const s of indexes) w(s);

section("Phase 6: CREATE OR REPLACE FUNCTION");
for (const s of functions) w(s);

section("Phase 6b: CREATE VIEW");
for (const s of buckets.create_view) {
  for (const line of viewDropCreate(s)) w(line);
}

section("Phase 7: CREATE TRIGGER");
for (const s of buckets.create_trigger) {
  for (const line of triggerDropCreate(s)) w(line);
}

section("Phase 8: ALTER TABLE ENABLE ROW LEVEL SECURITY");
for (const s of rls) w(s);

section("Phase 9: CREATE POLICY");
for (const s of policyDrops) w(s);
for (const s of policiesLatest) w(s);

section("Phase 10: GRANT / REVOKE");
for (const s of grantRevoke) w(s);

section("Phase 11: Storage bucket creation");
w(`-- Buckets referenced by storage.objects policies and src/lib/storage/storage-policy.ts`);
for (const s of storageStmts) w(s);

w(``);
w(`-- End of full-schema.sql`);

fs.writeFileSync(PATH, out.join("\n"), "utf8");

console.log(
  JSON.stringify(
    {
      tables: orderedTables.length,
      fks: fkAltersClean.length,
      types: createTypes.length,
      dropFunctions: dropFunctions.length,
      functions: functions.length,
      indexes: indexes.length,
      triggers: buckets.create_trigger.length,
      views: buckets.create_view.length,
      policies: policiesLatest.length,
      grantRevoke: grantRevoke.length,
      other: buckets.other.length,
      firstTables: orderedTables.slice(0, 8).map((t) => t.name),
      lastTables: orderedTables.slice(-5).map((t) => t.name),
    },
    null,
    2,
  ),
);
if (buckets.other.length) {
  console.log("OTHER statements sample:");
  for (const o of buckets.other.slice(0, 10)) console.log(o.slice(0, 120));
}
