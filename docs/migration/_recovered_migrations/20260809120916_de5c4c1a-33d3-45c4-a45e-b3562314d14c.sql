CREATE OR REPLACE FUNCTION public.ensure_user_workspace(_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := _user_id;
  prof_org uuid;
  prof_name text;
  prof_email text;
  prof_company text;
  new_org uuid;
  ws uuid;
  created_org boolean := false;
  created_ws boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Missing user id';
  END IF;

  SELECT organization_id, full_name, email, organization
    INTO prof_org, prof_name, prof_email, prof_company
  FROM public.profiles WHERE user_id = uid LIMIT 1;

  IF prof_org IS NULL THEN
    INSERT INTO public.organizations(name, plan)
    VALUES (COALESCE(NULLIF(prof_company,''), NULLIF(prof_name,''), prof_email, 'My Organization'), 'lite')
    RETURNING id INTO new_org;
    created_org := true;

    INSERT INTO public.profiles(user_id, email, organization_id)
    VALUES (uid, prof_email, new_org)
    ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    prof_org := new_org;
  END IF;

  -- Deterministic: always the oldest workspace of the organization.
  SELECT id INTO ws
  FROM public.workspaces
  WHERE organization_id = prof_org
  ORDER BY created_at, id
  LIMIT 1;

  IF ws IS NULL THEN
    INSERT INTO public.workspaces(organization_id, name, created_by)
    VALUES (prof_org, 'Default Workspace', uid)
    RETURNING id INTO ws;
    created_ws := true;
  END IF;

  INSERT INTO public.organization_members(organization_id, user_id, role, status)
  VALUES (prof_org, uid, 'owner', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Guarantee membership of the workspace we are about to hand back, so
  -- workspace-scoped INSERT policies (workshops, boards, ...) always pass.
  INSERT INTO public.workspace_members(workspace_id, user_id, role)
  VALUES (ws, uid, COALESCE(public.org_role(uid, prof_org), 'owner'))
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  INSERT INTO public.entitlements(organization_id, plan_code, source)
  SELECT prof_org, 'lite', 'auto_provision'
  WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e WHERE e.organization_id = prof_org);

  IF created_org OR created_ws THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'workspace', ws, 'workspace.provisioned',
            jsonb_build_object('organization_id', prof_org, 'workspace_id', ws,
                               'created_org', created_org, 'created_workspace', created_ws));
  END IF;

  RETURN ws;
END;
$function$;

DELETE FROM public.workshops WHERE title LIKE 'probe %' OR title LIKE 'Invitation probe %' OR title = 'Redirect check';
