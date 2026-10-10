
-- Add owner-scoped SELECT policies so users can read their own history rows
CREATE POLICY "Users read own downloads"
  ON public.use_case_downloads
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users read own views"
  ON public.use_case_views
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Revoke EXECUTE from anon/authenticated on internal trigger functions
-- (these are only invoked by Postgres triggers, never by clients)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_sector_published() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_use_cases() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_use_case_boards() FROM anon, authenticated, PUBLIC;

-- Revoke EXECUTE from anon on internal helpers used only from server/RLS contexts;
-- keep EXECUTE for authenticated because these are referenced by RLS policies which
-- require the calling role to hold EXECUTE on the SECURITY DEFINER helper.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_org_id(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_owned(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_accessible(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_tier(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_editor_tier(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_pro_entitlement(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_user_workspace() FROM anon, PUBLIC;
