-- Single-result diagnosis + fix for user_roles 403 / 42501
-- Run all of this. Paste the ONE result table back.

-- Fix first
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

-- Enum USAGE (required to SELECT/filter role column) — grant each public enum
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype = 'e'
  LOOP
    EXECUTE format(
      'GRANT USAGE ON TYPE %I.%I TO anon, authenticated, service_role',
      r.nspname,
      r.typname
    );
  END LOOP;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Then one combined report
WITH grants AS (
  SELECT 'table_grant'::text AS kind,
         grantee::text AS name,
         privilege_type::text AS detail
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name = 'user_roles'
),
owner AS (
  SELECT 'table_owner'::text,
         tableowner::text,
         ''::text
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_roles'
),
who AS (
  SELECT 'session'::text, current_user::text, session_user::text
),
enum_privs AS (
  SELECT 'enum_acl'::text,
         COALESCE(r.rolname, 'PUBLIC')::text,
         g.privilege_type::text
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  LEFT JOIN LATERAL aclexplode(COALESCE(t.typacl, acldefault('T'::"char", t.typowner))) g ON true
  LEFT JOIN pg_roles r ON r.oid = g.grantee
  WHERE n.nspname = 'public' AND t.typname = 'app_role'
),
roles AS (
  SELECT 'user_role_row'::text,
         role::text,
         user_id::text
  FROM public.user_roles
  WHERE user_id = '36759c81-203c-4e8f-8e28-3603a5431175'
)
SELECT * FROM who
UNION ALL SELECT * FROM owner
UNION ALL SELECT * FROM grants
UNION ALL SELECT * FROM enum_privs
UNION ALL SELECT * FROM roles
ORDER BY 1, 2, 3;
