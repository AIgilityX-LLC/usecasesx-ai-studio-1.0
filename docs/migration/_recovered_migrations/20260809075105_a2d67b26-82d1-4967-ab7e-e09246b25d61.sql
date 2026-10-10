-- 1. Link workshops to the artefacts produced from them (additive, nullable).
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outcome_report_id uuid REFERENCES public.generated_reports(id) ON DELETE SET NULL;

-- 2. Invitations.
CREATE TABLE IF NOT EXISTS public.workshop_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  email text,
  display_name text,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('facilitator','participant','observer')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 200),
  use_count integer NOT NULL DEFAULT 0,
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workshop_invitations_workshop_idx
  ON public.workshop_invitations(workshop_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_invitations TO authenticated;
GRANT ALL ON public.workshop_invitations TO service_role;

ALTER TABLE public.workshop_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilitators read workshop invitations"
  ON public.workshop_invitations FOR SELECT TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE POLICY "Facilitators create workshop invitations"
  ON public.workshop_invitations FOR INSERT TO authenticated
  WITH CHECK (
    public.workshop_is_facilitator(workshop_id, auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Facilitators update workshop invitations"
  ON public.workshop_invitations FOR UPDATE TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE POLICY "Facilitators delete workshop invitations"
  ON public.workshop_invitations FOR DELETE TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE TRIGGER trg_workshop_invitations_updated
  BEFORE UPDATE ON public.workshop_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Join by token. SECURITY DEFINER so the invitee can read the invitation row
--    they do not own, while workspace scoping stays enforced inside.
CREATE OR REPLACE FUNCTION public.accept_workshop_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.workshop_invitations%ROWTYPE;
  ws public.workshops%ROWTYPE;
  user_email text;
  in_workspace boolean;
  invited_by_email boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to join a workshop.';
  END IF;

  SELECT * INTO inv FROM public.workshop_invitations WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation link is not valid.';
  END IF;
  IF inv.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invitation has been revoked.';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired.';
  END IF;
  IF inv.use_count >= inv.max_uses THEN
    RAISE EXCEPTION 'This invitation has already been used.';
  END IF;

  SELECT * INTO ws FROM public.workshops WHERE id = inv.workshop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This workshop is no longer available.';
  END IF;

  SELECT email INTO user_email FROM public.profiles WHERE user_id = uid;
  in_workspace := public.user_in_workspace(uid, ws.workspace_id);
  invited_by_email := inv.email IS NOT NULL
    AND user_email IS NOT NULL
    AND lower(inv.email) = lower(user_email);

  IF NOT in_workspace AND NOT invited_by_email THEN
    RAISE EXCEPTION 'This invitation is scoped to the host workspace. Ask the facilitator to invite your email address.';
  END IF;

  -- Email invitees get scoped access to this one workspace only.
  IF NOT in_workspace THEN
    INSERT INTO public.workspace_members(workspace_id, user_id, role)
    VALUES (ws.workspace_id, uid, 'viewer')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.workshop_participants(workshop_id, user_id, display_name, email, role)
  VALUES (inv.workshop_id, uid,
          COALESCE(NULLIF(inv.display_name,''), NULLIF(user_email,''), 'Participant'),
          COALESCE(inv.email, user_email),
          inv.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.workshop_participants
     SET user_id = uid,
         role = inv.role
   WHERE workshop_id = inv.workshop_id
     AND user_id IS NULL
     AND inv.email IS NOT NULL
     AND lower(email) = lower(inv.email);

  UPDATE public.workshop_invitations
     SET use_count = use_count + 1,
         accepted_at = COALESCE(accepted_at, now()),
         accepted_by = COALESCE(accepted_by, uid)
   WHERE id = inv.id;

  INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type,
                                  organization_id, workspace_id, new_value)
  VALUES (uid, 'workshop', inv.workshop_id, 'workshop.participant_joined',
          ws.organization_id, ws.workspace_id,
          jsonb_build_object('invitation_id', inv.id, 'role', inv.role,
                             'via', CASE WHEN invited_by_email THEN 'email' ELSE 'workspace_link' END));

  RETURN inv.workshop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_workshop_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_workshop_invitation(text) TO authenticated;
