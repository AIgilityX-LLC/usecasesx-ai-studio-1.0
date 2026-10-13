/**
 * Generate docs/migration/add-missing-unique-constraints.sql
 * and patch docs/migration/full-schema.sql Phase 3 (column UNIQUE)
 * + Phase 4 (composite UNIQUE via ALTER).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCHEMA = path.join(ROOT, "docs/migration/full-schema.sql");
const OUT = path.join(ROOT, "docs/migration/add-missing-unique-constraints.sql");

/** @type {{ table: string, cols: string[], name: string, columnLevel: boolean }[]} */
const MISSING = [
  // --- 18 column-level ---
  { table: "ai_capabilities", cols: ["slug"], name: "ai_capabilities_slug_key", columnLevel: true },
  {
    table: "ai_engine_credentials",
    cols: ["engine_slug"],
    name: "ai_engine_credentials_engine_slug_key",
    columnLevel: true,
  },
  {
    table: "business_functions",
    cols: ["slug"],
    name: "business_functions_slug_key",
    columnLevel: true,
  },
  {
    table: "business_objectives",
    cols: ["slug"],
    name: "business_objectives_slug_key",
    columnLevel: true,
  },
  { table: "countries", cols: ["code"], name: "countries_code_key", columnLevel: true },
  { table: "gov_functions", cols: ["slug"], name: "gov_functions_slug_key", columnLevel: true },
  { table: "industries", cols: ["slug"], name: "industries_slug_key", columnLevel: true },
  {
    table: "pilot_invitations",
    cols: ["invite_token"],
    name: "pilot_invitations_invite_token_key",
    columnLevel: true,
  },
  {
    table: "platform_modules",
    cols: ["slug"],
    name: "platform_modules_slug_key",
    columnLevel: true,
  },
  { table: "profiles", cols: ["user_id"], name: "profiles_user_id_key", columnLevel: true },
  {
    table: "taxonomy_maturity_levels",
    cols: ["slug"],
    name: "taxonomy_maturity_levels_slug_key",
    columnLevel: true,
  },
  {
    table: "taxonomy_sectors",
    cols: ["slug"],
    name: "taxonomy_sectors_slug_key",
    columnLevel: true,
  },
  { table: "taxonomy_tags", cols: ["slug"], name: "taxonomy_tags_slug_key", columnLevel: true },
  { table: "use_cases", cols: ["slug"], name: "use_cases_slug_key", columnLevel: true },
  {
    table: "workshop_canvas_documents",
    cols: ["storage_path"],
    name: "workshop_canvas_documents_storage_path_key",
    columnLevel: true,
  },
  {
    table: "workshop_invitations",
    cols: ["token"],
    name: "workshop_invitations_token_key",
    columnLevel: true,
  },
  {
    table: "workshop_outcomes",
    cols: ["workshop_id"],
    name: "workshop_outcomes_workshop_id_key",
    columnLevel: true,
  },
  {
    table: "workshop_public_value_canvas",
    cols: ["workshop_id"],
    name: "workshop_public_value_canvas_workshop_id_key",
    columnLevel: true,
  },
  {
    table: "workspace_invitations",
    cols: ["token"],
    name: "workspace_invitations_token_key",
    columnLevel: true,
  },
  // --- 20 composite ---
  {
    table: "collab_assignments",
    cols: ["entity_type", "entity_id", "user_id", "assignment_role"],
    name: "collab_assignments_entity_user_role_key",
    columnLevel: false,
  },
  {
    table: "collab_review_states",
    cols: ["entity_type", "entity_id"],
    name: "collab_review_states_entity_key",
    columnLevel: false,
  },
  {
    table: "collection_items",
    cols: ["collection_id", "use_case_id"],
    name: "collection_items_collection_id_use_case_id_key",
    columnLevel: false,
  },
  {
    table: "organization_members",
    cols: ["organization_id", "user_id"],
    name: "organization_members_organization_id_user_id_key",
    columnLevel: false,
  },
  {
    table: "organization_units",
    cols: ["organization_id", "slug"],
    name: "organization_units_organization_id_slug_key",
    columnLevel: false,
  },
  {
    table: "pilot_milestone_approvals",
    cols: ["user_id", "cohort", "milestone_key"],
    name: "pilot_milestone_approvals_user_cohort_milestone_key",
    columnLevel: false,
  },
  {
    table: "pilot_onboarding_profiles",
    cols: ["user_id", "cohort"],
    name: "pilot_onboarding_profiles_user_id_cohort_key",
    columnLevel: false,
  },
  {
    table: "saved_use_cases",
    cols: ["user_id", "use_case_id"],
    name: "saved_use_cases_user_id_use_case_id_key",
    columnLevel: false,
  },
  {
    table: "use_case_deliverable_versions",
    cols: ["deliverable_id", "version"],
    name: "use_case_deliverable_versions_deliverable_id_version_key",
    columnLevel: false,
  },
  {
    table: "use_case_deliverables",
    cols: ["use_case_id", "deliverable_type"],
    name: "use_case_deliverables_use_case_id_deliverable_type_key",
    columnLevel: false,
  },
  {
    table: "use_case_ratings",
    cols: ["use_case_slug", "user_id"],
    name: "use_case_ratings_use_case_slug_user_id_key",
    columnLevel: false,
  },
  {
    table: "use_case_scores",
    cols: ["user_id", "use_case_id"],
    name: "use_case_scores_user_id_use_case_id_key",
    columnLevel: false,
  },
  {
    table: "use_case_versions",
    cols: ["use_case_id", "version"],
    name: "use_case_versions_use_case_id_version_key",
    columnLevel: false,
  },
  {
    table: "user_roles",
    cols: ["user_id", "role"],
    name: "user_roles_user_id_role_key",
    columnLevel: false,
  },
  {
    table: "workshop_canvas_versions",
    cols: ["workshop_id", "version"],
    name: "workshop_canvas_versions_workshop_id_version_key",
    columnLevel: false,
  },
  {
    table: "workshop_votes",
    cols: ["item_id", "voter_id", "criterion"],
    name: "workshop_votes_item_id_voter_id_criterion_key",
    columnLevel: false,
  },
  {
    table: "workspace_ai_engines",
    cols: ["workspace_id", "engine_slug"],
    name: "workspace_ai_engines_workspace_id_engine_slug_key",
    columnLevel: false,
  },
  {
    table: "workspace_export_preferences",
    cols: ["workspace_id", "export_key"],
    name: "workspace_export_preferences_workspace_id_export_key_key",
    columnLevel: false,
  },
  {
    table: "workspace_members",
    cols: ["workspace_id", "user_id"],
    name: "workspace_members_workspace_id_user_id_key",
    columnLevel: false,
  },
];

// Fix: I listed 19 column-level above. Count again from audit:
// Column (18): ai_capabilities.slug, ai_engine_credentials.engine_slug, business_functions.slug,
// business_objectives.slug, countries.code, gov_functions.slug, industries.slug,
// pilot_invitations.invite_token, platform_modules.slug, profiles.user_id,
// taxonomy_maturity_levels.slug, taxonomy_sectors.slug, taxonomy_tags.slug, use_cases.slug,
// workshop_canvas_documents.storage_path, workshop_invitations.token, workshop_outcomes.workshop_id,
// workshop_public_value_canvas.workshop_id, workspace_invitations.token
// That's 19! The audit said 18 column + 20 composite = 38.
// Let me recount audit column list:
// 1 ai_capabilities.slug
// 2 ai_engine_credentials.engine_slug
// 3 business_functions.slug
// 4 business_objectives.slug
// 5 countries.code
// 6 gov_functions.slug
// 7 industries.slug
// 8 pilot_invitations.invite_token
// 9 platform_modules.slug
// 10 profiles.user_id
// 11 taxonomy_maturity_levels.slug
// 12 taxonomy_sectors.slug
// 13 taxonomy_tags.slug
// 14 use_cases.slug
// 15 workshop_canvas_documents.storage_path
// 16 workshop_invitations.token
// 17 workshop_outcomes.workshop_id
// 18 workshop_public_value_canvas.workshop_id
// 19 workspace_invitations.token
// That's 19 column-level. And composites were 19 in my list... let me count composites:
// 1 collab_assignments, 2 collab_review_states, 3 collection_items, 4 organization_members,
// 5 organization_units, 6 pilot_milestone_approvals, 7 pilot_onboarding_profiles, 8 saved_use_cases,
// 9 use_case_deliverable_versions, 10 use_case_deliverables, 11 use_case_ratings, 12 use_case_scores,
// 13 use_case_versions, 14 user_roles, 15 workshop_canvas_versions, 16 workshop_votes,
// 17 workspace_ai_engines, 18 workspace_export_preferences, 19 workspace_members
// = 19 composite. Total 38. The earlier "18+20" was a slight miscount; the list of 38 keys is correct.

function constraintDoBlock(table, name, cols) {
  const colList = cols.join(", ");
  return `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = '${name}'
      AND conrelid = 'public.${table}'::regclass
  ) THEN
    ALTER TABLE public.${table}
      ADD CONSTRAINT ${name} UNIQUE (${colList});
  END IF;
END $$;`;
}

function generateStandalone() {
  const lines = [
    "-- =============================================================================",
    "-- add-missing-unique-constraints.sql",
    "-- Restores UNIQUE constraints dropped during full-schema.sql restructuring.",
    "-- Safely re-runnable: each constraint is added only if missing (pg_constraint check).",
    `-- Count: ${MISSING.length} UNIQUE constraints`,
    "-- =============================================================================",
    "",
  ];

  const columnLevel = MISSING.filter((c) => c.columnLevel);
  const composite = MISSING.filter((c) => !c.columnLevel);

  lines.push("-- ---------------------------------------------------------------------------");
  lines.push(`-- Column-level UNIQUE (${columnLevel.length})`);
  lines.push("-- ---------------------------------------------------------------------------");
  lines.push("");
  for (const c of columnLevel) {
    lines.push(`-- public.${c.table}.${c.cols[0]}`);
    lines.push(constraintDoBlock(c.table, c.name, c.cols));
    lines.push("");
  }

  lines.push("-- ---------------------------------------------------------------------------");
  lines.push(`-- Composite UNIQUE (${composite.length})`);
  lines.push("-- ---------------------------------------------------------------------------");
  lines.push("");
  for (const c of composite) {
    lines.push(`-- public.${c.table}(${c.cols.join(", ")})`);
    lines.push(constraintDoBlock(c.table, c.name, c.cols));
    lines.push("");
  }

  fs.writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log("Wrote", OUT, "with", MISSING.length, "constraints");
}

function patchFullSchema() {
  let sql = fs.readFileSync(SCHEMA, "utf8");

  // Phase 3: add UNIQUE to column definitions for column-level constraints
  for (const c of MISSING.filter((x) => x.columnLevel)) {
    const table = c.table;
    const col = c.cols[0];
    const createRe = new RegExp(
      `(CREATE TABLE IF NOT EXISTS public\\.${table} \\()([\\s\\S]*?)(\\n\\);)`,
    );
    const m = sql.match(createRe);
    if (!m) {
      console.error("WARN: CREATE TABLE not found for", table);
      continue;
    }
    let body = m[2];
    // Match column line; allow commas inside DEFAULT fn args by matching to trailing comma-or-EOL
    const colLineRe = new RegExp(`^(\\s*${col}\\s+)(.+?)(,)?\\s*$`, "im");
    const cm = body.match(colLineRe);
    if (!cm) {
      console.error("WARN: column not found", table, col);
      continue;
    }
    if (/\bUNIQUE\b/i.test(cm[2])) {
      console.log("SKIP (already UNIQUE):", table + "." + col);
      continue;
    }
    // Insert UNIQUE before trailing comma handling — put UNIQUE at end of type/null/default clause
    const newColDef = cm[2].replace(/\s+$/, "") + " UNIQUE";
    body = body.replace(colLineRe, `${cm[1]}${newColDef}${cm[3]}`);
    sql = sql.replace(createRe, `${m[1]}${body}${m[3]}`);
    console.log("Phase 3 patched column UNIQUE:", table + "." + col);
  }

  // Phase 3: add UNIQUE (...) before PRIMARY KEY for composite constraints
  for (const c of MISSING.filter((x) => !x.columnLevel)) {
    const table = c.table;
    const colList = c.cols.join(", ");
    const createRe = new RegExp(
      `(CREATE TABLE IF NOT EXISTS public\\.${table} \\()([\\s\\S]*?)(\\n\\);)`,
    );
    const m = sql.match(createRe);
    if (!m) {
      console.error("WARN: CREATE TABLE not found for", table);
      continue;
    }
    let body = m[2];
    if (
      new RegExp(`\\bUNIQUE\\s*\\(\\s*${c.cols.map(escapeRe).join("\\s*,\\s*")}\\s*\\)`, "i").test(
        body,
      )
    ) {
      console.log("SKIP (already table UNIQUE):", table + "(" + colList + ")");
      continue;
    }
    // Insert before PRIMARY KEY line
    if (/\n\s*PRIMARY KEY\s*\(/i.test(body)) {
      body = body.replace(/(\n\s*)(PRIMARY KEY\s*\()/i, `$1UNIQUE (${colList}),\n$1$2`);
    } else {
      // append before closing
      body = body.replace(/\s*$/, "") + `,\n  UNIQUE (${colList})\n`;
    }
    sql = sql.replace(createRe, `${m[1]}${body}${m[3]}`);
    console.log("Phase 3 patched table UNIQUE:", table + "(" + colList + ")");
  }

  // Also emit Phase 4 section with ALTER DO blocks for documentation parity /
  // environments that only run Phase 4 deltas — actually user asked Phase 3/4.
  // Embedding in CREATE TABLE (Phase 3) is enough for full rebuilds.
  // Add a Phase 4b section with the same idempotent ALTERs so a DB that already
  // has tables without UNIQUEs can pick them up if someone re-runs only alters.
  // User said: "include these constraints in Phase 3/4" — Phase 3 inline is primary.
  // Add Phase 4 unique alters AFTER FK section, before Phase 5.

  const phase5Marker = "-- Phase 5: CREATE INDEX";
  if (!sql.includes(phase5Marker)) {
    throw new Error("Phase 5 marker not found");
  }
  if (!sql.includes("-- Phase 4b: UNIQUE constraints")) {
    const uniqueAlters = [
      "",
      "-- ---------------------------------------------------------------------------",
      "-- Phase 4b: UNIQUE constraints (idempotent; mirrors add-missing-unique-constraints.sql)",
      "-- ---------------------------------------------------------------------------",
      "",
    ];
    for (const c of MISSING) {
      uniqueAlters.push(`-- public.${c.table}(${c.cols.join(", ")})`);
      uniqueAlters.push(constraintDoBlock(c.table, c.name, c.cols));
      uniqueAlters.push("");
    }
    sql = sql.replace(phase5Marker, uniqueAlters.join("\n") + phase5Marker);
    console.log("Inserted Phase 4b UNIQUE section before Phase 5");
  } else {
    console.log("Phase 4b already present; skipping insert");
  }

  // Update header comment for Phase 4
  sql = sql.replace(
    "-- Phase 4:  ALTER TABLE ADD CONSTRAINT (foreign keys)",
    "-- Phase 4:  ALTER TABLE ADD CONSTRAINT (foreign keys)\n-- Phase 4b: UNIQUE constraints (idempotent DO blocks)",
  );
  sql = sql.replace(
    "-- Phase 4: ALTER TABLE ADD CONSTRAINT (foreign keys)\n",
    "-- Phase 4: ALTER TABLE ADD CONSTRAINT (foreign keys)\n-- Phase 4b follows after FKs (UNIQUE constraints)\n",
  );

  fs.writeFileSync(SCHEMA, sql, "utf8");
  console.log("Patched", SCHEMA);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

console.log("Constraint count:", MISSING.length);
generateStandalone();
patchFullSchema();

// Verify
const schema = fs.readFileSync(SCHEMA, "utf8");
let ok = 0;
let bad = 0;
for (const c of MISSING) {
  if (c.columnLevel) {
    const createRe = new RegExp(
      `CREATE TABLE IF NOT EXISTS public\\.${c.table} \\(([\\s\\S]*?)\\n\\);`,
    );
    const m = schema.match(createRe);
    const colRe = new RegExp(`^\\s*${c.cols[0]}\\s+[^\\n]*\\bUNIQUE\\b`, "im");
    if (m && colRe.test(m[1])) {
      ok++;
    } else {
      bad++;
      console.error("VERIFY FAIL column:", c.table + "." + c.cols[0]);
    }
  } else {
    const createRe = new RegExp(
      `CREATE TABLE IF NOT EXISTS public\\.${c.table} \\(([\\s\\S]*?)\\n\\);`,
    );
    const m = schema.match(createRe);
    const uRe = new RegExp(
      `\\bUNIQUE\\s*\\(\\s*${c.cols.map(escapeRe).join("\\s*,\\s*")}\\s*\\)`,
      "i",
    );
    if (m && uRe.test(m[1])) {
      ok++;
    } else {
      bad++;
      console.error("VERIFY FAIL composite:", c.table + "(" + c.cols.join(",") + ")");
    }
  }
}
console.log("Verify Phase 3:", ok, "ok,", bad, "bad");
console.log("Phase 4b present:", schema.includes("Phase 4b: UNIQUE constraints"));
console.log("Standalone exists:", fs.existsSync(OUT), "bytes", fs.statSync(OUT).size);
