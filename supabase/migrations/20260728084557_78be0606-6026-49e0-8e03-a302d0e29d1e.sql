CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.ensure_user_workspace(auth.uid())
$function$;

REVOKE ALL ON FUNCTION public.ensure_user_workspace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO service_role;