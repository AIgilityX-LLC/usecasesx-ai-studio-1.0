# Data Migration Plan — 14 August 2026 Launch Window

**Rule:** additive only during launch window (through 31 Dec 2026). No destructive drops, renames, or ownership reassignments without a staged plan + rollback documented here and signed off in `docs/product/20-day-release-board.md` §7.

Source audits: `docs/audit/2026-07-25/database/*`, `docs/audit/2026-07-25/top-risks.md`.

---

## Phase A — Pre-launch additive migrations (26 Jul – 9 Aug)

Order matters: each migration is atomic; every `CREATE TABLE public.<t>` in the same file MUST be followed by `GRANT` → `ENABLE RLS` → `CREATE POLICY`.

### A1 — Tighten anon-INSERT `WITH CHECK` (P0-8)

**Tables:** `lead_captures`, event ingest tables permitting anon writes.
**Change:** replace `WITH CHECK (true)` with `WITH CHECK (user_id IS NULL AND workspace_id IS NULL)` (or equivalent per table). Anon can insert but cannot forge identity.
**Verification:** `bun run test:rls`; new assertion that anon-forged `user_id` insert is rejected.
**Rollback:** revert policy; the previous permissive policy is stored in git.

### A2 — Ownership FKs to `auth.users` (structural safety)

**Tables (18):** every table with `user_id`/`owner_id` currently lacking an FK constraint.
**Change:** `ALTER TABLE … ADD CONSTRAINT <t>_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`.
**Verification:** `bun run test:rls`; verification query in `docs/audit/2026-07-25/database/verification-queries.md` §2.
**Rollback:** `ALTER TABLE … DROP CONSTRAINT`.

### A3 — `studio_drafts` (or `use_cases.draft` flag) for server-persisted drafts (P1-1)

**Change:** either new table `studio_drafts` with `(id, user_id, workspace_id, payload jsonb, updated_at)` + full RLS + grants, OR add `is_draft boolean default false` to `use_cases`.
**Decision required:** table vs column. Default: new table (isolates draft churn from published rows).
**Grants:** `SELECT, INSERT, UPDATE, DELETE` on the owning user via `auth.uid() = user_id`.
**Verification:** RLS test — user A cannot read user B's drafts.
**Rollback:** drop table (no dependencies).

### A4 — `activation_events` (P1-11)

**Change:** append-only table `(id, event_type text, user_id uuid, workspace_id uuid, payload jsonb, occurred_at timestamptz default now())`.
**Grants:** `INSERT` to `authenticated` (with `WITH CHECK (auth.uid() = user_id)`); `SELECT` to `service_role` only (admin dashboards). No `UPDATE`/`DELETE` policies.
**Verification:** RLS test proves append-only (UPDATE/DELETE rejected). `test:rls` green.
**Rollback:** drop table.

### A5 — `entitlements` + `usage_events` for fair-use meter (P1-10)

**Change:** two tables — `entitlements(workspace_id, period_start, limits jsonb, edition text)` and append-only `usage_events(id, user_id, workspace_id, event_type, occurred_at)`. Aggregation via SQL view `usage_meter_v`.
**Grants:** `SELECT` to `authenticated` scoped to own workspace via `has_role()`; `INSERT` to `service_role` only for `entitlements`. `usage_events` INSERT allowed for `authenticated` with `auth.uid() = user_id`.
**Verification:** RLS test — cross-workspace read denied. Aggregation view returns per-user counts.
**Rollback:** drop view, then tables.

---

## Phase B — Post-launch (after 14 Aug)

- Introduce `memberships` (multi-workspace) and enforce workspace-scope on all owning tables. Requires staged migration + Enterprise DP sign-off.
- Reindex hot paths identified by `bun run test:e2e` p95 metrics.

---

## Deferred / prohibited during launch window

- Any `DROP TABLE`, `DROP COLUMN`, destructive rename, or ownership reassignment.
- Any change to reserved schemas: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- Any edit to auto-generated files (`src/integrations/supabase/*.ts`, `supabase/config.toml`, `.env`).

## Verification pipeline

For every migration:

1. `bun run test:rls` green.
2. `docs/audit/2026-07-25/database/verification-queries.md` re-run; results appended to migration PR.
3. `bun run build` green.
4. Rollback SQL saved in the same PR under `supabase/migrations/rollback/`.

## Owner sign-off

| Migration | Owner | Reviewer | Status |
|---|---|---|---|
| A1 | @db-owner | @security | pending |
| A2 | @db-owner | @security | pending |
| A3 | @studio-owner | @db-owner | pending |
| A4 | @analytics-owner | @security | pending |
| A5 | @entitlements-owner | @security | pending |
