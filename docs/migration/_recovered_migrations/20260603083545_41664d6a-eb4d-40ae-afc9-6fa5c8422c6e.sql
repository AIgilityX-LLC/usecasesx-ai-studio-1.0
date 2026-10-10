REVOKE EXECUTE ON FUNCTION public.user_org_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_org_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) TO authenticated, service_role;
