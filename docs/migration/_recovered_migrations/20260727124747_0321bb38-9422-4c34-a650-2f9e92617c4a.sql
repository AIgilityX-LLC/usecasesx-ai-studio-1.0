-- 1. Organization unit types (additive)
DO $$ BEGIN
  CREATE TYPE public.org_unit_type AS ENUM ('group','company','business_unit','department','team','program','project');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.organization_units
  ADD COLUMN IF NOT EXISTS unit_type public.org_unit_type NOT NULL DEFAULT 'department',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Generic taxonomy dimension tables (global when organization_id IS NULL)
CREATE TABLE IF NOT EXISTS public.taxonomy_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.taxonomy_strategic_themes (LIKE public.taxonomy_processes INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.taxonomy_value_themes (LIKE public.taxonomy_processes INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.taxonomy_risk_levels (LIKE public.taxonomy_processes INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.taxonomy_lifecycle_stages (LIKE public.taxonomy_processes INCLUDING ALL);

ALTER TABLE public.taxonomy_strategic_themes
  ADD CONSTRAINT taxonomy_strategic_themes_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.taxonomy_value_themes
  ADD CONSTRAINT taxonomy_value_themes_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.taxonomy_risk_levels
  ADD CONSTRAINT taxonomy_risk_levels_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.taxonomy_lifecycle_stages
  ADD CONSTRAINT taxonomy_lifecycle_stages_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['taxonomy_processes','taxonomy_strategic_themes','taxonomy_value_themes','taxonomy_risk_levels','taxonomy_lifecycle_stages']
  LOOP
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (slug) WHERE organization_id IS NULL', t||'_global_slug_uk', t);
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (organization_id, slug) WHERE organization_id IS NOT NULL', t||'_tenant_slug_uk', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY "%1$s global published readable" ON public.%1$I FOR SELECT USING (organization_id IS NULL AND is_published = true)$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s tenant readable" ON public.%1$I FOR SELECT TO authenticated USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s tenant manage" ON public.%1$I FOR ALL TO authenticated USING (organization_id IS NOT NULL AND public.org_role(auth.uid(), organization_id) IN ('owner','admin')) WITH CHECK (organization_id IS NOT NULL AND public.org_role(auth.uid(), organization_id) IN ('owner','admin'))$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s global manage" ON public.%1$I FOR ALL TO authenticated USING (organization_id IS NULL AND public.is_admin_tier(auth.uid())) WITH CHECK (organization_id IS NULL AND public.is_admin_tier(auth.uid()))$p$, t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t||'_set_updated_at', t);
  END LOOP;
END $$;

-- 3. Many-to-many links for studio opportunities (ai_use_cases)
CREATE TABLE IF NOT EXISTS public.ai_use_case_org_units (
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  org_unit_id uuid NOT NULL REFERENCES public.organization_units(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (use_case_id, org_unit_id)
);
CREATE TABLE IF NOT EXISTS public.ai_use_case_processes (
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.taxonomy_processes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (use_case_id, process_id)
);
CREATE TABLE IF NOT EXISTS public.ai_use_case_strategic_themes (
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.taxonomy_strategic_themes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (use_case_id, theme_id)
);
CREATE TABLE IF NOT EXISTS public.ai_use_case_value_themes (
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.taxonomy_value_themes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (use_case_id, theme_id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai_use_case_org_units','ai_use_case_processes','ai_use_case_strategic_themes','ai_use_case_value_themes']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY "%1$s members read" ON public.%1$I FOR SELECT TO authenticated USING (public.user_can_access_use_case(auth.uid(), use_case_id))$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s members write" ON public.%1$I FOR ALL TO authenticated USING (public.user_can_access_use_case(auth.uid(), use_case_id)) WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id))$p$, t);
  END LOOP;
END $$;

-- 4. Repository use_cases taxonomy links (mirror existing join-table conventions)
CREATE TABLE IF NOT EXISTS public.use_case_processes (
  use_case_id uuid NOT NULL REFERENCES public.use_cases(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.taxonomy_processes(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, process_id)
);
CREATE TABLE IF NOT EXISTS public.use_case_strategic_themes (
  use_case_id uuid NOT NULL REFERENCES public.use_cases(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.taxonomy_strategic_themes(id) ON DELETE CASCADE,
  PRIMARY KEY (use_case_id, theme_id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['use_case_processes','use_case_strategic_themes']
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY "%1$s public read" ON public.%1$I FOR SELECT USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.status = 'published'::public.use_case_status))$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s editors read" ON public.%1$I FOR SELECT TO authenticated USING (public.is_editor_tier(auth.uid()))$p$, t);
    EXECUTE format($p$CREATE POLICY "%1$s editors write" ON public.%1$I FOR ALL TO authenticated USING (public.is_editor_tier(auth.uid())) WITH CHECK (public.is_editor_tier(auth.uid()))$p$, t);
  END LOOP;
END $$;
