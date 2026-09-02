ALTER TABLE public.pilot_invitations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS public.pilot_browser_suite_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  suite text NOT NULL DEFAULT 'p0-p1',
  actor_id uuid,
  actor_email text,
  participant_email text,
  total integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  verdict text NOT NULL DEFAULT 'unknown',
  failing_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  spec_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pilot_browser_suite_runs TO authenticated;
GRANT ALL ON public.pilot_browser_suite_runs TO service_role;

ALTER TABLE public.pilot_browser_suite_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read browser suite runs"
  ON public.pilot_browser_suite_runs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins record browser suite runs"
  ON public.pilot_browser_suite_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()) AND actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS pilot_browser_suite_runs_cohort_created_idx
  ON public.pilot_browser_suite_runs (cohort, created_at DESC);