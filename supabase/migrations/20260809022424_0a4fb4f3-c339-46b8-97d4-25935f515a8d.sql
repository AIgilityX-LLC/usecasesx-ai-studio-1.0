CREATE TABLE public.use_case_deliverable_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES public.use_case_deliverables(id) ON DELETE CASCADE,
  use_case_id uuid NOT NULL,
  deliverable_type text NOT NULL,
  version integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  origin text NOT NULL DEFAULT 'authored',
  summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id, version)
);

CREATE INDEX idx_deliverable_versions_lookup
  ON public.use_case_deliverable_versions (use_case_id, deliverable_type, version DESC);

GRANT SELECT, INSERT ON public.use_case_deliverable_versions TO authenticated;
GRANT ALL ON public.use_case_deliverable_versions TO service_role;

ALTER TABLE public.use_case_deliverable_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read deliverable versions"
  ON public.use_case_deliverable_versions
  FOR SELECT TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Members create deliverable versions"
  ON public.use_case_deliverable_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()));