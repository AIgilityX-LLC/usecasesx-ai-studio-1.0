REVOKE EXECUTE ON FUNCTION public.portfolio_is_readable(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portfolio_is_writable(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.portfolio_is_readable(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portfolio_is_writable(uuid, uuid) TO authenticated, service_role;
