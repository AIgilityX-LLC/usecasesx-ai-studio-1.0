-- 1. Pilot audit trail -------------------------------------------------------
CREATE TABLE public.pilot_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  invitation_id uuid REFERENCES public.pilot_invitations(id) ON DELETE SET NULL,
  subject_email text,
  subject_user_id uuid,
  action text NOT NULL,
  from_status text,
  to_status text,
  reason text,
  actor_id uuid,
  actor_kind text NOT NULL DEFAULT 'admin',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pilot_audit_events TO authenticated;
GRANT ALL ON public.pilot_audit_events TO service_role;
ALTER TABLE public.pilot_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read the pilot audit trail"
  ON public.pilot_audit_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE INDEX pilot_audit_events_cohort_idx
  ON public.pilot_audit_events (cohort, created_at DESC);
CREATE INDEX pilot_audit_events_invitation_idx
  ON public.pilot_audit_events (invitation_id, created_at DESC);

-- 2. Checkpoint mission references -------------------------------------------
ALTER TABLE public.pilot_checkpoint_responses
  ADD COLUMN IF NOT EXISTS mission_step text,
  ADD COLUMN IF NOT EXISTS use_case_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS portfolio_id uuid;

-- 3. Pilot reminders ---------------------------------------------------------
CREATE TABLE public.pilot_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid REFERENCES public.pilot_invitations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  mission_step text,
  checkpoint text,
  title text NOT NULL,
  body text NOT NULL,
  target_route text,
  actor_id uuid,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.pilot_reminders TO authenticated;
GRANT ALL ON public.pilot_reminders TO service_role;
ALTER TABLE public.pilot_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read their own pilot reminders"
  ON public.pilot_reminders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Participants dismiss their own pilot reminders"
  ON public.pilot_reminders FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX pilot_reminders_user_idx
  ON public.pilot_reminders (user_id, created_at DESC);
CREATE UNIQUE INDEX pilot_reminders_unique_open_idx
  ON public.pilot_reminders (user_id, kind, coalesce(mission_step, checkpoint, ''))
  WHERE dismissed_at IS NULL;