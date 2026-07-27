# Tenancy Verification Queries (read-only)

Companion to `docs/architecture/tenancy-migration-plan.md`. Every query below is
**read-only**. Run via the database read tool; append the results to the migration PR.

---

## 1. Membership completeness

Every profile must map to exactly one active organization membership.

```sql
SELECT p.user_id, p.email
FROM public.profiles p
LEFT JOIN public.organization_members m
  ON m.user_id = p.user_id AND m.status = 'active'
WHERE m.user_id IS NULL;
-- Expect: 0 rows
```

Every organization member must also be a member of at least one workspace in that org.

```sql
SELECT m.user_id, m.organization_id
FROM public.organization_members m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = m.user_id AND w.organization_id = m.organization_id
);
-- Expect: 0 rows
```

No workspace member may belong to a workspace outside their organization.

```sql
SELECT wm.user_id, wm.workspace_id
FROM public.workspace_members wm
JOIN public.workspaces w ON w.id = wm.workspace_id
LEFT JOIN public.organization_members om
  ON om.user_id = wm.user_id AND om.organization_id = w.organization_id
WHERE om.user_id IS NULL;
-- Expect: 0 rows
```

---

## 2. Backfill coverage (per table)

Run for each table that received tenancy columns in T3.

```sql
SELECT 'ai_use_cases' AS t,
       count(*) FILTER (WHERE workspace_id IS NULL)    AS null_ws,
       count(*) FILTER (WHERE organization_id IS NULL) AS null_org,
       count(*)                                        AS total
FROM public.ai_use_cases
UNION ALL SELECT 'blueprints', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.blueprints
UNION ALL SELECT 'feasibility_scores', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.feasibility_scores
UNION ALL SELECT 'data_readiness_assessments', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.data_readiness_assessments
UNION ALL SELECT 'integration_links', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.integration_links
UNION ALL SELECT 'use_case_deliverables', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.use_case_deliverables
UNION ALL SELECT 'use_case_submissions', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.use_case_submissions
UNION ALL SELECT 'use_case_scores', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.use_case_scores
UNION ALL SELECT 'generated_reports', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.generated_reports
UNION ALL SELECT 'portfolios', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.portfolios
UNION ALL SELECT 'collections', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.collections
UNION ALL SELECT 'saved_use_cases', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.saved_use_cases
UNION ALL SELECT 'shortlists', count(*) FILTER (WHERE workspace_id IS NULL), count(*) FILTER (WHERE organization_id IS NULL), count(*) FROM public.shortlists;
-- Gate for T7 (SET NOT NULL): null_ws = 0 AND null_org = 0 for the table being promoted.
```

---

## 3. Tenancy consistency

A row's `organization_id` must equal the organization of its `workspace_id`.

```sql
SELECT 'ai_use_cases' AS t, count(*) AS mismatched
FROM public.ai_use_cases c
JOIN public.workspaces w ON w.id = c.workspace_id
WHERE c.organization_id IS DISTINCT FROM w.organization_id;
-- Repeat per table. Expect: 0
```

A child row's workspace must match its parent's workspace.

```sql
SELECT count(*) AS orphaned_children
FROM public.ai_use_cases uc
JOIN public.use_case_boards b ON b.id = uc.board_id
WHERE uc.workspace_id IS DISTINCT FROM b.workspace_id;
-- Expect: 0
```

---

## 4. Orphan detection (rows with no derivable owner)

```sql
SELECT 'collections' AS t, count(*) AS orphans
FROM public.collections c
LEFT JOIN public.profiles p ON p.user_id = c.user_id
WHERE p.user_id IS NULL
UNION ALL
SELECT 'portfolios', count(*) FROM public.portfolios c
LEFT JOIN public.profiles p ON p.user_id = c.user_id WHERE p.user_id IS NULL
UNION ALL
SELECT 'generated_reports', count(*) FROM public.generated_reports c
LEFT JOIN public.profiles p ON p.user_id = c.user_id WHERE p.user_id IS NULL;
-- Expect: 0. Any non-zero result must be listed in the reconciliation note
-- appended to tenancy-migration-plan.md §4.8 before T7.
```

---

## 5. RLS and grant coverage

Every public table has RLS enabled:

```sql
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
-- Expect: 0 rows
```

Every new table has at least one policy:

```sql
SELECT t.tablename, count(p.policyname) AS policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN ('organization_members','workspace_members','organization_units','plans','entitlements')
GROUP BY 1 ORDER BY 1;
-- Expect: every row policies > 0
```

Grants exist for the new tables:

```sql
SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('organization_members','workspace_members','organization_units','plans','entitlements')
  AND grantee IN ('anon','authenticated','service_role')
GROUP BY 1,2 ORDER BY 1,2;
-- Expect: authenticated + service_role on all five; anon SELECT only on plans.
```

---

## 6. Append-only proof

```sql
SELECT tablename, cmd, count(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('audit_events','use_case_audit_log')
GROUP BY 1,2 ORDER BY 1,2;
-- Expect: only SELECT and INSERT rows. No UPDATE, no DELETE.
```

```sql
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('audit_events','use_case_audit_log')
  AND grantee IN ('anon','authenticated')
  AND privilege_type IN ('UPDATE','DELETE');
-- Expect: 0 rows
```

---

## 7. Anon-insert identity forgery guard

```sql
SELECT tablename, policyname, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'INSERT'
  AND tablename IN ('cta_events','module_events','use_case_downloads','use_case_views','integration_events','lead_captures');
-- Expect: every with_check contains "user_id IS NULL OR user_id = auth.uid()"
```

---

## 8. Helper function hygiene

```sql
SELECT p.proname, p.prosecdef, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_org_member','org_role','is_workspace_member','workspace_role','workspace_org','user_in_workspace');
-- Expect: prosecdef = true and proconfig contains search_path=public for all six.
```

---

## 9. Test suites gating each step

| Step | Required green |
|---|---|
| T1 | §5 queries, `bun run build` |
| T2 | §8 queries, `bun run test:rls` |
| T3 | §5 queries, `bun run build` |
| T4 | §1–§4 queries |
| T5 | §3 queries after a fresh insert through the app |
| T6 | `bun run test:rls` (extended negative cases), §6, §7 |
| T7 | §2 zero-null gate for the promoted table, `bun run test:rls` |
