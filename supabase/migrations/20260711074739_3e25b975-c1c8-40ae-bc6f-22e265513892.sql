
-- Drop legacy zero-arg signature (client-callable). Replaced by a
-- server-only variant that takes the user id explicitly.
DROP FUNCTION IF EXISTS public.ensure_user_workspace();

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

  SELECT id INTO ws FROM public.workspaces WHERE organization_id = prof_org LIMIT 1;
  IF ws IS NULL THEN
    INSERT INTO public.workspaces(organization_id, name, created_by)
    VALUES (prof_org, 'Default Workspace', uid)
    RETURNING id INTO ws;
    created_ws := true;
  END IF;

  IF created_org OR created_ws THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'workspace', ws, 'workspace.provisioned',
            jsonb_build_object('organization_id', prof_org, 'workspace_id', ws,
                               'created_org', created_org, 'created_workspace', created_ws));
  END IF;

  RETURN ws;
END;
$function$;

-- Lock down execute: only service_role (server-side) may call.
REVOKE ALL ON FUNCTION public.ensure_user_workspace(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace(uuid) TO service_role;

-- Same for the integration package RPC — not used by the client.
REVOKE ALL ON FUNCTION public.get_use_case_integration_package(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_use_case_integration_package(uuid) TO service_role;
