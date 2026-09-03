CREATE TABLE IF NOT EXISTS public.pilot_milestone_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  cohort TEXT NOT NULL,
  milestone_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','changes_requested')),
  participant_note TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_note TEXT,
  decided_by UUID,
  decided_by_label TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort, milestone_key)
);

GRANT SELECT, INSERT, UPDATE ON public.pilot_milestone_approvals TO authenticated;
GRANT ALL ON public.pilot_milestone_approvals TO service_role;

ALTER TABLE public.pilot_milestone_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own milestone approvals"
  ON public.pilot_milestone_approvals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Participants submit own milestones"
  ON public.pilot_milestone_approvals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');

CREATE POLICY "Participants resubmit own milestones"
  ON public.pilot_milestone_approvals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status <> 'approved')
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');

CREATE POLICY "Admins decide milestone approvals"
  ON public.pilot_milestone_approvals FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE TRIGGER pilot_milestone_approvals_updated_at
  BEFORE UPDATE ON public.pilot_milestone_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS pilot_milestone_approvals_status_idx
  ON public.pilot_milestone_approvals (status, submitted_at DESC);