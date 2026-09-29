# V2-04 — Backfill & validation report

**Date:** 2026-09-23  
**Migration:** `supabase/migrations/20260923120000_v2_04_versioned_core_model.sql`  
**Phase:** ADD + BACKFILL (nullable). **ENFORCE** (NOT NULL) is blocked until these queries are clean.

---

## Validation queries (run after applying migration)

```sql
-- 1. Orphan / tenancy integrity on new version table
SELECT count(*) AS opp_versions_missing_workspace
FROM public.opportunity_versions WHERE workspace_id IS NULL;

SELECT count(*) AS uc_versions_missing_workspace
FROM public.use_case_versions WHERE workspace_id IS NULL;

-- 2. Workspace/org mismatch (should be 0 after trigger + backfill)
SELECT count(*) AS uc_tenant_mismatch
FROM public.ai_use_cases u
JOIN public.workspaces w ON w.id = u.workspace_id
WHERE u.organization_id IS NOT NULL
  AND u.organization_id <> w.organization_id;

-- 3. Unmapped lifecycle statuses (domain status present, lifecycle NULL)
SELECT 'ai_use_cases' AS src, status, count(*)
FROM public.ai_use_cases
WHERE lifecycle_status IS NULL AND deleted_at IS NULL
GROUP BY status
UNION ALL
SELECT 'opportunities', status::text, count(*)
FROM public.opportunities
WHERE lifecycle_status IS NULL AND deleted_at IS NULL
GROUP BY status;

-- 4. Version kind coverage
SELECT kind, count(*) FROM public.use_case_versions GROUP BY kind;
SELECT kind, count(*) FROM public.opportunity_versions GROUP BY kind;

-- 5. Parents without current_version_id but with versions
SELECT count(*) FROM public.ai_use_cases u
WHERE u.current_version_id IS NULL
  AND EXISTS (SELECT 1 FROM public.use_case_versions v WHERE v.use_case_id = u.id);
```

Record counts in this file after the first production-like apply.

---

## First-apply results

| Check | Result | Notes |
|-------|--------|-------|
| Migration applied | **Yes** — operator applied via SQL Editor on `mclidfbrstkoivzjqitf` (2026-09-23) | |
| Opp versions missing workspace | — | Run query 1a |
| UC versions missing workspace | — | Run query 1b |
| Tenant mismatches | — | Run query 2 (expect 0) |
| Unmapped lifecycle rows | — | Run query 3; leave NULL if any |
| Version kind coverage | — | Run query 4 |
| Parents missing `current_version_id` but with versions | **0** | Query 5 confirmed in SQL Editor |
| RLS denial test | Pending | Needs demo/test accounts on this project |

---

## Unmapped domain statuses (from V2-03; still not coerced)

See [`lifecycle-status-map.md`](./lifecycle-status-map.md). Any row left with `lifecycle_status IS NULL` after backfill must be classified before NOT NULL enforcement.

---

## Rollback / forward-fix

- **App rollback:** deploy prior git tag; leave additive columns/tables.  
- **Bad backfill:** corrective UPDATE migration; do not DROP.  
- **Incomplete Canvas UI:** sections table unused until V2-07; safe.
