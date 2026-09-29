import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MIG_DIR = path.join(ROOT, "docs/migration/_recovered_migrations");
const SCHEMA = path.join(ROOT, "docs/migration/full-schema.sql");

function normalizeCols(raw) {
  return raw
    .split(",")
    .map((s) =>
      s
        .trim()
        .replace(/^"|"$/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase(),
    )
    .filter(Boolean)
    .join(",");
}

function add(map, key, meta) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(meta);
}

function extractFromSql(sql, source) {
  const unique = new Map();
  const pk = new Map();

  // CREATE TABLE blocks
  const createRe =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  let m;
  while ((m = createRe.exec(sql))) {
    const table = m[1].toLowerCase();
    const body = m[2];

    // Strip nested parens content for crude line parsing of constraints is hard;
    // use regexes on body.
    for (const cm of body.matchAll(
      /^\s*([a-zA-Z0-9_]+)\s+[^,\n]*?\bUNIQUE\b/gim,
    )) {
      const col = cm[1].toLowerCase();
      // skip if this looks like a table-level UNIQUE line start somehow
      if (/^unique$/i.test(col)) continue;
      add(unique, `${table}.${col}`, {
        kind: "col-UNIQUE",
        source,
        snippet: cm[0].trim().slice(0, 160),
      });
    }

    for (const um of body.matchAll(/\bUNIQUE\s*\(([^)]+)\)/gi)) {
      const cols = normalizeCols(um[1]);
      add(unique, `${table}(${cols})`, {
        kind: "table-UNIQUE",
        source,
        snippet: um[0].slice(0, 160),
      });
    }

    for (const pm of body.matchAll(/\bPRIMARY\s+KEY\s*\(([^)]+)\)/gi)) {
      const cols = normalizeCols(pm[1]);
      add(pk, `${table}(${cols})`, {
        kind: "table-PK",
        source,
        snippet: pm[0].slice(0, 160),
      });
    }

    for (const pm of body.matchAll(
      /^\s*([a-zA-Z0-9_]+)\s+[^,\n]*?\bPRIMARY\s+KEY\b/gim,
    )) {
      const col = pm[1].toLowerCase();
      add(pk, `${table}(${col})`, {
        kind: "col-PK",
        source,
        snippet: pm[0].trim().slice(0, 160),
      });
    }
  }

  // ALTER TABLE ADD CONSTRAINT UNIQUE / PRIMARY KEY
  const alterRe =
    /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+ADD\s+CONSTRAINT\s+([a-zA-Z0-9_]+)\s+(UNIQUE|PRIMARY\s+KEY)\s*\(([^)]+)\)/gi;
  while ((m = alterRe.exec(sql))) {
    const table = m[1].toLowerCase();
    const name = m[2];
    const cols = normalizeCols(m[4]);
    const isPk = /PRIMARY/i.test(m[3]);
    const target = isPk ? pk : unique;
    add(target, `${table}(${cols})`, {
      kind: isPk ? `ALTER-PK:${name}` : `ALTER-UNIQUE:${name}`,
      source,
      snippet: m[0].slice(0, 200),
    });
  }

  // CREATE UNIQUE INDEX
  const idxRe =
    /CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([^)]+)\)/gi;
  while ((m = idxRe.exec(sql))) {
    const name = m[1];
    const table = m[2].toLowerCase();
    const cols = normalizeCols(m[3]);
    add(unique, `${table}(${cols})`, {
      kind: `UNIQUE-INDEX:${name}`,
      source,
      snippet: m[0].slice(0, 200),
    });
  }

  return { unique, pk };
}

function mergeMaps(into, from) {
  for (const [k, arr] of from) {
    if (!into.has(k)) into.set(k, []);
    into.get(k).push(...arr);
  }
}

function presentInSchema(schemaSql, key) {
  // key forms: table.col OR table(cols)
  const dot = key.indexOf(".");
  if (dot > 0 && !key.includes("(")) {
    const table = key.slice(0, dot);
    const col = key.slice(dot + 1);
    // Find CREATE TABLE for this table and check column has UNIQUE
    const re = new RegExp(
      `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?${table}\\s*\\(([\\s\\S]*?)\\);`,
      "i",
    );
    const m = schemaSql.match(re);
    if (!m) return { present: false, reason: "table-missing" };
    const body = m[1];
    const colRe = new RegExp(
      `^\\s*${col}\\s+[^,\\n]*?\\bUNIQUE\\b`,
      "im",
    );
    if (colRe.test(body)) return { present: true, via: "col-UNIQUE" };
    // also UNIQUE (col) table-level
    const tableUniq = new RegExp(
      `\\bUNIQUE\\s*\\(\\s*${col}\\s*\\)`,
      "i",
    );
    if (tableUniq.test(body)) return { present: true, via: "table-UNIQUE" };
    // ALTER ADD CONSTRAINT UNIQUE (col)
    const alter = new RegExp(
      `ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:public\\.)?${table}\\s+ADD\\s+CONSTRAINT\\s+\\w+\\s+UNIQUE\\s*\\(\\s*${col}\\s*\\)`,
      "i",
    );
    if (alter.test(schemaSql)) return { present: true, via: "ALTER-UNIQUE" };
    // UNIQUE INDEX on col
    const idx = new RegExp(
      `CREATE\\s+UNIQUE\\s+INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?\\w+\\s+ON\\s+(?:ONLY\\s+)?(?:public\\.)?${table}\\s*\\(\\s*${col}\\s*\\)`,
      "i",
    );
    if (idx.test(schemaSql)) return { present: true, via: "UNIQUE-INDEX" };
    return { present: false, reason: "no-unique-on-column" };
  }

  // composite: table(cols)
  const mm = key.match(/^([a-z0-9_]+)\((.+)\)$/i);
  if (!mm) return { present: false, reason: "bad-key" };
  const table = mm[1];
  const cols = mm[2];
  const colList = cols.split(",").map((c) => c.trim());
  const colsPat = colList
    .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("\\s*,\\s*");

  // PK in CREATE TABLE
  const createRe = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?${table}\\s*\\(([\\s\\S]*?)\\);`,
    "i",
  );
  const cm = schemaSql.match(createRe);
  if (cm) {
    const body = cm[1];
    if (new RegExp(`\\bPRIMARY\\s+KEY\\s*\\(\\s*${colsPat}\\s*\\)`, "i").test(body)) {
      return { present: true, via: "table-PK" };
    }
    if (new RegExp(`\\bUNIQUE\\s*\\(\\s*${colsPat}\\s*\\)`, "i").test(body)) {
      return { present: true, via: "table-UNIQUE" };
    }
    // single-col PK/UNIQUE on first col only if single
    if (colList.length === 1) {
      const c = colList[0].replace(/\s+.*$/, ""); // strip DESC/ASC/ops
      if (new RegExp(`^\\s*${c}\\s+[^,\\n]*?\\bPRIMARY\\s+KEY\\b`, "im").test(body)) {
        return { present: true, via: "col-PK" };
      }
      if (new RegExp(`^\\s*${c}\\s+[^,\\n]*?\\bUNIQUE\\b`, "im").test(body)) {
        return { present: true, via: "col-UNIQUE" };
      }
    }
  }

  if (
    new RegExp(
      `ALTER\\s+TABLE\\s+(?:ONLY\\s+)?(?:public\\.)?${table}\\s+ADD\\s+CONSTRAINT\\s+\\w+\\s+(?:UNIQUE|PRIMARY\\s+KEY)\\s*\\(\\s*${colsPat}\\s*\\)`,
      "i",
    ).test(schemaSql)
  ) {
    return { present: true, via: "ALTER" };
  }

  if (
    new RegExp(
      `CREATE\\s+UNIQUE\\s+INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?\\w+\\s+ON\\s+(?:ONLY\\s+)?(?:public\\.)?${table}\\s*\\(\\s*${colsPat}\\s*\\)`,
      "i",
    ).test(schemaSql)
  ) {
    return { present: true, via: "UNIQUE-INDEX" };
  }

  return { present: false, reason: "not-found" };
}

// --- main ---
const migFiles = fs
  .readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const migUnique = new Map();
const migPk = new Map();

for (const file of migFiles) {
  const sql = fs.readFileSync(path.join(MIG_DIR, file), "utf8");
  const { unique, pk } = extractFromSql(sql, file);
  mergeMaps(migUnique, unique);
  mergeMaps(migPk, pk);
}

const schemaSql = fs.readFileSync(SCHEMA, "utf8");
const { unique: schemaUnique, pk: schemaPk } = extractFromSql(
  schemaSql,
  "full-schema.sql",
);

const missingUnique = [];
const missingPk = [];
const presentUnique = [];
const presentPk = [];

for (const key of [...migUnique.keys()].sort()) {
  const check = presentInSchema(schemaSql, key);
  const meta = migUnique.get(key);
  const kinds = [...new Set(meta.map((x) => x.kind))].join(", ");
  const sources = [...new Set(meta.map((x) => x.source))].slice(0, 3);
  if (check.present) {
    presentUnique.push({ key, via: check.via, kinds, sources });
  } else {
    missingUnique.push({ key, reason: check.reason, kinds, sources, sample: meta[0].snippet });
  }
}

for (const key of [...migPk.keys()].sort()) {
  const check = presentInSchema(schemaSql, key);
  const meta = migPk.get(key);
  const kinds = [...new Set(meta.map((x) => x.kind))].join(", ");
  const sources = [...new Set(meta.map((x) => x.source))].slice(0, 3);
  if (check.present) {
    presentPk.push({ key, via: check.via, kinds, sources });
  } else {
    missingPk.push({ key, reason: check.reason, kinds, sources, sample: meta[0].snippet });
  }
}

// Also: schema uniques not in migrations (informational)
const extraSchemaUnique = [...schemaUnique.keys()]
  .filter((k) => !migUnique.has(k))
  .sort();
const extraSchemaPk = [...schemaPk.keys()]
  .filter((k) => !migPk.has(k))
  .sort();

console.log("Migration files scanned:", migFiles.length);
console.log("Migration UNIQUE keys:", migUnique.size);
console.log("Migration PK keys:", migPk.size);
console.log("Schema UNIQUE keys (extracted):", schemaUnique.size);
console.log("Schema PK keys (extracted):", schemaPk.size);
console.log("");
console.log("=== MISSING UNIQUE (in migrations, not in full-schema) ===");
console.log("count:", missingUnique.length);
for (const row of missingUnique) {
  console.log(
    `- ${row.key}\n  kinds: ${row.kinds}\n  reason: ${row.reason}\n  sources: ${row.sources.join(", ")}\n  sample: ${row.sample}`,
  );
}
console.log("");
console.log("=== MISSING PRIMARY KEY ===");
console.log("count:", missingPk.length);
for (const row of missingPk) {
  console.log(
    `- ${row.key}\n  kinds: ${row.kinds}\n  reason: ${row.reason}\n  sources: ${row.sources.join(", ")}\n  sample: ${row.sample}`,
  );
}
console.log("");
console.log("=== PRESENT UNIQUE count ===", presentUnique.length);
for (const row of presentUnique) {
  console.log(`- ${row.key} (via ${row.via})`);
}
console.log("=== PRESENT PK count ===", presentPk.length);
console.log("");
console.log("=== Schema UNIQUE not seen in migrations (info) ===");
for (const k of extraSchemaUnique) console.log("-", k);
console.log("");
console.log("=== Schema PK not seen in migrations (info) ===");
for (const k of extraSchemaPk) console.log("-", k);

// Spot-check profiles.user_id
console.log("\n=== SPOT CHECK profiles.user_id ===");
console.log("mig has profiles.user_id:", migUnique.has("profiles.user_id"));
console.log("mig has profiles(user_id):", migUnique.has("profiles(user_id)"));
console.log("presentInSchema:", presentInSchema(schemaSql, "profiles.user_id"));
const profilesCreate = schemaSql.match(
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?profiles\s*\(([\s\S]*?)\);/i,
);
if (profilesCreate) {
  const lines = profilesCreate[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /user_id/i.test(l) || /UNIQUE/i.test(l) || /PRIMARY/i.test(l));
  console.log("profiles relevant lines:");
  for (const l of lines) console.log(" ", l);
}
