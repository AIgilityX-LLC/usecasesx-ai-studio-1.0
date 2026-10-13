/**
 * Generate docs/migration/full-schema.sql from:
 * 1) src/integrations/supabase/types.ts (authoritative tables/columns/PKs/FKs/enums)
 * 2) recovered + current supabase migrations (RLS, GRANTs, functions, triggers, views,
 *    and column type/default enrichment)
 *
 * Does not execute SQL against any database.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TYPES = path.join(ROOT, "src/integrations/supabase/types.ts");
const MIGRATIONS_DIR = path.join(ROOT, "docs/migration/_recovered_migrations");
const CURRENT_MIGRATIONS = path.join(ROOT, "supabase/migrations");
const OUT = path.join(ROOT, "docs/migration/full-schema.sql");

const typesSrc = fs.readFileSync(TYPES, "utf8");

function extractBlock(src, startMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing ${startMarker}`);
  let i = start + startMarker.length;
  // find opening brace of the section value
  while (i < src.length && src[i] !== "{") i++;
  let depth = 0;
  const from = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(from + 1, i);
    }
  }
  throw new Error(`Unclosed block for ${startMarker}`);
}

function splitTopLevelEntries(block) {
  const entries = [];
  let depth = 0;
  let start = 0;
  let name = null;
  let inName = true;
  let bufName = "";
  for (let i = 0; i < block.length; i++) {
    const c = block[i];
    if (depth === 0 && inName) {
      if (/[a-z0-9_]/.test(c)) {
        bufName += c;
      } else if (c === ":" && bufName) {
        name = bufName;
        bufName = "";
        inName = false;
      } else if (/\s/.test(c)) {
        // skip
      } else {
        bufName = "";
      }
      continue;
    }
    if (c === "{") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && name) {
        entries.push({ name, body: block.slice(start, i) });
        name = null;
        inName = true;
        bufName = "";
      }
    }
  }
  return entries;
}

function parseFields(rowBody) {
  const fields = [];
  const re = /^\s*([a-z0-9_]+):\s*(.+)$/gm;
  let m;
  while ((m = re.exec(rowBody))) {
    const name = m[1];
    let typeExpr = m[2].trim();
    // strip trailing comma
    if (typeExpr.endsWith(",")) typeExpr = typeExpr.slice(0, -1).trim();
    fields.push({ name, typeExpr });
  }
  return fields;
}

function parseInsertOptionality(insertBody) {
  const map = new Map();
  const re = /^\s*([a-z0-9_]+)(\?)?:\s*(.+)$/gm;
  let m;
  while ((m = re.exec(insertBody))) {
    map.set(m[1], { optional: Boolean(m[2]), typeExpr: m[3].replace(/,$/, "").trim() });
  }
  return map;
}

function parseRelationships(relBody) {
  const rels = [];
  const re =
    /foreignKeyName:\s*"([^"]+)"[\s\S]*?columns:\s*\[([^\]]+)\][\s\S]*?isOneToOne:\s*(true|false)[\s\S]*?referencedRelation:\s*"([^"]+)"[\s\S]*?referencedColumns:\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(relBody))) {
    const columns = m[2]
      .split(",")
      .map((s) => s.replace(/["'\s]/g, ""))
      .filter(Boolean);
    const referencedColumns = m[5]
      .split(",")
      .map((s) => s.replace(/["'\s]/g, ""))
      .filter(Boolean);
    rels.push({
      foreignKeyName: m[1],
      columns,
      isOneToOne: m[3] === "true",
      referencedRelation: m[4],
      referencedColumns,
    });
  }
  return rels;
}

function extractNamedSubblock(body, key) {
  const idx = body.search(new RegExp(`\\b${key}\\s*:`));
  if (idx < 0) return "";
  let i = idx + key.length;
  while (i < body.length && /[\s:]/.test(body[i])) i++;
  const open = body[i];
  if (open !== "{" && open !== "[") return "";
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  const from = i;
  for (; i < body.length; i++) {
    if (body[i] === open) depth++;
    else if (body[i] === close) {
      depth--;
      if (depth === 0) return body.slice(from + 1, i);
    }
  }
  return "";
}

const tablesBlock = extractBlock(typesSrc, "Tables: {");
// extractBlock already consumed opening — we passed wrong. Fix: use Tables: marker properly.
// Re-parse Tables section more carefully.
function extractSection(src, sectionName) {
  const marker = `${sectionName}:`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`Missing section ${sectionName}`);
  let i = start + marker.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== "{") throw new Error(`Expected { after ${sectionName}`);
  let depth = 0;
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(from + 1, i);
    }
  }
  throw new Error(`Unclosed ${sectionName}`);
}

// Find public: { ... Tables inside Database
const publicIdx = typesSrc.indexOf("public: {");
const publicBody = (() => {
  let i = typesSrc.indexOf("{", publicIdx);
  let depth = 0;
  const from = i;
  for (; i < typesSrc.length; i++) {
    if (typesSrc[i] === "{") depth++;
    else if (typesSrc[i] === "}") {
      depth--;
      if (depth === 0) return typesSrc.slice(from + 1, i);
    }
  }
  throw new Error("public block");
})();

const tablesEntries = splitTopLevelEntries(extractSection(publicBody, "Tables"));
const viewsEntries = splitTopLevelEntries(extractSection(publicBody, "Views"));
const enumsBlock = extractSection(publicBody, "Enums");

function parseEnums(block) {
  const enums = [];
  // app_role: | "a" | "b"  OR  opportunity_source: "a" | "b"
  const re = /([a-z0-9_]+):\s*([\s\S]*?)(?=\n\s{6}[a-z0-9_]+:|\n\s{4}\})/g;
  let m;
  while ((m = re.exec(block))) {
    const name = m[1];
    const vals = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    if (vals.length) enums.push({ name, vals });
  }
  return enums;
}

const enums = parseEnums(enumsBlock);

const tables = tablesEntries.map(({ name, body }) => {
  const row = parseFields(extractNamedSubblock(body, "Row"));
  const insert = parseInsertOptionality(extractNamedSubblock(body, "Insert"));
  const relationships = parseRelationships(extractNamedSubblock(body, "Relationships"));
  return { name, row, insert, relationships };
});

const viewNames = new Set(viewsEntries.map((v) => v.name));

// --- Enrichment from migrations: column SQL types/defaults ---
function listMigrationFiles() {
  const dirs = [MIGRATIONS_DIR, CURRENT_MIGRATIONS];
  const map = new Map();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql"))) {
      map.set(f, path.join(dir, f)); // current overrides recovered for same name
    }
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, p]) => p);
}

const migrationFiles = listMigrationFiles();
const migrationTexts = migrationFiles.map((p) => ({
  file: path.basename(p),
  text: fs.readFileSync(p, "utf8"),
}));

/** @type {Map<string, Map<string, {sqlType:string, notNull?:boolean, defaultSql?:string, pk?:boolean}>>} */
const colEnrichment = new Map();
/** @type {Map<string, Set<string>>} */
const tablePrimaryKeys = new Map();
/** @type {Map<string, string[]>} unique constraints etc from migrations — optional */

function ensureTableMap(t) {
  if (!colEnrichment.has(t)) colEnrichment.set(t, new Map());
  return colEnrichment.get(t);
}

function parseColumnDefs(colBlock) {
  // Split on commas at depth 0, ignoring ones inside parens
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const c of colBlock) {
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function ingestCreateTable(sql) {
  const re = /CREATE TABLE(?: IF NOT EXISTS)? public\.([a-z0-9_]+)\s*\(([\s\S]*?)\)\s*;/gi;
  let m;
  while ((m = re.exec(sql))) {
    const table = m[1];
    const parts = parseColumnDefs(m[2]);
    const pkCols = [];
    for (const part of parts) {
      const pkMatch = part.match(/^PRIMARY KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkCols.push(...pkMatch[1].split(",").map((s) => s.trim().replace(/"/g, "")));
        continue;
      }
      if (/^(UNIQUE|CHECK|CONSTRAINT|FOREIGN KEY)/i.test(part)) continue;
      const cm = part.match(/^([a-z0-9_]+)\s+(.+)$/i);
      if (!cm) continue;
      const col = cm[1];
      let rest = cm[2];
      const notNull = /\bNOT NULL\b/i.test(rest);
      const isPk = /\bPRIMARY KEY\b/i.test(rest);
      if (isPk) pkCols.push(col);
      const defaultSql = extractDefault(rest);
      const sqlType = cleanSqlType(rest);
      if (!sqlType) continue;
      const map = ensureTableMap(table);
      map.set(col, { sqlType, notNull, defaultSql, pk: isPk });
    }
    if (pkCols.length) tablePrimaryKeys.set(table, new Set(pkCols));
  }
}

function cleanSqlType(rest) {
  let s = rest.replace(/--[^\n]*/g, " ");
  const def = extractDefault(s);
  if (def) {
    s = s.replace(new RegExp(`\\bDEFAULT\\s+${escapeRegExp(def)}`, "i"), " ");
  }
  s = s
    .replace(/\bNOT NULL\b/gi, "")
    .replace(/\bNULL\b/gi, "")
    .replace(/\bREFERENCES\b[\s\S]*/i, "")
    .replace(/\bCHECK\s*\([\s\S]*/i, "")
    .replace(/\bUNIQUE\b/gi, "")
    .replace(/\bCOLLATE\s+\S+/gi, "")
    .replace(/\bPRIMARY KEY\b/gi, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,+$/, "")
    .trim();
  const tm = s.match(
    /^((?:double precision|character varying|timestamp with time zone|timestamp without time zone|[a-z0-9_."]+)(?:\s*\([^)]*\))?(?:\s*\[\])?(?:\s+with\s+time\s+zone)?)/i,
  );
  return tm ? tm[1].replace(/\s+/g, " ").trim() : s.split(/\s+/)[0];
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDefault(rest) {
  const m = rest.match(/\bDEFAULT\s+/i);
  if (!m) return undefined;
  let i = m.index + m[0].length;
  while (i < rest.length && /\s/.test(rest[i])) i++;
  let depth = 0;
  let inSingle = false;
  const start = i;
  for (; i < rest.length; i++) {
    const ch = rest[i];
    if (!inSingle && ch === "'") {
      inSingle = true;
      continue;
    }
    if (inSingle) {
      if (ch === "'" && rest[i + 1] === "'") {
        i++;
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") {
      if (depth === 0) break;
      depth--;
    } else if (ch === "," && depth === 0) {
      break;
    } else if (/\s/.test(ch) && depth === 0) {
      const tail = rest.slice(i + 1);
      if (/^(NOT\s+NULL|NULL|PRIMARY|UNIQUE|CHECK|REFERENCES|COLLATE)\b/i.test(tail)) {
        break;
      }
    }
  }
  return rest.slice(start, i).trim() || undefined;
}

function ingestAlterAddColumn(sql) {
  // Match whole ALTER TABLE ... ; then find each ADD COLUMN clause inside
  const alterRe = /ALTER TABLE(?: IF EXISTS)? public\.([a-z0-9_]+)\s+([\s\S]*?);/gi;
  let am;
  while ((am = alterRe.exec(sql))) {
    const table = am[1];
    const body = am[2];
    if (!/\bADD\s+COLUMN\b/i.test(body)) continue;
    const colRe =
      /ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z0-9_]+)\s+([\s\S]*?)(?=(?:,\s*)?ADD\s+COLUMN\b|$)/gi;
    let m;
    while ((m = colRe.exec(body))) {
      const col = m[1];
      let rest = m[2].trim().replace(/,\s*$/, "");
      const notNull = /\bNOT NULL\b/i.test(rest);
      const defaultSql = extractDefault(rest);
      const sqlType = cleanSqlType(rest);
      if (!sqlType || /^(ADD|ALTER|DROP|SET|OWNER|ENABLE|DISABLE)$/i.test(sqlType)) {
        continue;
      }
      const map = ensureTableMap(table);
      const prev = map.get(col) || {};
      map.set(col, {
        sqlType: sqlType || prev.sqlType,
        notNull: notNull || prev.notNull,
        defaultSql: defaultSql || prev.defaultSql,
        pk: prev.pk,
      });
    }
  }
}

function ingestAlterType(sql) {
  const re =
    /ALTER TABLE(?: IF EXISTS)? public\.([a-z0-9_]+)\s+ALTER COLUMN\s+([a-z0-9_]+)\s+TYPE\s+([^;]+?)\s*(?:USING[^;]+)?;/gi;
  let m;
  while ((m = re.exec(sql))) {
    const map = ensureTableMap(m[1]);
    const prev = map.get(m[2]) || {};
    const sqlType = cleanSqlType(m[3]);
    map.set(m[2], { ...prev, sqlType });
  }
  const defRe =
    /ALTER TABLE(?: IF EXISTS)? public\.([a-z0-9_]+)\s+ALTER COLUMN\s+([a-z0-9_]+)\s+SET DEFAULT\s+([^;]+);/gi;
  while ((m = defRe.exec(sql))) {
    const map = ensureTableMap(m[1]);
    const prev = map.get(m[2]) || {};
    map.set(m[2], { ...prev, defaultSql: extractDefault("DEFAULT " + m[3].trim()) || m[3].trim() });
  }
  const nnRe =
    /ALTER TABLE(?: IF EXISTS)? public\.([a-z0-9_]+)\s+ALTER COLUMN\s+([a-z0-9_]+)\s+SET NOT NULL\s*;/gi;
  while ((m = nnRe.exec(sql))) {
    const map = ensureTableMap(m[1]);
    const prev = map.get(m[2]) || {};
    map.set(m[2], { ...prev, notNull: true });
  }
}

for (const { text } of migrationTexts) {
  ingestCreateTable(text);
  ingestAlterAddColumn(text);
  ingestAlterType(text);
}

// Extract DDL objects to append (functions, triggers, views, policies, grants, RLS enable)
function extractStatements(sql, pattern) {
  const results = [];
  const re = new RegExp(pattern, "gi");
  let m;
  while ((m = re.exec(sql))) {
    const start = m.index;
    // Skip matches that sit inside a line comment
    const lineStart = sql.lastIndexOf("\n", start) + 1;
    const prefix = sql.slice(lineStart, start);
    if (/--/.test(prefix)) continue;
    // Skip matches inside block comments (best-effort)
    const before = sql.slice(0, start);
    const lastBlockOpen = before.lastIndexOf("/*");
    const lastBlockClose = before.lastIndexOf("*/");
    if (lastBlockOpen > lastBlockClose) continue;

    let i = start;
    let dollarTag = null;
    let inSingle = false;
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
        const dm = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
        if (dm) {
          dollarTag = dm[1];
          i += dm[1].length;
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
        results.push(sql.slice(start, i + 1).trim());
        break;
      }
      i++;
    }
  }
  return results;
}

const functions = [];
const triggers = [];
const views = [];
const policies = [];
const grants = [];
const rlsEnables = [];
const indexes = [];
const typesFromMigrations = [];
const drops = []; // DROP POLICY etc — keep chronological for final replay of policy section

for (const { file, text } of migrationTexts) {
  for (const s of extractStatements(text, String.raw`CREATE\s+OR\s+REPLACE\s+FUNCTION\s+`)) {
    functions.push({ file, stmt: s });
  }
  for (const s of extractStatements(text, String.raw`CREATE\s+(OR\s+REPLACE\s+)?TRIGGER\s+`)) {
    triggers.push({ file, stmt: s });
  }
  for (const s of extractStatements(text, String.raw`CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+`)) {
    views.push({ file, stmt: s });
  }
  for (const s of extractStatements(text, String.raw`CREATE\s+POLICY\s+`)) {
    policies.push({ file, stmt: s });
  }
  for (const s of extractStatements(text, String.raw`DROP\s+POLICY\s+`)) {
    drops.push({ file, stmt: s });
  }
  for (const s of extractStatements(
    text,
    String.raw`(?:GRANT|REVOKE)\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL|USAGE|EXECUTE|REFERENCES|TRIGGER|TRUNCATE|GRANT\s+OPTION)`,
  )) {
    if (/\bCREATE\s+TABLE\b/i.test(s)) continue;
    grants.push({ file, stmt: s });
  }
  for (const s of extractStatements(
    text,
    String.raw`ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+public\.[a-z0-9_]+\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY`,
  )) {
    rlsEnables.push({ file, stmt: s });
  }
  for (const s of extractStatements(text, String.raw`CREATE\s+(UNIQUE\s+)?INDEX\s+`)) {
    indexes.push({ file, stmt: s });
  }
  for (const s of extractStatements(text, String.raw`CREATE\s+TYPE\s+`)) {
    typesFromMigrations.push({ file, stmt: s });
  }
  for (const s of extractStatements(text, String.raw`ALTER\s+TYPE\s+`)) {
    typesFromMigrations.push({ file, stmt: s });
  }
}

function latestByKey(items, keyFn) {
  const map = new Map();
  for (const item of items) map.set(keyFn(item), item);
  return [...map.values()];
}

function fnKey(item) {
  const m = item.stmt.match(/FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(/i);
  return m ? m[1].toLowerCase() : item.stmt.slice(0, 80);
}
function viewKey(item) {
  const m = item.stmt.match(/VIEW\s+(?:public\.)?([a-z0-9_]+)/i);
  return m ? m[1].toLowerCase() : item.stmt.slice(0, 80);
}
function triggerKey(item) {
  const m = item.stmt.match(/TRIGGER\s+([a-z0-9_]+)/i);
  const t = item.stmt.match(/\sON\s+(?:public\.)?([a-z0-9_]+)/i);
  return `${m?.[1] || "?"}@${t?.[1] || "?"}`.toLowerCase();
}
function policyKey(item) {
  const m = item.stmt.match(/POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?([a-z0-9_]+)/i);
  return m ? `${m[2].toLowerCase()}::${m[1]}` : item.stmt.slice(0, 100);
}
function indexKey(item) {
  const m = item.stmt.match(/INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z0-9_]+)/i);
  return m ? m[1].toLowerCase() : item.stmt.slice(0, 80);
}
function rlsKey(item) {
  const m = item.stmt.match(/public\.([a-z0-9_]+)/i);
  return m ? m[1].toLowerCase() : item.stmt;
}

const latestFns = latestByKey(functions, fnKey);
const latestViews = latestByKey(views, viewKey);
const latestTriggers = latestByKey(triggers, triggerKey);
const latestIndexes = latestByKey(indexes, indexKey);
const latestRls = latestByKey(rlsEnables, rlsKey);

// For policies: replay DROP+CREATE chronologically is safest; alternatively keep drops + latest creates.
// Use chronological DROP POLICY + CREATE POLICY from all migrations (dedupe consecutive).
const policyReplay = [...drops, ...policies].sort((a, b) => a.file.localeCompare(b.file));

// --- Type inference from types.ts when enrichment missing ---
function mapTsType(colName, typeExpr, insertMeta, tableName) {
  const enriched = colEnrichment.get(tableName)?.get(colName);
  if (enriched?.sqlType) {
    return {
      sqlType: enriched.sqlType,
      defaultSql: enriched.defaultSql,
    };
  }

  const nullable = /\|\s*null/.test(typeExpr);
  let base = typeExpr.replace(/\s*\|\s*null/g, "").trim();

  // Enums
  const enumMatch = base.match(/Database\["public"\]\["Enums"\]\["([a-z0-9_]+)"\]/);
  if (enumMatch) {
    return { sqlType: `public.${enumMatch[1]}`, defaultSql: undefined };
  }

  if (base === "Json" || base === "Json[]") {
    return { sqlType: base === "Json[]" ? "jsonb[]" : "jsonb", defaultSql: undefined };
  }
  if (base === "string[]") {
    return { sqlType: "text[]", defaultSql: undefined };
  }
  if (base === "boolean") {
    return { sqlType: "boolean", defaultSql: undefined };
  }
  if (base === "number") {
    const n = colName.toLowerCase();
    if (
      /(score|weight|rating|avg|ratio|percent|amount|cost|value)$/.test(n) ||
      n.includes("score") ||
      n.includes("weight")
    ) {
      return { sqlType: "numeric", defaultSql: undefined };
    }
    if (/(tokens|_ms|order|count|sort|duration|attempts)/.test(n)) {
      return { sqlType: "integer", defaultSql: undefined };
    }
    return { sqlType: "integer", defaultSql: undefined };
  }
  if (base === "string") {
    const n = colName.toLowerCase();
    if (
      n === "id" ||
      n.endsWith("_id") ||
      n.endsWith("_by") ||
      n === "user_id" ||
      n === "submitted_by" ||
      n === "assigned_to" ||
      n === "assigned_by" ||
      n === "created_by" ||
      n === "updated_by" ||
      n === "owner_id"
    ) {
      // slug-like exceptions
      if (n.endsWith("_slug") || n === "slug") {
        return { sqlType: "text", defaultSql: undefined };
      }
      return { sqlType: "uuid", defaultSql: undefined };
    }
    if (n.endsWith("_at") || n === "week" || n.endsWith("_date")) {
      // week views are often date/text — for tables prefer timestamptz for *_at
      if (n.endsWith("_at")) return { sqlType: "timestamptz", defaultSql: undefined };
      return { sqlType: "text", defaultSql: undefined };
    }
    if (n.endsWith("_url") || n.includes("email") || n === "token") {
      return { sqlType: "text", defaultSql: undefined };
    }
    // engine_slug / slug often text
    return { sqlType: "text", defaultSql: undefined };
  }
  // Fallback
  return { sqlType: "text", defaultSql: undefined };
}

function inferDefault(colName, typeExpr, insertMeta, sqlType, enrichedDefault) {
  if (enrichedDefault) return enrichedDefault;
  if (!insertMeta?.optional) return undefined;
  const requiredInRow = !/\|\s*null/.test(typeExpr);
  if (colName === "id" && sqlType === "uuid") return "gen_random_uuid()";
  if ((colName === "created_at" || colName === "updated_at") && requiredInRow) {
    return "now()";
  }
  // boolean NOT NULL optional insert → often false
  if (sqlType === "boolean" && requiredInRow) return "false";
  if (sqlType === "text[]" && requiredInRow) return "'{}'::text[]";
  if (sqlType === "jsonb" && requiredInRow) return "'{}'::jsonb";
  if (sqlType === "integer" && requiredInRow && /order|sort/.test(colName)) return "0";
  return undefined;
}

function quoteIdent(id) {
  return /^[a-z_][a-z0-9_]*$/.test(id) ? id : `"${id}"`;
}

// Build FK lines from relationships; also auth.users heuristic
function fkClauses(table) {
  const clauses = [];
  for (const rel of table.relationships) {
    // Skip FKs to views
    if (viewNames.has(rel.referencedRelation)) continue;
    const cols = rel.columns.map(quoteIdent).join(", ");
    const refCols = rel.referencedColumns.map(quoteIdent).join(", ");
    const name = quoteIdent(rel.foreignKeyName);
    clauses.push(
      `  CONSTRAINT ${name} FOREIGN KEY (${cols}) REFERENCES public.${quoteIdent(rel.referencedRelation)} (${refCols})`,
    );
  }
  return clauses;
}

function primaryKeyFor(table) {
  if (tablePrimaryKeys.has(table.name)) {
    return [...tablePrimaryKeys.get(table.name)];
  }
  const hasId = table.row.some((f) => f.name === "id");
  if (hasId) return ["id"];
  // composite: all required uuid/id-like columns that are FKs
  const fkCols = new Set(table.relationships.flatMap((r) => r.columns));
  if (fkCols.size >= 2) return [...fkCols];
  if (fkCols.size === 1) return [...fkCols];
  // fallback: all NOT NULL columns without defaults that look like keys
  return table.row
    .filter((f) => !/\|\s*null/.test(f.typeExpr))
    .slice(0, 1)
    .map((f) => f.name);
}

// Emit SQL
const out = [];
out.push(`-- =============================================================================`);
out.push(`-- full-schema.sql`);
out.push(`-- Regenerated from src/integrations/supabase/types.ts (tables/columns/PKs/FKs)`);
out.push(`-- plus RLS / GRANTs / functions / triggers / views extracted from migration`);
out.push(`-- history (recovered from git) and supabase/migrations/.`);
out.push(`--`);
out.push(`-- DOCUMENTATION ARTIFACT ONLY - do not execute blindly against a live DB.`);
out.push(`-- Types/defaults are enriched from historical CREATE/ALTER when available;`);
out.push(`-- otherwise inferred from generated TypeScript types.`);
out.push(`-- Generated: ${new Date().toISOString().slice(0, 10)}`);
out.push(
  `-- Tables: ${tables.length} | Enums: ${enums.length} | Views (types.ts): ${viewsEntries.length}`,
);
out.push(`-- =============================================================================`);
out.push(``);

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Extensions (commonly required)`);
out.push(`-- ---------------------------------------------------------------------------`);
out.push(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
out.push(``);

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Enums (from types.ts Constants / Enums)`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const e of enums) {
  const vals = e.vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
  out.push(`DO $$ BEGIN`);
  out.push(`  CREATE TYPE public.${e.name} AS ENUM (${vals});`);
  out.push(`EXCEPTION WHEN duplicate_object THEN NULL;`);
  out.push(`END $$;`);
  out.push(``);
}

// Also include ALTER TYPE additions from migrations for completeness notes
out.push(
  `-- Historical ALTER TYPE / CREATE TYPE statements from migrations (idempotent best-effort):`,
);
for (const t of typesFromMigrations) {
  out.push(`-- from ${t.file}`);
  out.push(t.stmt);
  out.push(``);
}

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Tables (from types.ts)`);
out.push(`-- ---------------------------------------------------------------------------`);

for (const table of tables) {
  const pk = primaryKeyFor(table);
  const colsSql = [];
  for (const field of table.row) {
    const insertMeta = table.insert.get(field.name);
    const mapped = mapTsType(field.name, field.typeExpr, insertMeta, table.name);
    const enriched = colEnrichment.get(table.name)?.get(field.name);
    const notNull =
      enriched?.notNull === true ||
      (!/\|\s*null/.test(field.typeExpr) &&
        !(pk.length > 1 && pk.includes(field.name) === false && false));
    // Row non-null => NOT NULL
    const isNotNull = !/\|\s*null/.test(field.typeExpr);
    const defaultSql = inferDefault(
      field.name,
      field.typeExpr,
      insertMeta,
      mapped.sqlType,
      enriched?.defaultSql,
    );
    let line = `  ${quoteIdent(field.name)} ${mapped.sqlType}`;
    if (isNotNull) line += ` NOT NULL`;
    if (defaultSql) line += ` DEFAULT ${defaultSql}`;
    colsSql.push(line);
  }
  colsSql.push(`  PRIMARY KEY (${pk.map(quoteIdent).join(", ")})`);
  colsSql.push(...fkClauses(table));

  out.push(`CREATE TABLE IF NOT EXISTS public.${quoteIdent(table.name)} (`);
  out.push(colsSql.join(",\n"));
  out.push(`);`);
  out.push(``);
}

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Indexes (latest from migrations)`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const ix of latestIndexes) {
  out.push(`-- from ${ix.file}`);
  // Make idempotent if not already
  let s = ix.stmt;
  if (!/IF NOT EXISTS/i.test(s)) {
    s = s.replace(
      /CREATE\s+(UNIQUE\s+)?INDEX\s+/i,
      (m, u) => `CREATE ${u || ""}INDEX IF NOT EXISTS `,
    );
  }
  out.push(s);
  out.push(``);
}

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Functions (latest definition per name from migrations)`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const fn of latestFns.sort((a, b) => fnKey(a).localeCompare(fnKey(b)))) {
  out.push(`-- from ${fn.file}`);
  out.push(fn.stmt);
  out.push(``);
}

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Views (latest definition per name from migrations)`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const v of latestViews.sort((a, b) => viewKey(a).localeCompare(viewKey(b)))) {
  out.push(`-- from ${v.file}`);
  out.push(v.stmt);
  out.push(``);
}

// Stub comment for views in types.ts missing from migrations
const knownViewSql = new Set(latestViews.map(viewKey));
for (const v of viewsEntries) {
  if (!knownViewSql.has(v.name.toLowerCase())) {
    out.push(
      `-- NOTE: View public.${v.name} appears in types.ts but no CREATE VIEW was found in migration history.`,
    );
  }
}

out.push(``);
out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Triggers (latest per trigger+table from migrations)`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const t of latestTriggers.sort((a, b) => triggerKey(a).localeCompare(triggerKey(b)))) {
  out.push(`-- from ${t.file}`);
  out.push(t.stmt);
  out.push(``);
}

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Row Level Security enable`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const r of latestRls.sort((a, b) => rlsKey(a).localeCompare(rlsKey(b)))) {
  out.push(r.stmt.endsWith(";") ? r.stmt : r.stmt + ";");
}
// Also enable RLS for any types.ts table not covered
const rlsCovered = new Set(latestRls.map(rlsKey));
for (const t of tables) {
  if (!rlsCovered.has(t.name.toLowerCase())) {
    out.push(`ALTER TABLE public.${t.name} ENABLE ROW LEVEL SECURITY;`);
  }
}
out.push(``);

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- GRANTs / REVOKEs (chronological from migrations)`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const g of grants) {
  out.push(`-- from ${g.file}`);
  out.push(g.stmt);
  out.push(``);
}

out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Policies (DROP + CREATE chronological from migrations, incl. current anon-read)`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const p of policyReplay) {
  out.push(`-- from ${p.file}`);
  out.push(p.stmt);
  out.push(``);
}

// Function stubs for types.ts functions missing bodies
const fnCovered = new Set(latestFns.map(fnKey));
const fnSection = extractSection(publicBody, "Functions");
const fnNames = [...fnSection.matchAll(/^\s{6}([a-z0-9_]+):/gm)].map((m) => m[1]);
out.push(`-- ---------------------------------------------------------------------------`);
out.push(`-- Functions declared in types.ts but missing from migration history`);
out.push(`-- ---------------------------------------------------------------------------`);
for (const name of fnNames) {
  if (!fnCovered.has(name.toLowerCase())) {
    out.push(`-- MISSING BODY: public.${name} (signature only in types.ts)`);
  }
}
out.push(``);
out.push(`-- End of full-schema.sql`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join("\n"), "utf8");

console.log(`Wrote ${OUT}`);
console.log(`tables=${tables.length} enums=${enums.length} views_types=${viewsEntries.length}`);
console.log(
  `functions=${latestFns.length} triggers=${latestTriggers.length} views_sql=${latestViews.length}`,
);
console.log(
  `policies_replay=${policyReplay.length} grants=${grants.length} indexes=${latestIndexes.length}`,
);
console.log(`enrichment_tables=${colEnrichment.size}`);
