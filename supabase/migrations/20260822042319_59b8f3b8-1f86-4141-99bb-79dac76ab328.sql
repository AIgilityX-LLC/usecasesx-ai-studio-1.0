REVOKE ALL ON FUNCTION public.prevent_profile_org_self_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_org_self_change() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_profile_org_self_change() FROM authenticated;