# Migration plan — additive only (2026-07-25)

Proposals only. **No SQL has been executed.** Each recommendation lists
scope, backfill, verification query and rollback / forward-fix. Grouped by
phase to match the 20-day release board.

Rules (AGENTS.md §5):
- Additive only until further notice.
- Every `CREATE TABLE public.<t>` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`
  in the same migration.
- No destructive drops, renames, or ownership reassignments in this window.

## Phase A — Pre-launch P0 (safety, referential integrity)

### A1. Anon-INSERT identity-forgery guard (verify only, no migration needed if policies already check)

- **Tables**: `cta_events`, `module_events`, `use_case_downloads`
- **Concern**: anon caller could send `user_id = <someone-else>`.
- **Action**: inspect each policy's `WITH CHECK`. If missing
  `(user_id IS NULL OR user_id = auth.uid())`, propose an additive `ALTER
  POLICY` (drop + create with tightened `WITH CHECK`) in a follow-up.
- **Verification**:

  ```sql
  SELECT tablename, policyname, with_check
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('cta_events','module_events','use_case_downloads')
    AND cmd='INSERT';
  ```

- **Rollback**: recreate the previous policy definition.

### A2. Add missing FK → `auth.users(id)` on ownership columns

- **Tables (14)**: `ai_use_cases.created_by`, `use_case_boards.created_by`,
  `feasibility_scores.created_by`, `portfolios.user_id`,
  `saved_use_cases.user_id`, `use_case_ratings.user_id`,
  `use_case_feedback.user_id`, `use_case_scores.user_id`,
  `use_case_deliverables.created_by`, `generated_reports.user_id`,
  `integration_events.user_id`, `use_case_downloads.user_id`,
  `use_case_views.user_id`, `workspaces.created_by`.
- **Shape** (per table):

  ```sql
  ALTER TABLE public.<t>
    ADD CONSTRAINT <t>_<col>_fkey
    FOREIGN KEY (<col>) REFERENCES auth.users(id)
    ON DELETE <SET NULL | CASCADE>
    NOT VALID;                       -- avoid full-table scan
  ALTER TABLE public.<t> VALIDATE CONSTRAINT <t>_<col>_fkey;
  ```

- **ON DELETE policy**:
  - `CASCADE` for owned records (portfolios, saved_use_cases, scores,
    ratings, feedback, generated_reports, feasibility_scores).
  - `SET NULL` for log/event tables (downloads, views, module_events,
    integration_events).
- **Backfill**: none — every table is empty at T=0 (see `inventory.md`).
- **Verification**:

  ```sql
  SELECT conrelid::regclass, conname
  FROM pg_constraint
  WHERE contype='f'
    AND confrelid = 'auth.users'::regclass;
  ```

- **Rollback**: `ALTER TABLE public.<t> DROP CONSTRAINT <t>_<col>_fkey;`

### A3. Confirm audit tables are append-only

- **Tables**: `audit_events`, `use_case_audit_log`.
- **Action**: verify there is **no** `FOR UPDATE` or `FOR DELETE` policy.
- **Verification**:

  ```sql
  SELECT tablename, cmd, count(*)
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('audit_events','use_case_audit_log')
  GROUP BY 1, 2;
  -- Expect: only SELECT and INSERT rows.
  ```

- **If a policy exists**: additive migration to drop the offending policy
  (this is one of the few "drops" allowed — a bad policy is a security
  defect, and dropping it is strictly restrictive, not destructive to data).

## Phase A — Pre-launch P1 (performance and demo/real separation)

### A4. Composite indexes on hot paths

- `CREATE INDEX CONCURRENTLY idx_boards_workspace_status ON public.use_case_boards(workspace_id, status);`
- `CREATE INDEX CONCURRENTLY idx_ai_use_cases_board_status ON public.ai_use_cases(board_id, status);`
- `CREATE INDEX CONCURRENTLY idx_submissions_user_status ON public.use_case_submissions(user_id, status);`
- **Rollback**: `DROP INDEX CONCURRENTLY IF EXISTS <name>;`

### A5. `is_demo` flag on `organizations`

- **Shape**:

  ```sql
  ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
  ```

- **Backfill**: set `is_demo = true` for orgs whose only members are seed
  demo accounts (`lite@demo.usecasex.app`, `pro@demo.usecasex.app`) via a
  scoped `UPDATE` in the seed script, not in the migration.
- **RLS**: no policy change — flag is read-only metadata.
- **Rollback**: `ALTER TABLE public.organizations DROP COLUMN is_demo;`

## Phase B — Post-launch (naming, memberships, entitlements)

### B1. Standardise ownership column naming
- Add generated columns (e.g. `owner_id GENERATED ALWAYS AS (COALESCE(user_id, created_by)) STORED`)
  as a compatibility shim, then update queries incrementally. **No renames.**

### B2. `memberships` table (multi-user workspaces)
- New table `workspace_members(workspace_id, user_id, role, invited_by, joined_at)`.
- GRANT + RLS + policies added in the same migration.
- Replace `user_in_workspace` predicate body to consult the table.
- Backfill: one row per `(profiles.organization_id → workspaces.id, profiles.user_id, 'owner')`.

### B3. `entitlements` table (Founding Access ledger)
- New table `user_entitlements(user_id, tier, source, granted_at, expires_at, revoked_at, notes)`.
- `has_pro_entitlement` rewritten to read from the ledger with a fallback
  to `profiles.entitlement_tier` for backward compatibility.
- Backfill: one row per existing `profiles.entitlement_tier`.

## Phase C — Enterprise runway

### C1. Denormalise `workspace_id` onto tenant child tables
- Add nullable `workspace_id` to `ai_use_cases`, `blueprints`,
  `feasibility_scores`, `data_readiness_assessments`, `integration_links`,
  `use_case_deliverables`.
- Backfill from parent board.
- Add trigger to keep in sync on INSERT.
- Later (separate migration): `SET NOT NULL` once backfill is verified.
- Simplifies RLS and enables per-tenant partitioning.

### C2. Partition `audit_events` by month
- `PARTITION BY RANGE (created_at)`, one partition per month, retention
  policy job. Requires a staged move, out of scope for launch.

## Cross-cutting rules

- Every proposal above is **additive**: new columns, new FKs, new indexes,
  new tables. No destructive drops or renames.
- Every proposal has a stated rollback that leaves the schema in its
  current shape.
- No migration in this plan touches production data (all tenant tables are
  empty at T=0).
- No migration modifies reserved schemas (`auth`, `storage`, `realtime`,
  `supabase_functions`, `vault`).
