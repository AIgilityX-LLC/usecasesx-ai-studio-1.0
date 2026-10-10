-- ---------------------------------------------------------------- helpers
CREATE OR REPLACE FUNCTION public.workspace_can_edit(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_in_workspace(_user_id, _workspace_id)
     AND COALESCE(
           public.workspace_role(_user_id, _workspace_id),
           public.org_role(_user_id, public.workspace_org(_workspace_id)),
           ''
         ) IN ('owner','admin','manager','contributor','editor','member','facilitator','workshop_facilitator','org_owner','workspace_owner','workspace_admin')
$$;

CREATE OR REPLACE FUNCTION public.workspace_can_manage(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_in_workspace(_user_id, _workspace_id)
     AND COALESCE(
           public.workspace_role(_user_id, _workspace_id),
           public.org_role(_user_id, public.workspace_org(_workspace_id)),
           ''
         ) IN ('owner','admin','manager','org_owner','workspace_owner','workspace_admin')
$$;

-- Resolve the owning workspace of a collaboration target.
CREATE OR REPLACE FUNCTION public.collab_entity_workspace(_entity_type text, _entity_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  IF _entity_type = 'opportunity' THEN
    SELECT workspace_id INTO ws FROM public.opportunities WHERE id = _entity_id;
  ELSIF _entity_type = 'use_case' THEN
    SELECT workspace_id INTO ws FROM public.ai_use_cases WHERE id = _entity_id;
  ELSIF _entity_type = 'portfolio' THEN
    SELECT workspace_id INTO ws FROM public.portfolios WHERE id = _entity_id;
  END IF;
  RETURN ws;
END;
$$;

-- ------------------------------------------------------- invitations table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid,
  email text,
  role text NOT NULL DEFAULT 'contributor'
    CHECK (role IN ('admin','contributor','facilitator','viewer')),
  token text NOT NULL UNIQUE,
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 50),
  use_count integer NOT NULL DEFAULT 0,
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_invitations_ws_idx ON public.workspace_invitations(workspace_id);

GRANT SELECT, INSERT, UPDATE ON public.workspace_invitations TO authenticated;
GRANT ALL ON public.workspace_invitations TO service_role;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers read workspace invitations"
  ON public.workspace_invitations FOR SELECT TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Managers create workspace invitations"
  ON public.workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Managers revoke workspace invitations"
  ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_manage(auth.uid(), workspace_id));

CREATE TRIGGER workspace_invitations_updated_at
  BEFORE UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Accepting is done through a definer function so the token is never readable
-- by the invitee, and access is granted to exactly one workspace.
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.workspace_invitations%ROWTYPE;
  ws public.workspaces%ROWTYPE;
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to join a workspace.';
  END IF;

  SELECT * INTO inv FROM public.workspace_invitations WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invitation link is not valid.'; END IF;
  IF inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'This invitation has been revoked.'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'This invitation has expired.'; END IF;
  IF inv.use_count >= inv.max_uses THEN RAISE EXCEPTION 'This invitation has already been used.'; END IF;

  SELECT * INTO ws FROM public.workspaces WHERE id = inv.workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'That workspace is no longer available.'; END IF;

  SELECT email INTO user_email FROM public.profiles WHERE user_id = uid;
  IF inv.email IS NOT NULL
     AND (user_email IS NULL OR lower(inv.email) <> lower(user_email)) THEN
    RAISE EXCEPTION 'This invitation was issued to a different email address.';
  END IF;

  INSERT INTO public.workspace_members(workspace_id, user_id, role, added_by)
  VALUES (ws.id, uid, inv.role, inv.invited_by)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.workspace_invitations
     SET use_count = use_count + 1,
         accepted_at = COALESCE(accepted_at, now()),
         accepted_by = COALESCE(accepted_by, uid)
   WHERE id = inv.id;

  INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type,
                                  organization_id, workspace_id, new_value)
  VALUES (uid, 'workspace', ws.id, 'membership.added', ws.organization_id, ws.id,
          jsonb_build_object('invitation_id', inv.id, 'role', inv.role, 'via', 'invitation'));

  RETURN ws.id;
END;
$$;

-- ---------------------------------------------------------- review notes
CREATE TABLE IF NOT EXISTS public.collab_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid,
  entity_type text NOT NULL CHECK (entity_type IN ('opportunity','use_case','portfolio')),
  entity_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) > 0),
  author_id uuid NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS collab_comments_entity_idx
  ON public.collab_comments(entity_type, entity_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_comments TO authenticated;
GRANT ALL ON public.collab_comments TO service_role;
ALTER TABLE public.collab_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read review notes"
  ON public.collab_comments FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Editors add review notes"
  ON public.collab_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Authors and managers update review notes"
  ON public.collab_comments FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id)
         AND (author_id = auth.uid() OR public.workspace_can_edit(auth.uid(), workspace_id)))
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Authors and managers delete review notes"
  ON public.collab_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.workspace_can_manage(auth.uid(), workspace_id));

CREATE TRIGGER collab_comments_updated_at
  BEFORE UPDATE ON public.collab_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------- assignments
CREATE TABLE IF NOT EXISTS public.collab_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('opportunity','use_case','portfolio')),
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assignment_role text NOT NULL CHECK (assignment_role IN ('owner','contributor')),
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, user_id, assignment_role)
);
CREATE INDEX IF NOT EXISTS collab_assignments_entity_idx
  ON public.collab_assignments(entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_assignments TO authenticated;
GRANT ALL ON public.collab_assignments TO service_role;
ALTER TABLE public.collab_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read assignments"
  ON public.collab_assignments FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Editors create assignments"
  ON public.collab_assignments FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid() AND public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Editors update assignments"
  ON public.collab_assignments FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Editors remove assignments"
  ON public.collab_assignments FOR DELETE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id));

CREATE TRIGGER collab_assignments_updated_at
  BEFORE UPDATE ON public.collab_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------- review status
CREATE TABLE IF NOT EXISTS public.collab_review_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('opportunity','use_case','portfolio')),
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready_for_review','reviewed','approved_for_portfolio','deferred','archived')),
  note text,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

GRANT SELECT, INSERT, UPDATE ON public.collab_review_states TO authenticated;
GRANT ALL ON public.collab_review_states TO service_role;
ALTER TABLE public.collab_review_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read review status"
  ON public.collab_review_states FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Editors set review status"
  ON public.collab_review_states FOR INSERT TO authenticated
  WITH CHECK (updated_by = auth.uid() AND public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Editors change review status"
  ON public.collab_review_states FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

CREATE TRIGGER collab_review_states_updated_at
  BEFORE UPDATE ON public.collab_review_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
