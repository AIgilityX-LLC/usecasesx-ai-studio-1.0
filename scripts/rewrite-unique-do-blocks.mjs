/**
 * Rewrite add-missing-unique-constraints.sql and Phase 4b in full-schema.sql
 * with existence checks that match by constraint name OR identical UNIQUE def,
 * so Phase 3 inline UNIQUEs + Phase 4b DO blocks coexist safely.
 */
import fs from "node:fs";

const MISSING = [
  { table: "ai_capabilities", cols: ["slug"], name: "ai_capabilities_slug_key" },
  {
    table: "ai_engine_credentials",
    cols: ["engine_slug"],
    name: "ai_engine_credentials_engine_slug_key",
  },
  { table: "business_functions", cols: ["slug"], name: "business_functions_slug_key" },
  { table: "business_objectives", cols: ["slug"], name: "business_objectives_slug_key" },
  { table: "countries", cols: ["code"], name: "countries_code_key" },
  { table: "gov_functions", cols: ["slug"], name: "gov_functions_slug_key" },
  { table: "industries", cols: ["slug"], name: "industries_slug_key" },
  {
    table: "pilot_invitations",
    cols: ["invite_token"],
    name: "pilot_invitations_invite_token_key",
  },
  { table: "platform_modules", cols: ["slug"], name: "platform_modules_slug_key" },
  { table: "profiles", cols: ["user_id"], name: "profiles_user_id_key" },
  { table: "taxonomy_maturity_levels", cols: ["slug"], name: "taxonomy_maturity_levels_slug_key" },
  { table: "taxonomy_sectors", cols: ["slug"], name: "taxonomy_sectors_slug_key" },
  { table: "taxonomy_tags", cols: ["slug"], name: "taxonomy_tags_slug_key" },
  { table: "use_cases", cols: ["slug"], name: "use_cases_slug_key" },
  {
    table: "workshop_canvas_documents",
    cols: ["storage_path"],
    name: "workshop_canvas_documents_storage_path_key",
  },
  { table: "workshop_invitations", cols: ["token"], name: "workshop_invitations_token_key" },
  { table: "workshop_outcomes", cols: ["workshop_id"], name: "workshop_outcomes_workshop_id_key" },
  {
    table: "workshop_public_value_canvas",
    cols: ["workshop_id"],
    name: "workshop_public_value_canvas_workshop_id_key",
  },
  { table: "workspace_invitations", cols: ["token"], name: "workspace_invitations_token_key" },
  {
    table: "collab_assignments",
    cols: ["entity_type", "entity_id", "user_id", "assignment_role"],
    name: "collab_assignments_entity_user_role_key",
  },
  {
    table: "collab_review_states",
    cols: ["entity_type", "entity_id"],
    name: "collab_review_states_entity_key",
  },
  {
    table: "collection_items",
    cols: ["collection_id", "use_case_id"],
    name: "collection_items_collection_id_use_case_id_key",
  },
  {
    table: "organization_members",
    cols: ["organization_id", "user_id"],
    name: "organization_members_organization_id_user_id_key",
  },
  {
    table: "organization_units",
    cols: ["organization_id", "slug"],
    name: "organization_units_organization_id_slug_key",
  },
  {
    table: "pilot_milestone_approvals",
    cols: ["user_id", "cohort", "milestone_key"],
    name: "pilot_milestone_approvals_user_cohort_milestone_key",
  },
  {
    table: "pilot_onboarding_profiles",
    cols: ["user_id", "cohort"],
    name: "pilot_onboarding_profiles_user_id_cohort_key",
  },
  {
    table: "saved_use_cases",
    cols: ["user_id", "use_case_id"],
    name: "saved_use_cases_user_id_use_case_id_key",
  },
  {
    table: "use_case_deliverable_versions",
    cols: ["deliverable_id", "version"],
    name: "use_case_deliverable_versions_deliverable_id_version_key",
  },
  {
    table: "use_case_deliverables",
    cols: ["use_case_id", "deliverable_type"],
    name: "use_case_deliverables_use_case_id_deliverable_type_key",
  },
  {
    table: "use_case_ratings",
    cols: ["use_case_slug", "user_id"],
    name: "use_case_ratings_use_case_slug_user_id_key",
  },
  {
    table: "use_case_scores",
    cols: ["user_id", "use_case_id"],
    name: "use_case_scores_user_id_use_case_id_key",
  },
  {
    table: "use_case_versions",
    cols: ["use_case_id", "version"],
    name: "use_case_versions_use_case_id_version_key",
  },
  { table: "user_roles", cols: ["user_id", "role"], name: "user_roles_user_id_role_key" },
  {
    table: "workshop_canvas_versions",
    cols: ["workshop_id", "version"],
    name: "workshop_canvas_versions_workshop_id_version_key",
  },
  {
    table: "workshop_votes",
    cols: ["item_id", "voter_id", "criterion"],
    name: "workshop_votes_item_id_voter_id_criterion_key",
  },
  {
    table: "workspace_ai_engines",
    cols: ["workspace_id", "engine_slug"],
    name: "workspace_ai_engines_workspace_id_engine_slug_key",
  },
  {
    table: "workspace_export_preferences",
    cols: ["workspace_id", "export_key"],
    name: "workspace_export_preferences_workspace_id_export_key_key",
  },
  {
    table: "workspace_members",
    cols: ["workspace_id", "user_id"],
    name: "workspace_members_workspace_id_user_id_key",
  },
];

function constraintDoBlock(table, name, cols) {
  const colList = cols.join(", ");
  const def = `UNIQUE (${colList})`;
  return `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.${table}'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = '${name}'
        OR pg_get_constraintdef(c.oid) = '${def}'
      )
  ) THEN
    ALTER TABLE public.${table}
      ADD CONSTRAINT ${name} UNIQUE (${colList});
  END IF;
END $$;`;
}

function renderSection(titleNote) {
  const columnLevel = MISSING.slice(0, 19);
  const composite = MISSING.slice(19);
  const lines = [];
  lines.push(`-- Column-level UNIQUE (${columnLevel.length})`);
  lines.push("");
  for (const c of columnLevel) {
    lines.push(`-- public.${c.table}.${c.cols[0]}`);
    lines.push(constraintDoBlock(c.table, c.name, c.cols));
    lines.push("");
  }
  lines.push(`-- Composite UNIQUE (${composite.length})`);
  lines.push("");
  for (const c of composite) {
    lines.push(`-- public.${c.table}(${c.cols.join(", ")})`);
    lines.push(constraintDoBlock(c.table, c.name, c.cols));
    lines.push("");
  }
  return { lines, columnLevel, composite, titleNote };
}

// Standalone file
{
  const { lines, columnLevel, composite } = renderSection();
  const out = [
    "-- =============================================================================",
    "-- add-missing-unique-constraints.sql",
    "-- Restores UNIQUE constraints dropped during full-schema.sql restructuring.",
    "-- Safely re-runnable: skips if a UNIQUE with the same name or same column list exists.",
    `-- Count: ${MISSING.length} UNIQUE constraints (${columnLevel.length} column + ${composite.length} composite)`,
    "-- =============================================================================",
    "",
    ...lines,
  ].join("\n");
  fs.writeFileSync("docs/migration/add-missing-unique-constraints.sql", out);
  console.log("Rewrote standalone:", MISSING.length);
}

// Replace Phase 4b body in full-schema.sql
{
  const schemaPath = "docs/migration/full-schema.sql";
  let sql = fs.readFileSync(schemaPath, "utf8");
  const startMarker =
    "-- Phase 4b: UNIQUE constraints (idempotent; mirrors add-missing-unique-constraints.sql)";
  const endMarker = "-- Phase 5: CREATE INDEX";
  const start = sql.indexOf(startMarker);
  const end = sql.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Phase 4b markers not found: start=${start} end=${end}`);
  }
  const { lines } = renderSection();
  const section = [
    startMarker,
    "-- ---------------------------------------------------------------------------",
    "",
    ...lines,
    "",
  ].join("\n");
  // Use slice concat (not String.replace) to preserve $$
  sql = sql.slice(0, start) + section + sql.slice(end);
  fs.writeFileSync(schemaPath, sql);
  console.log("Rewrote Phase 4b in full-schema.sql");
}

// Verify
const stand = fs.readFileSync("docs/migration/add-missing-unique-constraints.sql", "utf8");
const schema = fs.readFileSync("docs/migration/full-schema.sql", "utf8");
console.log("standalone DO $$:", (stand.match(/^DO \$\$/gm) || []).length);
console.log(
  "standalone pg_get_constraintdef checks:",
  (stand.match(/pg_get_constraintdef/g) || []).length,
);
const s4start = schema.indexOf("-- Phase 4b: UNIQUE constraints (idempotent; mirrors");
const s4end = schema.indexOf("-- Phase 5: CREATE INDEX");
const s4 = schema.slice(s4start, s4end);
console.log("Phase4b DO $$:", (s4.match(/^DO \$\$/gm) || []).length);
console.log("Phase4b pg_get_constraintdef:", (s4.match(/pg_get_constraintdef/g) || []).length);
console.log("profiles.user_id UNIQUE:", /user_id UUID NOT NULL UNIQUE/.test(schema));
