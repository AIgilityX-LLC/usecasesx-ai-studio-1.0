REVOKE SELECT, INSERT, UPDATE, DELETE ON public.workspace_ai_engines FROM authenticated;
DROP POLICY IF EXISTS "Workspace managers read their engine keys" ON public.workspace_ai_engines;
DROP POLICY IF EXISTS "Workspace managers add engine keys" ON public.workspace_ai_engines;
DROP POLICY IF EXISTS "Workspace managers update engine keys" ON public.workspace_ai_engines;
DROP POLICY IF EXISTS "Workspace managers delete engine keys" ON public.workspace_ai_engines;
