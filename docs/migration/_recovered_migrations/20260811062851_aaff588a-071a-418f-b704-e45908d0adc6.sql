CREATE TABLE public.workshop_public_value_canvas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id uuid NOT NULL UNIQUE REFERENCES public.workshops(id) ON DELETE CASCADE,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  completeness integer NOT NULL DEFAULT 0,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_public_value_canvas TO authenticated;
GRANT ALL ON public.workshop_public_value_canvas TO service_role;

ALTER TABLE public.workshop_public_value_canvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop members read the public value canvas"
ON public.workshop_public_value_canvas FOR SELECT TO authenticated
USING (public.workshop_is_member(workshop_id, auth.uid()));

CREATE POLICY "Facilitators write the public value canvas"
ON public.workshop_public_value_canvas FOR ALL TO authenticated
USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE TRIGGER update_workshop_public_value_canvas_updated_at
BEFORE UPDATE ON public.workshop_public_value_canvas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pilot_launch_check_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort text NOT NULL,
  trigger text NOT NULL DEFAULT 'manual',
  trigger_detail text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  total integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  errored integer NOT NULL DEFAULT 0,
  p0_failures integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pilot_launch_check_runs TO authenticated;
GRANT ALL ON public.pilot_launch_check_runs TO service_role;

ALTER TABLE public.pilot_launch_check_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read launch check runs"
ON public.pilot_launch_check_runs FOR SELECT TO authenticated
USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins record launch check runs"
ON public.pilot_launch_check_runs FOR INSERT TO authenticated
WITH CHECK (public.is_admin_tier(auth.uid()) AND (actor_id = auth.uid()));

CREATE INDEX pilot_launch_check_runs_cohort_created_idx
ON public.pilot_launch_check_runs (cohort, created_at DESC);

CREATE TRIGGER update_pilot_launch_check_runs_updated_at
BEFORE UPDATE ON public.pilot_launch_check_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
