-- 1. Scorecard definitions (versioned, global or workspace-owned)
CREATE TABLE public.scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'published',
  is_default boolean NOT NULL DEFAULT false,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX scorecards_global_slug_version_key
  ON public.scorecards (slug, version) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX scorecards_workspace_slug_version_key
  ON public.scorecards (workspace_id, slug, version) WHERE workspace_id IS NOT NULL;
CREATE INDEX scorecards_workspace_idx ON public.scorecards (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecards TO authenticated;
GRANT SELECT ON public.scorecards TO anon;
GRANT ALL ON public.scorecards TO service_role;

ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global scorecards are readable"
  ON public.scorecards FOR SELECT
  USING (workspace_id IS NULL AND status = 'published');

CREATE POLICY "Workspace members read their scorecards"
  ON public.scorecards FOR SELECT TO authenticated
  USING (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members create workspace scorecards"
  ON public.scorecards FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members update workspace scorecards"
  ON public.scorecards FOR UPDATE TO authenticated
  USING (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id))
  WITH CHECK (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members delete workspace scorecards"
  ON public.scorecards FOR DELETE TO authenticated
  USING (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Admins manage global scorecards"
  ON public.scorecards FOR ALL TO authenticated
  USING (workspace_id IS NULL AND public.is_admin_tier(auth.uid()))
  WITH CHECK (workspace_id IS NULL AND public.is_admin_tier(auth.uid()));

CREATE TRIGGER update_scorecards_updated_at
  BEFORE UPDATE ON public.scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Scorecard results (append-only, one row per scoring run)
CREATE TABLE public.scorecard_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  scorecard_id uuid NOT NULL REFERENCES public.scorecards(id) ON DELETE RESTRICT,
  scorecard_slug text NOT NULL,
  scorecard_version integer NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  composite_score numeric,
  risk_adjusted_score numeric,
  completeness numeric,
  confidence text,
  recommendation text,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  organization_id uuid,
  workspace_id uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX scorecard_results_use_case_idx
  ON public.scorecard_results (use_case_id, created_at DESC);

GRANT SELECT, INSERT ON public.scorecard_results TO authenticated;
GRANT ALL ON public.scorecard_results TO service_role;

ALTER TABLE public.scorecard_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read scorecard results"
  ON public.scorecard_results FOR SELECT TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id));

CREATE POLICY "Workspace members record scorecard results"
  ON public.scorecard_results FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_can_access_use_case(auth.uid(), use_case_id)
  );

CREATE TRIGGER sync_scorecard_results_tenancy
  BEFORE INSERT ON public.scorecard_results
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();