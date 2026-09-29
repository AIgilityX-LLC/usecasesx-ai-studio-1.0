import fs from "node:fs";

const path = "docs/migration/full-schema.sql";
let sql = fs.readFileSync(path, "utf8");
const start = sql.indexOf("-- Phase 4b: UNIQUE constraints (idempotent");
const end = sql.indexOf("-- Phase 5: CREATE INDEX");
if (start < 0 || end < 0) throw new Error("markers missing");

let section = sql.slice(start, end);
console.log("Broken DO $:", (section.match(/^DO \$\r?\n/gm) || []).length);
console.log("Broken END $;:", (section.match(/END \$;/g) || []).length);

// Replacement functions avoid $$ → $ collapse in String.replace
section = section.replace(/^DO \$\r?\n/gm, () => "DO $$\n");
section = section.replace(/END \$;/g, () => "END $$;");

const okDo = (section.match(/^DO \$\$\r?\n/gm) || []).length;
const okEnd = (section.match(/END \$\$;/g) || []).length;
console.log("Fixed DO $$:", okDo, "Fixed END $$;:", okEnd);

if (okDo !== 38 || okEnd !== 38) {
  throw new Error(`Expected 38 DO/END blocks, got ${okDo}/${okEnd}`);
}

sql = sql.slice(0, start) + section + sql.slice(end);
fs.writeFileSync(path, sql);
console.log("Repaired Phase 4b dollar quoting");

// Harden patch script
const patchPath = "scripts/patch-missing-uniques.mjs";
let patch = fs.readFileSync(patchPath, "utf8");
const old = `sql = sql.replace(
      phase5Marker,
      uniqueAlters.join("\\n") + phase5Marker,
    );`;
const neu = `// split/join avoids String.replace collapsing $$ → $
    sql = sql.split(phase5Marker).join(uniqueAlters.join("\\n") + phase5Marker);`;
if (patch.includes(old)) {
  fs.writeFileSync(patchPath, patch.replace(old, neu));
  console.log("Hardened patch script");
} else if (!patch.includes("sql.split(phase5Marker)")) {
  console.log("WARN: could not locate replace() to harden; check manually");
}

const check = fs.readFileSync(path, "utf8");
const s4 = check.slice(
  check.indexOf("-- Phase 4b: UNIQUE constraints (idempotent"),
  check.indexOf("-- Phase 5: CREATE INDEX"),
);
console.log("profiles UNIQUE:", /user_id UUID NOT NULL UNIQUE/.test(check));
console.log("Phase 4b broken DO $ left:", /^DO \$\r?\n/m.test(s4));
console.log("Phase 4b DO $$ count:", (s4.match(/^DO \$\$/gm) || []).length);
console.log("Sample:\n" + s4.slice(0, 280));
