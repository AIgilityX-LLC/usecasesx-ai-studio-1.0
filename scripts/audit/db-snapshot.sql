-- =============================================================================
-- UseCasesX pre-refactor DB snapshot (READ-ONLY)
-- =============================================================================
-- Run this in the Supabase SQL editor (or any Postgres client) against the LIVE
-- database. Do NOT run against a local guess from types.ts / migrations.
--
-- How to use:
--   1. Open Supabase Dashboard → SQL → New query
--   2. Paste and run ONE section at a time (or the whole file)
--   3. Export each result set as CSV into docs/refactor/db-snapshot/
--      Suggested filenames:
--        01-tables-columns.csv
--        02-constraints.csv
--        03-rls-policies.csv
--        04-rls-disabled.csv
--        05-functions.csv
--        06-triggers.csv
--        07-views.csv
--        08-grants-tables.csv
--        09-grants-columns.csv
--        10-storage-buckets.csv
--        11-storage-policies.csv
--        12-row-counts.csv
--
-- Safety: every statement is SELECT / read-only catalog introspection.
-- No INSERT, UPDATE, DELETE, DDL, or SECURITY DEFINER writes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 01. Every public table, column, type, default, NOT NULL
-- -----------------------------------------------------------------------------
SELECT
  c.relname AS table_name,
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NOT NULL' ELSE 'NULL' END AS nullability,
  pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
  a.attnum AS ordinal_position
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;

-- -----------------------------------------------------------------------------
-- 02. Every constraint (PK, FK, UNIQUE, CHECK)
-- -----------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'x' THEN 'EXCLUDE'
    ELSE con.contype::text
  END AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, con.contype, con.conname;

-- -----------------------------------------------------------------------------
-- 03. Every RLS policy with qual and with_check
-- -----------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- -----------------------------------------------------------------------------
-- 04. Every public base table with RLS disabled
-- -----------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- -----------------------------------------------------------------------------
-- 05. Every function in public (and common extensions used by app)
-- -----------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
  l.lanname AS language,
  pg_get_function_result(p.oid) AS result_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname IN ('public')
ORDER BY p.proname, 3;

-- -----------------------------------------------------------------------------
-- 06. Every trigger on public tables
-- -----------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  t.tgname AS trigger_name,
  CASE WHEN t.tgenabled = 'D' THEN 'DISABLED' ELSE 'ENABLED' END AS status,
  pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- -----------------------------------------------------------------------------
-- 07. Every view in public
-- -----------------------------------------------------------------------------
SELECT
  n.nspname AS schema_name,
  c.relname AS view_name,
  CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized_view' ELSE c.relkind::text END AS kind,
  pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('v', 'm')
ORDER BY c.relname;

-- -----------------------------------------------------------------------------
-- 08. Table grants for anon and authenticated
-- -----------------------------------------------------------------------------
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- -----------------------------------------------------------------------------
-- 09. Column grants for anon and authenticated
-- -----------------------------------------------------------------------------
SELECT
  table_schema,
  table_name,
  column_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_column_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY table_name, column_name, grantee, privilege_type;

-- -----------------------------------------------------------------------------
-- 10. Storage buckets
-- -----------------------------------------------------------------------------
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- -----------------------------------------------------------------------------
-- 11. Storage policies (bucket RLS)
-- -----------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- -----------------------------------------------------------------------------
-- 12. Row counts per public table
-- -----------------------------------------------------------------------------
-- Dynamic: builds one UNION ALL of count(*) per table. Safe / read-only.
DO $$
DECLARE
  r record;
  sql text := '';
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    IF sql <> '' THEN
      sql := sql || ' UNION ALL ';
    END IF;
    sql := sql || format(
      'SELECT %L::text AS table_name, count(*)::bigint AS row_count FROM public.%I',
      r.table_name,
      r.table_name
    );
  END LOOP;

  IF sql = '' THEN
    RAISE NOTICE 'No public tables found';
    RETURN;
  END IF;

  -- Materialize into a temp table so the editor can SELECT it after the DO block.
  EXECUTE 'DROP TABLE IF EXISTS _audit_row_counts';
  EXECUTE 'CREATE TEMP TABLE _audit_row_counts AS ' || sql || ' ORDER BY 1';
END $$;

SELECT * FROM _audit_row_counts ORDER BY table_name;

-- Optional cleanup (comment out if you want to re-query the temp table):
-- DROP TABLE IF EXISTS _audit_row_counts;
