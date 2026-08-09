REVOKE EXECUTE ON FUNCTION public.workshop_is_facilitator(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.workshop_is_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workshop_is_facilitator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workshop_is_member(uuid, uuid) TO authenticated, service_role;