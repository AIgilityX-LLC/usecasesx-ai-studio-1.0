
-- 1) Pro entitlement helper + tightened "Authenticated reads pro" policy on use_cases
CREATE OR REPLACE FUNCTION public.has_pro_entitlement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (
        p.entitlement_tier IN ('pro','enterprise')
        OR p.plan_type IN ('pro','enterprise')
      )
      AND (p.entitlement_expires_at IS NULL OR p.entitlement_expires_at > now())
  ) OR public.is_admin_tier(_user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.has_pro_entitlement(uuid) FROM anon, authenticated, PUBLIC;

DROP POLICY IF EXISTS "Authenticated reads pro" ON public.use_cases;
CREATE POLICY "Entitled reads pro" ON public.use_cases
  FOR SELECT TO authenticated
  USING (
    status = 'published'::use_case_status
    AND visibility = 'pro'::use_case_visibility
    AND public.has_pro_entitlement(auth.uid())
  );

-- 2) Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/authenticated/PUBLIC.
--    These are only used inside RLS/other DB functions; RLS still evaluates them
--    correctly because policy expressions run with table-owner privileges.
REVOKE EXECUTE ON FUNCTION public.user_org_id(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_owned(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_accessible(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_tier(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_editor_tier(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_use_case_boards() FROM anon, authenticated, PUBLIC;
-- Client-callable RPCs kept executable: ensure_user_workspace, get_use_case_integration_package
-- Re-grant to make intent explicit.
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_use_case_integration_package(uuid) TO anon, authenticated;

-- 3) Replace always-true INSERT policies on telemetry tables with owner-scoped checks.
DROP POLICY IF EXISTS "Anyone log download" ON public.use_case_downloads;
CREATE POLICY "Log own download" ON public.use_case_downloads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Anyone log integration event" ON public.integration_events;
CREATE POLICY "Log own integration event" ON public.integration_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone log view" ON public.use_case_views;
CREATE POLICY "Log own view" ON public.use_case_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR user_id = auth.uid()
  );
