-- 1. Internal trigger routines must never be directly callable by API roles.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 2. Privileged / mutating routines: signed-in only (never anon, never PUBLIC default).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'accept_workshop_invitation',
        'accept_workspace_invitation',
        'ensure_user_workspace',
        'publish_use_case_submission',
        'workspace_member_directory',
        'workspace_display_names',
        'is_demo_activity'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

-- 3. Public rating aggregates: readable through the Data API instead of admin-only.
GRANT SELECT ON public.use_case_rating_aggregates TO anon, authenticated;
GRANT ALL ON public.use_case_rating_aggregates TO service_role;