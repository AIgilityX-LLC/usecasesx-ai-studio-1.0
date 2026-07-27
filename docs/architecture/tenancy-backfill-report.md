# Tenancy Backfill Report — T1–T6 executed 2026-07-27

Scope executed: steps **T1–T6** of `docs/architecture/tenancy-migration-plan.md`.
Step **T7** (`SET NOT NULL`, removal of the legacy `user_id = auth.uid()` compatibility
predicate) remains deferred, as approved.


## Migrations applied

1. **Tenancy foundation** — new tables `organization_members`, `workspace_members`,
   `organization_units`, `plans`, `entitlements` (grants → RLS → policies, in order);
   helper functions `is_org_member`, `org_role`, `is_workspace_member`, `workspace_role`,
   `workspace_org`; `user_in_workspace()` rewritten (signature unchanged) to check
   membership first with the legacy organization rule as compatibility fallback;
   additive nullable `organization_id` / `workspace_id` columns plus indexes;
   backfill; `BEFORE INSERT` sync triggers; `ensure_user_workspace()` extended to write
   owner membership + a default `lite` entitlement.
2. **Execution hardening** — `EXECUTE` revoked from `PUBLIC`/`anon` on the new helper
   functions and from all client roles on the internal sync trigger functions.

Nothing was dropped, renamed, or reassigned. All column additions are nullable.

## Backfill result (verified post-migration)

| Check | Count |
|---|---|
| `profiles` | 0 |
| `workspaces` | 0 |
| `organization_members` created | 0 |
| `workspace_members` created | 0 |
| `entitlements` created | 0 |
| `plans` seeded | 3 (`lite`, `pro_founding`, `enterprise`) |
| `ai_use_cases` with NULL `workspace_id` | 0 |
| `use_case_boards` with NULL `organization_id` | 0 |

The tenant tables were empty at T=0, so the backfill was a no-op on data and there are
**zero orphan rows**. Every future row is populated by the sync triggers at insert time,
and every new signed-in user is provisioned with an organization, a default workspace, an
owner membership on both, and a `lite` entitlement.

## Application changes

- `src/lib/workspace.functions.ts` — added `getWorkspaceContextFn`, the single server-side
  resolver for organization, workspace, membership role, and entitlement.
- `src/hooks/useWorkspaceContext.ts` — the one client-side workspace context hook. Routes
  must consume this instead of re-deriving ownership.
- `src/lib/feature-flags.ts` — `tenancyV2` flag, **off by default**; gates any new
  workspace-switcher / member-management UI. No UI ships in this step.

Existing routes and queries are untouched: legacy columns, legacy policies, and the
`user_in_workspace()` signature all remain, so no query had to migrate.

## Tests

- `tests/tenancy-isolation.e2e.ts` (new) — unauthenticated denial on all tenancy tables,
  public `plans` still readable, owner/admin roles membership-derived, cross-workspace
  membership reads and writes denied, entitlement self-grant denied.
- `tests/rls-isolation.e2e.ts` (existing) — unchanged, still the cross-tenant board /
  use case leak check.

Both require the seeded demo accounts and the service credentials; run with
`bun run test:rls` and `bun tests/tenancy-isolation.e2e.ts`.

## T6 — membership-scoped policy replacement (applied)

Dual-predicate policies now cover the user-owned tenant tables `collections`,
`portfolios`, `generated_reports`, `saved_use_cases`, `shortlists`, `use_case_scores`:

- **read** — `user_id = auth.uid() OR is_workspace_member(auth.uid(), workspace_id)`
- **insert/update** — `user_id = auth.uid() AND (workspace_id IS NULL OR is_workspace_member(...))`
- **delete** — owner, plus `org_role(auth.uid(), organization_id) IN ('owner','admin')` on
  `collections`, `portfolios`, `generated_reports`

`use_case_submissions` gained an additive workspace-member SELECT policy alongside its
existing own-row policy. Board / use case / blueprint / feasibility / deliverable tables
already route through `user_in_workspace()`, which became membership-first at T1, so no
policy edit was required there. Platform catalogue tables and anonymous ingest tables are
untouched — public Lite discovery is unchanged.

The `workspace_id IS NULL` allowance in the write predicates is the compatibility window:
the `BEFORE INSERT` sync triggers stamp tenancy, so it only covers rows whose parent has
no resolvable workspace. It is removed at T7 together with `SET NOT NULL`.



## Open risks

| ID | Risk | Mitigation |
|---|---|---|
| TEN-1 | `user_in_workspace()` body rewritten; many policies call it | Fallback branch preserves prior behaviour exactly; membership only widens |
| TEN-6 | Child tables have no FK to `ai_use_cases`, so sync triggers resolve by id lookup | Trigger leaves NULL when no parent matches; no insert fails |
| TEN-3 | `SET NOT NULL` still pending | Deferred to T7, gated on a zero-null verification query |

## Rollback / forward-fix

- Migration 2 (grants): re-`GRANT EXECUTE` to restore prior execution rights.
- Migration 1: reversible in the T1–T5 order of the plan — `DROP TRIGGER`,
  `DROP COLUMN` (additive and unused by the app), `CREATE OR REPLACE` the prior
  `user_in_workspace()` / `ensure_user_workspace()` bodies from git, `DROP TABLE` the five
  new tables (no dependents).
- Preferred forward-fix for any access regression: widen, don't roll back — restore the
  legacy `OR user_id = auth.uid()` predicate rather than unwinding the chain.
