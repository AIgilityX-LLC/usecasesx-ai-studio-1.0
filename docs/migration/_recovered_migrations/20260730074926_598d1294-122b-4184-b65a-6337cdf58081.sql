-- Lifecycle + provenance vocabularies
DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM ('signal','opportunity','qualified','converted','deferred','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.opportunity_source AS ENUM ('scratch','repository','workshop','referral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.opportunity_urgency AS ENUM ('now','next','later','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Problem framing (only the title is required; everything else is progressive)
  title text NOT NULL,
  pain_point text,
  process text,
  process_id uuid REFERENCES public.taxonomy_processes(id) ON DELETE SET NULL,
  org_unit_id uuid REFERENCES public.organization_units(id) ON DELETE SET NULL,
  business_function text,
  strategic_objective text,
  strategic_theme_id uuid REFERENCES public.taxonomy_strategic_themes(id) ON DELETE SET NULL,
  stakeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  baseline text,
  desired_outcome text,
  urgency public.opportunity_urgency NOT NULL DEFAULT 'unknown',
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Lifecycle + provenance
  status public.opportunity_status NOT NULL DEFAULT 'signal',
  source public.opportunity_source NOT NULL DEFAULT 'scratch',
  source_use_case_id uuid REFERENCES public.use_cases(id) ON DELETE SET NULL,
  source_reference text,

  -- AI assist provenance (suggestions are stored separately from author content)
  ai_assisted boolean NOT NULL DEFAULT false,
  ai_suggestions jsonb,
  ai_suggested_at timestamp with time zone,

  -- Conversion lineage
  converted_use_case_id uuid REFERENCES public.ai_use_cases(id) ON DELETE SET NULL,
  converted_at timestamp with time zone,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT opportunities_title_not_blank CHECK (length(btrim(title)) > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read opportunities"
  ON public.opportunities FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR created_by = auth.uid());

CREATE POLICY "Workspace members can create opportunities"
  ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update opportunities"
  ON public.opportunities FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR created_by = auth.uid())
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id) OR created_by = auth.uid());

CREATE POLICY "Creators and workspace owners can delete opportunities"
  ON public.opportunities FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.workspace_role(auth.uid(), workspace_id) IN ('owner','admin')
  );

CREATE INDEX IF NOT EXISTS opportunities_workspace_status_idx
  ON public.opportunities (workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_created_by_idx
  ON public.opportunities (created_by);

CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stamp the organisation from the owning workspace (mirrors existing tenancy triggers).
CREATE OR REPLACE FUNCTION public.sync_opportunity_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER opportunities_sync_org
  BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_org();

-- Conversion lineage on the Studio side (additive, nullable).
ALTER TABLE public.ai_use_cases
  ADD COLUMN IF NOT EXISTS source_opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_use_cases_source_opportunity_idx
  ON public.ai_use_cases (source_opportunity_id);
