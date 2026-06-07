
-- 1. Editor tier helper (matches permission matrix)
CREATE OR REPLACE FUNCTION public.is_editor_tier(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'super_admin'::public.app_role)
    OR public.has_role(_user_id, 'ai_hub_admin'::public.app_role)
    OR public.has_role(_user_id, 'usecasex_admin'::public.app_role)
    OR public.has_role(_user_id, 'editor'::public.app_role)
    OR public.has_role(_user_id, 'moderator'::public.app_role)
    OR public.has_role(_user_id, 'content_manager'::public.app_role)
    OR public.has_role(_user_id, 'reviewer'::public.app_role)
    OR public.has_role(_user_id, 'contributor'::public.app_role)
$$;

-- 2. Tighten use_case_boards UPDATE/DELETE to editor tier OR board creator
DROP POLICY IF EXISTS "Workspace members update boards" ON public.use_case_boards;
DROP POLICY IF EXISTS "Workspace members delete boards" ON public.use_case_boards;

CREATE POLICY "Editors or creators update boards"
ON public.use_case_boards FOR UPDATE TO authenticated
USING (
  user_in_workspace(auth.uid(), workspace_id)
  AND (public.is_editor_tier(auth.uid()) OR created_by = auth.uid())
)
WITH CHECK (
  user_in_workspace(auth.uid(), workspace_id)
  AND (public.is_editor_tier(auth.uid()) OR created_by = auth.uid())
);

CREATE POLICY "Editors or creators delete boards"
ON public.use_case_boards FOR DELETE TO authenticated
USING (
  user_in_workspace(auth.uid(), workspace_id)
  AND (public.is_editor_tier(auth.uid()) OR created_by = auth.uid())
);

-- 3. Security-definer helper to provision the user's org + workspace.
--    Lets standard users create boards without needing INSERT on organizations.
CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prof_org uuid;
  prof_name text;
  prof_email text;
  prof_company text;
  new_org uuid;
  ws uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id, full_name, email, organization
    INTO prof_org, prof_name, prof_email, prof_company
  FROM public.profiles WHERE user_id = uid LIMIT 1;

  IF prof_org IS NULL THEN
    INSERT INTO public.organizations(name, plan)
    VALUES (COALESCE(NULLIF(prof_company,''), NULLIF(prof_name,''), prof_email, 'My Organization'), 'lite')
    RETURNING id INTO new_org;

    -- Upsert profile row (handle missing profile too).
    INSERT INTO public.profiles(user_id, email, organization_id)
    VALUES (uid, prof_email, new_org)
    ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    prof_org := new_org;
  END IF;

  SELECT id INTO ws FROM public.workspaces WHERE organization_id = prof_org LIMIT 1;
  IF ws IS NULL THEN
    INSERT INTO public.workspaces(organization_id, name, created_by)
    VALUES (prof_org, 'Default Workspace', uid)
    RETURNING id INTO ws;
  END IF;

  RETURN ws;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;
