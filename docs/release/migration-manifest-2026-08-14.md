# Migration manifest — release candidate v1.0.0-rc.1 (14 August 2026)

Authoritative list of the migrations that make up the candidate. Verified by
`bun run verify:release`, which fails if a migration is missing from this table, unknown to it,
out of timestamp order, destructive, or carries demo/sample seed rows (unless annotated as a
**recorded exception**).

Properties enforced for every entry:

- **Ordered** — filename starts with a 14-digit UTC timestamp; the on-disk sort is the apply order.
- **Repeatable** — guarded with `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS`
  before create, so re-application is a no-op.
- **Additive** — no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM`, `RENAME COLUMN`, or
  `DISABLE ROW LEVEL SECURITY`.
- **Seed-free** — no content rows, except narrow recorded exceptions below. Only singleton config
  rows are otherwise permitted (`pilot_settings`, `taxonomy_meta`, `plans`, `platform_modules`,
  `ai_capabilities`).

## Apply order

| #   | Migration                                               | Purpose                                                                                                                                 | Kind                |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | `20260907155028_fix_anon_read_use_cases.sql`            | Correct anon read posture on `use_cases` (forward-fix companion to entry 2)                                                             | Policy              |
| 2   | `20260907160000_anon_read_use_cases.sql`                | Column-level `anon` SELECT grants for publicly visible use-case fields                                                                  | Grant               |
| 3   | `20260923120000_v2_04_versioned_core_model.sql`         | Versioned core model: opportunity/use-case versions and canvas sections — **recorded exception** (bootstrap `opportunity_versions` row) | Tables + RLS + seed |
| 4   | `20260923140000_v2_05_evidence_foundation.sql`          | Evidence items, provenance, and audit foundation                                                                                        | Tables + RLS        |
| 5   | `20260923160000_v2_06_opportunity_intake.sql`           | Opportunity intake fields (sponsor, geography, constraints)                                                                             | Additive columns    |
| 6   | `20260923180000_v2_08_solution_design.sql`              | Agentic / AI solution-design records per Studio use case                                                                                | Tables + RLS        |
| 7   | `20260923200000_v2_09_scoring_engine.sql`               | Scoring engine criterion assessments and evidence completeness                                                                          | Tables + RLS        |
| 8   | `20260923220000_v2_10_decision_gates.sql`               | Decision gates, reviews, and immutable decision events                                                                                  | Tables + RLS        |
| 9   | `20260923240000_v2_11_governance_preview.sql`           | Governance applicability preview and CyberX handoff metadata                                                                            | Tables + RLS        |
| 10  | `20260923260000_v2_12_dependencies_scenarios.sql`       | Portfolio dependencies and saved scenarios                                                                                              | Tables + RLS        |
| 11  | `20260923280000_v2_14_roadmap_brief.sql`                | Roadmap gate/status + versioned implementation brief                                                                                    | Tables + RLS        |
| 12  | `20260923300000_v2_15_workshop_mode.sql`                | Workshop mode agenda, ideation, clustering, voting                                                                                      | Tables + RLS        |
| 13  | `20260923320000_v2_17_ai_feedback.sql`                  | Redacted AI suggestion feedback telemetry                                                                                               | Tables + RLS        |
| 14  | `20260923340000_v2_18_enterprise_identity.sql`          | Enterprise identity, localization, and sovereignty readiness                                                                            | Tables + RLS        |
| 15  | `20260923360000_v2_19_content_governance.sql`           | Repository content governance workflow and provenance                                                                                   | Tables + RLS        |
| 16  | `20260923360100_v2_19_pattern_template_seed.sql`        | Reviewed pattern-template rows (no client names / ROI) — **recorded exception**                                                         | Seed                |
| 17  | `20260929120000_v2_19_anon_use_cases_column_grants.sql` | Extend anon column-level SELECT after content-governance columns                                                                        | Grant               |
| 18  | `20260929180000_founding_access_requests.sql`           | Founding Access request → review → invite flow                                                                                          | Tables + RLS        |
| 19  | `20261028180000_rls_telemetry_and_role_hardening.sql`   | Restrict `user_roles` writes to `super_admin`; scope telemetry inserts (`use_case_views` / downloads / `integration_events`)            | RLS only            |

### Recorded exceptions for entries 3 and 16

`bun run verify:release` detects top-level `INSERT INTO public.*` outside the config-table allow-list
and allows them **only when this row is annotated `recorded exception`**.

- **Entry 3** — installs a single bootstrap `opportunity_versions` row required for the versioned
  core model to initialize. No client or demo portfolio content.
- **Entry 16** — idempotent pattern-template seed (`use_case_patterns`) with evidence class
  `pattern_template`. No client names and no numeric ROI.

Any further data-bearing migration needs the data owner's approval and its own `recorded exception`
row here; without one the integrity gate fails.

## Demo and reference data (not migrations)

Content is applied separately so a schema apply never writes rows beyond the exceptions above:

| Data set                                         | Applied by                                                      |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Launch reference corpus (54 published use cases) | `scripts/seed/apply-launch-corpus.mjs`, `bun run seed:baseline` |
| Demo personas / accounts                         | `bun run seed:demo-accounts`, `scripts/seed/demo-personas.mjs`  |
| Super-admin bootstrap                            | `bun run seed:superadmin`                                       |
| Baseline refresh                                 | `bun run seed:refresh`                                          |

## Backup and rollback

- **Backup before apply** — Lovable Cloud takes automatic daily backups; request an on-demand
  data export from Cloud → Advanced settings immediately before applying to production.
- **Rollback posture** — all 19 migrations are additive (entries 3 and 16 are recorded seed
  exceptions), so the safe rollback for the _application_ is to revert the app to the previous
  version; the schema can stay ahead. No `DROP` is required and none is authorised. Entry 19
  rollback SQL (policy restore) lives in `docs/security/rls-fix-rollback.md`.
- **Forward-fix** — defects in a policy or routine are corrected with a new additive migration
  (`CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` + `CREATE POLICY`), never by editing an
  applied file. Editing an applied migration file breaks repeatability and is treated as a P0
  process violation.
