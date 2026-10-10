REVOKE EXECUTE ON FUNCTION public.is_demo_activity(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_activity(uuid, uuid, uuid) TO authenticated, service_role;
