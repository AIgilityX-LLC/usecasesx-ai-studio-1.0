REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workspace_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workspace_org(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_tenancy_from_board() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_tenancy_from_ai_use_case() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_tenancy_from_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_board_org() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_org(uuid) TO authenticated, service_role;