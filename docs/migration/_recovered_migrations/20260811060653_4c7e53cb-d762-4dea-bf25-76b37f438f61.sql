-- 1. Launch waiver overrides -------------------------------------------------
CREATE TABLE public.pilot_rc_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  scope text NOT NULL DEFAULT 'pilot_evidence',
  reason text NOT NULL,
  approver_name text NOT NULL,
  approver_role text NOT NULL,
  approved_by uuid NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pilot_rc_waivers_cohort_idx ON public.pilot_rc_waivers (cohort, created_at DESC);
CREATE UNIQUE INDEX pilot_rc_waivers_active_idx
  ON public.pilot_rc_waivers (cohort, scope)
  WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.pilot_rc_waivers TO authenticated;
GRANT ALL ON public.pilot_rc_waivers TO service_role;

ALTER TABLE public.pilot_rc_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read launch waivers"
  ON public.pilot_rc_waivers FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins grant launch waivers"
  ON public.pilot_rc_waivers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()) AND approved_by = auth.uid());

CREATE POLICY "Platform admins revoke launch waivers"
  ON public.pilot_rc_waivers FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE TRIGGER update_pilot_rc_waivers_updated_at
  BEFORE UPDATE ON public.pilot_rc_waivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Recorded verdict snapshots ---------------------------------------------
CREATE TABLE public.pilot_verdict_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  verdict text NOT NULL,
  headline text NOT NULL,
  freeze_recommended boolean NOT NULL DEFAULT false,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  invited integer NOT NULL DEFAULT 0,
  registered integer NOT NULL DEFAULT 0,
  checkpoint_answers integer NOT NULL DEFAULT 0,
  p0_count integer NOT NULL DEFAULT 0,
  p1_count integer NOT NULL DEFAULT 0,
  evidence_gap_state text,
  waiver_id uuid REFERENCES public.pilot_rc_waivers(id) ON DELETE SET NULL,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pilot_verdict_snapshots_cohort_idx
  ON public.pilot_verdict_snapshots (cohort, created_at DESC);

GRANT SELECT, INSERT ON public.pilot_verdict_snapshots TO authenticated;
GRANT ALL ON public.pilot_verdict_snapshots TO service_role;

ALTER TABLE public.pilot_verdict_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read verdict snapshots"
  ON public.pilot_verdict_snapshots FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins record verdict snapshots"
  ON public.pilot_verdict_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()) AND recorded_by = auth.uid());

-- 3. Reminder dispatch log --------------------------------------------------
CREATE TABLE public.pilot_reminder_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  invitation_id uuid REFERENCES public.pilot_invitations(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  kind text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'queued',
  detail text,
  window_days integer,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pilot_reminder_dispatches_idem_idx
  ON public.pilot_reminder_dispatches (idempotency_key);
CREATE INDEX pilot_reminder_dispatches_cohort_idx
  ON public.pilot_reminder_dispatches (cohort, created_at DESC);

GRANT SELECT ON public.pilot_reminder_dispatches TO authenticated;
GRANT ALL ON public.pilot_reminder_dispatches TO service_role;

ALTER TABLE public.pilot_reminder_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read reminder dispatches"
  ON public.pilot_reminder_dispatches FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE TRIGGER update_pilot_reminder_dispatches_updated_at
  BEFORE UPDATE ON public.pilot_reminder_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
