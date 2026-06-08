
-- Audit trigger for use_case_boards (insert/delete)
CREATE OR REPLACE FUNCTION public.audit_use_case_boards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    RAISE NOTICE '[audit] use_case_boards INSERT board=% workspace=% user=%', NEW.id, NEW.workspace_id, uid;
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'use_case_board', NEW.id, 'board.created',
            jsonb_build_object('title', NEW.title, 'workspace_id', NEW.workspace_id, 'board_type', NEW.board_type));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE NOTICE '[audit] use_case_boards DELETE board=% workspace=% user=%', OLD.id, OLD.workspace_id, uid;
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'use_case_board', OLD.id, 'board.deleted',
            jsonb_build_object('title', OLD.title, 'workspace_id', OLD.workspace_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_use_case_boards_ins ON public.use_case_boards;
CREATE TRIGGER trg_audit_use_case_boards_ins
AFTER INSERT ON public.use_case_boards
FOR EACH ROW EXECUTE FUNCTION public.audit_use_case_boards();

DROP TRIGGER IF EXISTS trg_audit_use_case_boards_del ON public.use_case_boards;
CREATE TRIGGER trg_audit_use_case_boards_del
AFTER DELETE ON public.use_case_boards
FOR EACH ROW EXECUTE FUNCTION public.audit_use_case_boards();

-- Add structured logging + audit to ensure_user_workspace
CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
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
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RAISE NOTICE '[ensure_user_workspace] start user=%', uid;

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
    RAISE NOTICE '[ensure_user_workspace] created org=% for user=%', new_org, uid;
  END IF;

  SELECT id INTO ws FROM public.workspaces WHERE organization_id = prof_org LIMIT 1;
  IF ws IS NULL THEN
    INSERT INTO public.workspaces(organization_id, name, created_by)
    VALUES (prof_org, 'Default Workspace', uid)
    RETURNING id INTO ws;
    created_ws := true;
    RAISE NOTICE '[ensure_user_workspace] created workspace=% in org=%', ws, prof_org;
  END IF;

  IF created_org OR created_ws THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'workspace', ws, 'workspace.provisioned',
            jsonb_build_object('organization_id', prof_org, 'workspace_id', ws,
                               'created_org', created_org, 'created_workspace', created_ws));
  END IF;

  RAISE NOTICE '[ensure_user_workspace] ok user=% org=% workspace=%', uid, prof_org, ws;
  RETURN ws;
END;
$$;
