# Verification queries (read-only)

Run any of these via `psql` or `supabase--read_query` any time to re-verify
posture. All are `SELECT`-only.

## 1. Every public table has RLS + ≥1 policy

```sql
SELECT c.relname, c.relrowsecurity,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND (NOT c.relrowsecurity
       OR (SELECT count(*) FROM pg_policies p
             WHERE p.schemaname='public' AND p.tablename=c.relname) = 0);
-- Expect: 0 rows.
```

## 2. Anon-INSERT policies must gate `user_id`

```sql
SELECT tablename, policyname, with_check
FROM pg_policies
WHERE schemaname='public'
  AND 'anon' = ANY(roles)
  AND cmd='INSERT'
ORDER BY tablename, policyname;
-- Every row's with_check should either omit user_id or contain
-- (user_id IS NULL OR user_id = auth.uid()).
```

## 3. Ownership columns without FK to `auth.users`

```sql
SELECT c.table_name, c.column_name
FROM information_schema.columns c
WHERE c.table_schema='public'
  AND c.column_name IN ('user_id','created_by','owner_id')
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint k
    WHERE k.contype='f'
      AND k.conrelid = ('public.'||c.table_name)::regclass
      AND k.confrelid = 'auth.users'::regclass
  )
ORDER BY c.table_name;
```

## 4. Audit tables are append-only

```sql
SELECT tablename, cmd, count(*)
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('audit_events','use_case_audit_log')
GROUP BY 1, 2
ORDER BY 1, 2;
-- Expect: only SELECT and INSERT.
```

## 5. Ownership columns that policies assume are NOT NULL but aren't

```sql
SELECT c.table_name, c.column_name, c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema='public'
  AND c.column_name IN ('user_id','created_by','organization_id','workspace_id')
  AND c.is_nullable='YES'
ORDER BY c.table_name;
-- Review each: intentional (event/log tables) vs oversight.
```

## 6. Row counts on tenant tables (should be 0 at T=0)

```sql
SELECT 'workspaces' t, count(*) FROM workspaces UNION ALL
SELECT 'organizations',       count(*) FROM organizations UNION ALL
SELECT 'profiles',             count(*) FROM profiles UNION ALL
SELECT 'user_roles',           count(*) FROM user_roles UNION ALL
SELECT 'use_case_boards',      count(*) FROM use_case_boards UNION ALL
SELECT 'ai_use_cases',         count(*) FROM ai_use_cases UNION ALL
SELECT 'use_cases',            count(*) FROM use_cases UNION ALL
SELECT 'use_case_submissions', count(*) FROM use_case_submissions UNION ALL
SELECT 'portfolios',           count(*) FROM portfolios UNION ALL
SELECT 'saved_use_cases',      count(*) FROM saved_use_cases;
```

## 7. SECURITY DEFINER routines have `search_path` set

```sql
SELECT p.proname,
       p.prosecdef AS security_definer,
       coalesce(array_to_string(p.proconfig, ','), '') AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
ORDER BY p.proname;
-- Every row's config should contain 'search_path=public'.
```

## 8. Orphaned rows after FK migration (only meaningful once A2 runs)

```sql
-- Example for ai_use_cases.created_by
SELECT a.id, a.created_by
FROM public.ai_use_cases a
LEFT JOIN auth.users u ON u.id = a.created_by
WHERE u.id IS NULL;
-- Expect: 0 rows.
```
