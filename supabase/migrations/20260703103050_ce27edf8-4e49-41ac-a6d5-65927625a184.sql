CREATE TABLE public.use_case_deliverables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  deliverable_type text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (use_case_id, deliverable_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_deliverables TO authenticated;
GRANT ALL ON public.use_case_deliverables TO service_role;

ALTER TABLE public.use_case_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access deliverables"
ON public.use_case_deliverables
FOR ALL
USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));

CREATE TRIGGER update_use_case_deliverables_updated_at
BEFORE UPDATE ON public.use_case_deliverables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();