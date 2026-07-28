# Tenant & Workspace Ownership Migration Plan (non-destructive)

Status: **approved plan, not executed.** No SQL has been run. This document is the
authoritative specification for the tenancy foundation; execution happens in later
prompts, step by step, each with its own migration and rollback.

Companion documents:

- `docs/architecture/tenancy-rls-design.md` — policy-by-policy design
- `docs/architecture/tenancy-verification-queries.md` — read-only verification SQL
- `docs/architecture/data-migration-plan.md` — launch-window migration rules (A1–A5)

---

## 1. Current state (inspected 2026-07-27)

- `organizations` (id, name, plan, type, industry, country) — the de facto **tenant**.
- `workspaces` (organization_id, name, workspace_type, created_by) — today exactly one
  per organization, created by the SECURITY DEFINER function `ensure_user_workspace()`.
- `profiles` links a user to exactly one `organization_id` — membership is implicit and
  single-tenant. There is no memberships table.
- No `entitlements` table; entitlement state lives on `profiles.entitlement_tier`,
  `profiles.plan_type`, `profiles.entitlement_expires_at`.
- No organization units.

### Ownership columns present today

| Column            | Tables                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user_id`         | collections, cta_events, generated_reports, integration_events, module_events, portfolios, profiles, saved_use_cases, shortlists, use_case_downloads, use_case_feedback, use_case_ratings, use_case_scores, use_case_submissions, use_case_views, user_roles |
| `created_by`      | ai_use_cases, feasibility_scores, use_case_boards, use_case_deliverables, workspaces                                                                                                                                                                         |
| `organization_id` | profiles, workspaces, taxonomy_sectors                                                                                                                                                                                                                       |
| `workspace_id`    | use_case_boards **only**                                                                                                                                                                                                                                     |
| `actor_id`        | audit_events, use_case_audit_log                                                                                                                                                                                                                             |
| `submitted_by`    | use_cases, taxonomy_sectors                                                                                                                                                                                                                                  |

### Tenancy reached only by join

- `ai_use_cases → use_case_boards → workspaces → organizations`
- `blueprints`, `feasibility_scores`, `data_readiness_assessments`, `integration_links`,
  `use_case_deliverables` → `ai_use_cases` → … (two hops from the tenant)

### Row counts

All tenant tables are empty; `module_events` holds 2 rows. **Backfill risk is
effectively zero at T=0** — this is the cheapest possible moment to lay the foundation.

---

## 2. Minimum foundation (additive tables only)

`organizations` remains the tenant. We do **not** introduce a parallel `tenants` table —
that would be a destructive conceptual rename of an in-use entity.

| New table              | Purpose                                                                  | Key columns                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `organization_members` | explicit tenant membership, replaces implicit `profiles.organization_id` | `organization_id`, `user_id`, `role`, `status`, `invited_by`, `joined_at`; `UNIQUE(organization_id, user_id)` |
| `workspace_members`    | per-workspace access inside a tenant                                     | `workspace_id`, `user_id`, `role`, `added_by`, `joined_at`; `UNIQUE(workspace_id, user_id)`                   |
| `organization_units`   | optional department/BU grouping                                          | `organization_id`, `parent_id`, `name`, `slug`                                                                |
| `plans`                | catalogue: `lite`, `pro_founding`, `enterprise`                          | `code`, `name`, `limits jsonb`                                                                                |
| `entitlements`         | ledger per organization                                                  | `organization_id`, `plan_code`, `source`, `granted_at`, `expires_at`, `revoked_at`, `notes`                   |

**Roles.** Platform-wide roles stay in `user_roles` (`has_role()` unchanged). Tenancy
roles live on the membership rows: `owner`, `admin`, `contributor`, `viewer`,
`facilitator`. Roles are never stored on `profiles`.

### New helper functions

All `SECURITY DEFINER`, `STABLE`, `SET search_path = public`:

- `is_org_member(_user_id uuid, _org_id uuid) → boolean`
- `org_role(_user_id uuid, _org_id uuid) → text`
- `is_workspace_member(_user_id uuid, _workspace_id uuid) → boolean`
- `workspace_role(_user_id uuid, _workspace_id uuid) → text`
- `workspace_org(_workspace_id uuid) → uuid`

`user_in_workspace(_user_id, _workspace_id)` keeps its **exact signature** and is
rewritten to consult `workspace_members`, falling back to the current
`workspaces.organization_id = user_org_id(_user_id)` rule during the compatibility
window. Because the signature is unchanged, every existing policy that calls it keeps
working with no policy edit.

---

## 3. Column mapping — all additive, all nullable first

Add **both** `organization_id uuid` and `workspace_id uuid` to:

**Direct tenant data**
`ai_use_cases`, `blueprints`, `feasibility_scores`, `data_readiness_assessments`,
`integration_links`, `use_case_deliverables`, `use_case_submissions`, `use_case_scores`,
`generated_reports`, `portfolios`, `collections`, `saved_use_cases`, `shortlists`.

**Already partly tenant-aware**
`use_case_boards` — add `organization_id` only (it already carries `workspace_id`).

**Analytics / event tables — nullable permanently**
`cta_events`, `module_events`, `use_case_views`, `use_case_downloads`,
`integration_events`, `audit_events`, `use_case_audit_log`. Anonymous events legitimately
have no tenant.

**No tenant columns (platform-owned catalogue)**
`use_cases`, `use_case_patterns`, `industries`, `countries`, `ai_capabilities`,
`business_functions`, `business_objectives`, `gov_functions`, `platform_modules`,
`taxonomy_*`, and the `use_case_*` join tables. `taxonomy_sectors.organization_id`
remains a _contribution attribution_ field, not a tenancy boundary.

Every existing `user_id` / `created_by` / `submitted_by` column is retained. Nothing is
renamed, nothing is dropped.

**Sync triggers.** Each child table gets a `BEFORE INSERT` trigger that derives
`workspace_id` / `organization_id` from its parent row when the client omits them.
No route, server function, or query has to change on day one.

**`SET NOT NULL`** is a _separate, later_ migration, executed only after the
verification query in §8 proves zero remaining nulls for that table.

---

## 4. Backfill — deterministic, loses nothing

Executed in this order; every statement is idempotent (`WHERE <col> IS NULL`) and safe
to re-run.

1. **organizations** — for every `profiles` row with `organization_id IS NULL`, create an
   organization named by the existing rule already used in `ensure_user_workspace()`:
   `COALESCE(NULLIF(profiles.organization,''), NULLIF(profiles.full_name,''), profiles.email, 'My Organization')`
   with `plan = 'lite'`; set `profiles.organization_id`.
2. **workspaces** — one `Default Workspace` per organization that has none,
   `created_by` = the org's first member.
3. **organization_members** — one row per `profiles(user_id, organization_id)` with
   `role = 'owner'`, `status = 'active'`, `joined_at = profiles.created_at`.
4. **workspace_members** — one row per (workspace × every member of its organization),
   mirroring the organization role.
5. **entitlements** — one row per organization derived from `profiles.entitlement_tier`
   (fallback `plan_type`), `expires_at = profiles.entitlement_expires_at`,
   `source = 'backfill_2026_08'`.
6. **Child tables with a parent** — `UPDATE … SET workspace_id = parent.workspace_id,
organization_id = ws.organization_id` walking the existing FK chain
   (`ai_use_cases` from `use_case_boards`; `blueprints` / `feasibility_scores` /
   `data_readiness_assessments` / `integration_links` / `use_case_deliverables` from
   `ai_use_cases`).
7. **User-owned tables with no parent** — `collections`, `portfolios`, `saved_use_cases`,
   `shortlists`, `generated_reports`, `use_case_scores`, `use_case_submissions`: fill
   from the `profiles` row of the owning `user_id`.
8. **Orphans** — rows whose owning user has no profile (deleted account) keep NULL
   tenancy, remain reachable by `service_role` only, and are listed in a reconciliation
   note appended to this file. **At T=0 there are zero such rows.**

Deterministic-owner guarantee: every existing row either has a parent chain that ends at
a workspace, or an owning `user_id` that maps to exactly one profile → organization →
default workspace. No record is left without a future owner.

---

## 5. Compatibility plan — zero route changes at cut-over

- Legacy columns and legacy policies stay in place.
- `user_in_workspace()` keeps its signature, so no existing policy needs editing.
- New columns are nullable and trigger-populated, so existing inserts from
  `src/lib/*.functions.ts` and direct client calls keep working untouched.
- Policies use dual predicates during the window:
  `membership OR legacy owner (user_id = auth.uid())`.
- A feature flag `tenancy_v2` in `src/lib/feature-flags.ts` gates any _new_ UI
  (workspace switcher, member management). **Off at launch.**
- Phase-out (post-launch, separate migration): drop the legacy `OR` clause,
  `SET NOT NULL`, remove the fallback branch in `user_in_workspace()`.

---

## 6. RLS design

Summarised here; the full policy-by-policy table is in
`docs/architecture/tenancy-rls-design.md`.

- Read: `USING (public.is_workspace_member(auth.uid(), workspace_id))`
  `OR user_id = auth.uid()` during the compatibility window.
- Write: `WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid())`.
  The ownership column is never trusted from the client for cross-user assignment; a
  `BEFORE INSERT` trigger forces `user_id = auth.uid()` where the app relies on it.
- Admin-scoped mutations: `public.org_role(auth.uid(), organization_id) IN ('owner','admin')`.
- Anon ingest tables: `WITH CHECK (user_id IS NULL OR user_id = auth.uid())` — this also
  closes finding **A1** (identity forgery) from `data-migration-plan.md`.
- Audit tables stay append-only: `SELECT` + `INSERT` policies only.
- Every new table: `CREATE TABLE` → `GRANT` → `ENABLE ROW LEVEL SECURITY` →
  `CREATE POLICY`, in that order, in the same migration. `anon` grants only on genuinely
  public tables — none of the new tables qualify.
- No policy queries its own table directly; all lookups go through the SECURITY DEFINER
  helpers, so there is no recursion.

Cross-workspace access is structurally impossible: membership is the only predicate, and
membership rows are themselves protected — `SELECT` limited to co-members, write limited
to organization owners/admins.

---

## 7. Migration sequencing and reversibility

| Step               | Content                                                                                                                           | Reversible by                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| T1                 | New tables (`organization_members`, `workspace_members`, `organization_units`, `plans`, `entitlements`) + grants + RLS + policies | `DROP TABLE` — no dependents yet                      |
| T2                 | Helper functions; rewrite `user_in_workspace()` body with fallback                                                                | `CREATE OR REPLACE` restoring the prior body from git |
| T3                 | Additive columns + indexes on `(workspace_id)` and `(organization_id)`                                                            | `DROP COLUMN` — additive and unused by the app        |
| T4                 | Backfill `UPDATE`s                                                                                                                | idempotent; reversal is a no-op (data is additive)    |
| T5                 | Sync triggers                                                                                                                     | `DROP TRIGGER`                                        |
| T6                 | Dual-predicate policy replacements                                                                                                | recreate the prior policy from git                    |
| T7 _(post-launch)_ | `SET NOT NULL`, drop legacy predicates, drop fallback branch                                                                      | `DROP NOT NULL`, recreate policies                    |

**No `DROP TABLE`, no `DROP COLUMN`, no rename, no ownership reassignment in T1–T6.**

Forward-fix preference: if T6 causes an access regression in production, the fix is to
re-add the legacy `OR user_id = auth.uid()` predicate (a widening, non-destructive
change) rather than to roll back the whole chain.

---

## 8. Verification

See `docs/architecture/tenancy-verification-queries.md`. Every step is gated on:

1. `bun run test:rls` green (extended with a cross-workspace member negative case).
2. Zero-null check for each column promoted in T7.
3. Consistency check: child `organization_id` equals the `organization_id` of its
   `workspace_id`.
4. Policy/grant coverage check for every new table.
5. Append-only proof for `audit_events` and `use_case_audit_log`.
6. `bun run build` green.

---

## 9. Open risks

| ID    | Risk                                                          | Mitigation                                                                                     |
| ----- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| TEN-1 | Rewriting `user_in_workspace()` affects many policies at once | Fallback branch preserves current behaviour; `test:rls` run before and after                   |
| TEN-2 | Membership tables invite recursive policies                   | Policies only call SECURITY DEFINER helpers, never the table directly                          |
| TEN-3 | `SET NOT NULL` feels irreversible                             | Deferred past launch, gated on a zero-null verification query, reversible with `DROP NOT NULL` |
| TEN-4 | Orphan rows (owner deleted)                                   | Zero at T=0; reconciliation note appended if any appear                                        |
| TEN-5 | Scope creep into workspace-switcher UI before launch          | `tenancy_v2` flag off; UI work is in the deferred register                                     |

---

## 10. Sign-off

| Step | Owner     | Reviewer      | Status                      |
| ---- | --------- | ------------- | --------------------------- |
| T1   | @db-owner | @security     | plan approved, not executed |
| T2   | @db-owner | @security     | plan approved, not executed |
| T3   | @db-owner | @architecture | plan approved, not executed |
| T4   | @db-owner | @architecture | plan approved, not executed |
| T5   | @db-owner | @architecture | plan approved, not executed |
| T6   | @security | @db-owner     | plan approved, not executed |
| T7   | @db-owner | @security     | deferred post-launch        |
