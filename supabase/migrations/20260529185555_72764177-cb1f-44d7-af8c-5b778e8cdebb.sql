
-- Phase A: UseCaseX PRD schema additions

-- 1) Extend use_cases with PRD descriptive + scoring + publishing fields
ALTER TABLE public.use_cases
  ADD COLUMN IF NOT EXISTS business_problem text,
  ADD COLUMN IF NOT EXISTS ai_solution_concept text,
  ADD COLUMN IF NOT EXISTS business_value text,
  ADD COLUMN IF NOT EXISTS data_required text,
  ADD COLUMN IF NOT EXISTS kpis text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS roi_areas text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS governance_notes text,
  ADD COLUMN IF NOT EXISTS cybersecurity_notes text,
  ADD COLUMN IF NOT EXISTS privacy_notes text,
  ADD COLUMN IF NOT EXISTS governance_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cyber_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assurance_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS value_potential text,        -- low/medium/high/transformative
  ADD COLUMN IF NOT EXISTS complexity text,              -- low/medium/high
  ADD COLUMN IF NOT EXISTS risk_level text,              -- low/medium/high
  ADD COLUMN IF NOT EXISTS time_to_value text,           -- weeks/months/quarters/year+
  ADD COLUMN IF NOT EXISTS maturity_level text,          -- experimental/pilot/scaling/production
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_landing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recommended_platforms text[] DEFAULT '{}'::text[];

-- 2) Business objectives taxonomy
CREATE TABLE IF NOT EXISTS public.business_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);
GRANT SELECT ON public.business_objectives TO anon, authenticated;
GRANT ALL ON public.business_objectives TO service_role;
ALTER TABLE public.business_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Objectives public read" ON public.business_objectives FOR SELECT USING (true);
CREATE POLICY "Admins manage objectives" ON public.business_objectives FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

CREATE TABLE IF NOT EXISTS public.use_case_business_objectives (
  use_case_id uuid NOT NULL,
  objective_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, objective_id)
);
GRANT SELECT ON public.use_case_business_objectives TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_business_objectives TO authenticated;
GRANT ALL ON public.use_case_business_objectives TO service_role;
ALTER TABLE public.use_case_business_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read uc_objectives" ON public.use_case_business_objectives FOR SELECT
  USING (EXISTS (SELECT 1 FROM use_cases u WHERE u.id = use_case_id AND u.status = 'published'));
CREATE POLICY "Authors manage uc_objectives" ON public.use_case_business_objectives FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()));
CREATE POLICY "Mods manage uc_objectives" ON public.use_case_business_objectives FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- 3) Lead captures
CREATE TABLE IF NOT EXISTS public.lead_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  company text,
  role text,
  country text,
  industry text,
  interest_area text,
  source_use_case uuid,
  source_page text,
  cta text,
  notes text,
  lead_status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.lead_captures TO anon, authenticated;
GRANT ALL ON public.lead_captures TO service_role;
ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit lead" ON public.lead_captures FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admins read leads" ON public.lead_captures FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Admins update leads" ON public.lead_captures FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- 4) CTA events
CREATE TABLE IF NOT EXISTS public.cta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid,
  cta text NOT NULL,
  target_platform text,
  target_route text,
  user_id uuid,
  session_id text,
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.cta_events TO anon, authenticated;
GRANT ALL ON public.cta_events TO service_role;
ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone log cta" ON public.cta_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read cta" ON public.cta_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
