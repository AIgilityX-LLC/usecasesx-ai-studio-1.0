CREATE TABLE public.pilot_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  full_name text NOT NULL,
  email text NOT NULL,
  organization text NOT NULL,
  role_title text,
  sector text,
  country text,
  goals text,
  source text NOT NULL DEFAULT 'self_serve',
  status text NOT NULL DEFAULT 'requested',
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  invitation_id uuid REFERENCES public.pilot_invitations(id) ON DELETE SET NULL,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pilot_applications_status_check CHECK (status = ANY (ARRAY['requested','approved','declined','merged']))
);

GRANT SELECT, UPDATE ON public.pilot_applications TO authenticated;
GRANT ALL ON public.pilot_applications TO service_role;

ALTER TABLE public.pilot_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read pilot applications"
  ON public.pilot_applications FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins can update pilot applications"
  ON public.pilot_applications FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE UNIQUE INDEX pilot_applications_open_email_uidx
  ON public.pilot_applications (cohort, lower(email))
  WHERE status = 'requested';

CREATE INDEX pilot_applications_status_idx ON public.pilot_applications (status, created_at DESC);

CREATE TRIGGER update_pilot_applications_updated_at
  BEFORE UPDATE ON public.pilot_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();