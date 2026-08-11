-- Controlled pilot programme (15-25 users): invitations, mission checkpoints and pause control.
-- Additive only. No existing table, policy or grant is modified.

CREATE TABLE IF NOT EXISTS public.pilot_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  email text NOT NULL,
  full_name text,
  organization text,
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','registered','activated','completed','revoked')),
  user_id uuid,
  invited_by uuid,
  notes text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  registered_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pilot_invitations_cohort_email_key
  ON public.pilot_invitations (cohort, lower(email));
CREATE INDEX IF NOT EXISTS pilot_invitations_user_idx ON public.pilot_invitations (user_id);
CREATE INDEX IF NOT EXISTS pilot_invitations_status_idx ON public.pilot_invitations (cohort, status);

GRANT SELECT, INSERT, UPDATE ON public.pilot_invitations TO authenticated;
GRANT ALL ON public.pilot_invitations TO service_role;
ALTER TABLE public.pilot_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read their own pilot invitation"
  ON public.pilot_invitations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Platform admins read pilot invitations"
  ON public.pilot_invitations FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins create pilot invitations"
  ON public.pilot_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins update pilot invitations"
  ON public.pilot_invitations FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

DROP TRIGGER IF EXISTS pilot_invitations_updated_at ON public.pilot_invitations;
CREATE TRIGGER pilot_invitations_updated_at
  BEFORE UPDATE ON public.pilot_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Singleton operational switch: stops new pilot invitations during a P0 incident.
CREATE TABLE IF NOT EXISTS public.pilot_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  invitations_paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  paused_by uuid,
  paused_at timestamptz,
  seat_target integer NOT NULL DEFAULT 25,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pilot_settings TO authenticated;
GRANT ALL ON public.pilot_settings TO service_role;
ALTER TABLE public.pilot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read pilot settings"
  ON public.pilot_settings FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins insert pilot settings"
  ON public.pilot_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins update pilot settings"
  ON public.pilot_settings FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

INSERT INTO public.pilot_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Journey-anchored feedback checkpoints (start / mid-mission / final value & willingness).
CREATE TABLE IF NOT EXISTS public.pilot_checkpoint_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_id uuid REFERENCES public.pilot_invitations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  workspace_id uuid,
  organization_id uuid,
  checkpoint text NOT NULL,
  journey_stage text,
  context_route text,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  effort_rating smallint CHECK (effort_rating BETWEEN 1 AND 5),
  value_rating smallint CHECK (value_rating BETWEEN 1 AND 5),
  willingness text,
  advisory_interest boolean NOT NULL DEFAULT false,
  blocked boolean NOT NULL DEFAULT false,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pilot_checkpoints_user_idx
  ON public.pilot_checkpoint_responses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_checkpoints_checkpoint_idx
  ON public.pilot_checkpoint_responses (checkpoint, created_at DESC);

GRANT SELECT, INSERT ON public.pilot_checkpoint_responses TO authenticated;
GRANT ALL ON public.pilot_checkpoint_responses TO service_role;
ALTER TABLE public.pilot_checkpoint_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read their own checkpoint responses"
  ON public.pilot_checkpoint_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Participants record their own checkpoint responses"
  ON public.pilot_checkpoint_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform admins read checkpoint responses"
  ON public.pilot_checkpoint_responses FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));