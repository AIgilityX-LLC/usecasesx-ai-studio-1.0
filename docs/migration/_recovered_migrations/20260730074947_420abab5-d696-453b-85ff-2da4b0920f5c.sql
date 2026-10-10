REVOKE ALL ON FUNCTION public.sync_opportunity_org() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_opportunity_org() TO service_role;
