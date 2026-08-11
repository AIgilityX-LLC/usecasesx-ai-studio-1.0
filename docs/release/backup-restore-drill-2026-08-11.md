# Backup restore test — recovery environment drill (11 August 2026)

Scope: release candidate `v1.0.0-rc.1`, marker `release/2026-08-14`.
Live view: **Administration → Production Readiness → Recovery status**.
Machine evidence: `docs/release/restore-drill.json`.
Reproduce: `PGBIN=<postgres/bin> node scripts/ops/restore-drill.mjs --owner "<name and channel>"`.

## 1. What can and cannot be tested

Snapshot and point-in-time restore are operated by the managed platform; the product team cannot
trigger one. The recoverable path the team *does* own is the documented rebuild: an empty cluster,
the platform-managed prerequisites, the ordered additive migration set, then the launch-corpus
reference-data script. This drill performs exactly that, in an isolated throwaway cluster, and
measures it.

## 2. Procedure performed

| Step | Result | Time |
| ---- | ------ | ---- |
| Provision an empty recovery cluster (PostgreSQL 17.9, isolated data directory, no network exposure) | Pass | 1.71 s |
| Recreate platform-managed prerequisites — roles (`anon`, `authenticated`, `service_role`), `auth`/`storage` schemas, `auth.uid()`, `storage.foldername()` | Pass | 0.04 s |
| Replay the 15 ordered migrations | Pass (partial coverage) | 0.36 s |
| Verify recovered schema — tables, row-level security on every table, policies, functions | Pass | 0.08 s |
| Verify the recovered database accepts writes | Pass | 0.04 s |

**Measured restore time: 2.33 s** from empty cluster to a verified, writable schema. Reference data
is not included in that figure; the launch-corpus script is the reference-data rebuild step and runs
separately.

## 3. Finding — the migration set is not a standalone rebuild path

Replay recovered 4 tables with row-level security enabled on all of them and 46 functions, but 8
objects referenced by the migration set exist only inside the managed snapshot, so migrations that
depend on them cannot apply into an empty cluster:

`public.opportunities`, `public.product_feedback`, `public.use_case_feedback`,
`public.use_case_rating_aggregates`, `public.use_case_submissions`, `public.v_feedback_queue`,
`public.workshop_items`, `public.workshops`.

Consequence: a real recovery **must** come from a platform restore. Rebuild-from-migrations is a
partial fallback only.

Forward fix (post-launch, additive): capture a baseline schema migration for those objects so the
ordered set stands alone, then re-run the drill until it reports `pass` with zero gaps.

## 4. Ownership

| Role | Owner |
| ---- | ----- |
| Drill owner / recovery decision | AIgilityX platform owner — support@usecasesx.ai |
| Real restore execution | Managed platform support (Lovable Cloud support request) |
| Post-restore verification | AIgilityX platform owner, using this drill's verification steps |

## 5. Evidence freshness

A drill older than 90 days stops counting as evidence: the readiness probe reports the recovery
status as not measured and the Recovery status card flags it. Re-run the script before each release.
