
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'contributor', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMP TRIGGER FN ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ TAXONOMY ============
CREATE TABLE public.industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text
);
GRANT SELECT ON public.industries TO anon, authenticated;
GRANT ALL ON public.industries TO service_role;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Industries public read" ON public.industries FOR SELECT USING (true);
CREATE POLICY "Admins manage industries" ON public.industries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.business_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL
);
GRANT SELECT ON public.business_functions TO anon, authenticated;
GRANT ALL ON public.business_functions TO service_role;
ALTER TABLE public.business_functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business fns public read" ON public.business_functions FOR SELECT USING (true);
CREATE POLICY "Admins manage business fns" ON public.business_functions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.gov_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL
);
GRANT SELECT ON public.gov_functions TO anon, authenticated;
GRANT ALL ON public.gov_functions TO service_role;
ALTER TABLE public.gov_functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gov fns public read" ON public.gov_functions FOR SELECT USING (true);
CREATE POLICY "Admins manage gov fns" ON public.gov_functions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.ai_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL
);
GRANT SELECT ON public.ai_capabilities TO anon, authenticated;
GRANT ALL ON public.ai_capabilities TO service_role;
ALTER TABLE public.ai_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Capabilities public read" ON public.ai_capabilities FOR SELECT USING (true);
CREATE POLICY "Admins manage capabilities" ON public.ai_capabilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  region text
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries public read" ON public.countries FOR SELECT USING (true);

-- ============ USE CASES ============
CREATE TYPE public.use_case_status AS ENUM ('draft','review','published','archived');
CREATE TYPE public.maturity_stage AS ENUM ('concept','prototype','pilot','production','scaled');

CREATE TABLE public.use_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  problem text,
  solution text,
  outcomes text,
  organization text,
  organization_type text,
  region text,
  status public.use_case_status NOT NULL DEFAULT 'draft',
  maturity public.maturity_stage,
  maturity_score smallint CHECK (maturity_score BETWEEN 1 AND 5),
  impact_score smallint CHECK (impact_score BETWEEN 1 AND 5),
  effort_score smallint CHECK (effort_score BETWEEN 1 AND 5),
  risk_score smallint CHECK (risk_score BETWEEN 1 AND 5),
  hero_image_url text,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX use_cases_status_idx ON public.use_cases(status);
CREATE INDEX use_cases_slug_idx ON public.use_cases(slug);

GRANT SELECT ON public.use_cases TO anon, authenticated;
GRANT INSERT, UPDATE ON public.use_cases TO authenticated;
GRANT ALL ON public.use_cases TO service_role;

ALTER TABLE public.use_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published" ON public.use_cases FOR SELECT
  USING (status = 'published');
CREATE POLICY "Authors read own" ON public.use_cases FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());
CREATE POLICY "Moderators read all" ON public.use_cases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Auth users insert drafts" ON public.use_cases FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND status IN ('draft','review'));
CREATE POLICY "Authors update own drafts" ON public.use_cases FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() AND status IN ('draft','review'))
  WITH CHECK (submitted_by = auth.uid() AND status IN ('draft','review'));
CREATE POLICY "Moderators update any" ON public.use_cases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Admins delete" ON public.use_cases FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_use_cases_updated BEFORE UPDATE ON public.use_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ JOIN TABLES ============
CREATE TABLE public.use_case_industries (
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE,
  industry_id uuid REFERENCES public.industries(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, industry_id)
);
CREATE TABLE public.use_case_business_functions (
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE,
  business_function_id uuid REFERENCES public.business_functions(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, business_function_id)
);
CREATE TABLE public.use_case_gov_functions (
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE,
  gov_function_id uuid REFERENCES public.gov_functions(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, gov_function_id)
);
CREATE TABLE public.use_case_capabilities (
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE,
  capability_id uuid REFERENCES public.ai_capabilities(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, capability_id)
);
CREATE TABLE public.use_case_countries (
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE,
  country_id uuid REFERENCES public.countries(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, country_id)
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'use_case_industries','use_case_business_functions','use_case_gov_functions',
    'use_case_capabilities','use_case_countries'
  ]) LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT INSERT, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Public read %I" ON public.%I FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = %I.use_case_id AND u.status = ''published'')
    )', t, t, t);
    EXECUTE format('CREATE POLICY "Moderators all %I" ON public.%I FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''moderator''))
      WITH CHECK (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''moderator''))', t, t);
    EXECUTE format('CREATE POLICY "Authors manage own %I" ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = %I.use_case_id AND u.submitted_by = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = %I.use_case_id AND u.submitted_by = auth.uid()))', t, t, t, t);
  END LOOP;
END $$;

-- ============ METRICS & LINKS ============
CREATE TABLE public.use_case_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  unit text,
  sort_order int DEFAULT 0
);
GRANT SELECT ON public.use_case_metrics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_metrics TO authenticated;
GRANT ALL ON public.use_case_metrics TO service_role;
ALTER TABLE public.use_case_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read metrics" ON public.use_case_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.status = 'published')
);
CREATE POLICY "Authors metrics" ON public.use_case_metrics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()));
CREATE POLICY "Mods metrics" ON public.use_case_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.use_case_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  kind text DEFAULT 'evidence'
);
GRANT SELECT ON public.use_case_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_links TO authenticated;
GRANT ALL ON public.use_case_links TO service_role;
ALTER TABLE public.use_case_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read links" ON public.use_case_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.status = 'published')
);
CREATE POLICY "Authors links" ON public.use_case_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()));
CREATE POLICY "Mods links" ON public.use_case_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- ============ SHORTLISTS ============
CREATE TABLE public.shortlists (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  use_case_id uuid REFERENCES public.use_cases(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, use_case_id)
);
GRANT SELECT, INSERT, DELETE ON public.shortlists TO authenticated;
GRANT ALL ON public.shortlists TO service_role;
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own shortlist" ON public.shortlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
