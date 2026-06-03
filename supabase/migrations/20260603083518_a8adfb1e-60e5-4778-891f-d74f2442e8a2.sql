-- ============================================================
-- UseCasesX Studio schema: organizations, workspaces, patterns,
-- boards, ai_use_cases, feasibility, data readiness, blueprints,
-- integrations, audit.
-- ============================================================

-- 1. ORGANIZATIONS -------------------------------------------------
CREATE TABLE public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text,        -- enterprise | government | consulting | academic | startup
  industry    text,
  country     text,
  plan        text NOT NULL DEFAULT 'lite', -- lite | pro | enterprise
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add org membership column on profiles (single-org model)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Helper: user's org id (SECURITY DEFINER, no recursion risk)
CREATE OR REPLACE FUNCTION public.user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Members read own org"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.user_org_id(auth.uid()) OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Admin tier manages orgs"
  ON public.organizations FOR ALL TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

-- 2. WORKSPACES ----------------------------------------------------
CREATE TABLE public.workspaces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  workspace_type  text, -- repository | studio | consulting | government
  created_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workspaces_org ON public.workspaces(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Helper: does user belong to the workspace's org?
CREATE OR REPLACE FUNCTION public.user_in_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id
      AND w.organization_id = public.user_org_id(_user_id)
  )
$$;

CREATE POLICY "Org members read workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id(auth.uid()) OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Org members create workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.user_org_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Org members update workspaces"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (organization_id = public.user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.user_org_id(auth.uid()));

CREATE POLICY "Org members delete workspaces"
  ON public.workspaces FOR DELETE TO authenticated
  USING (organization_id = public.user_org_id(auth.uid()) OR public.is_admin_tier(auth.uid()));

-- 3. USE_CASE_PATTERNS (global library) ----------------------------
CREATE TABLE public.use_case_patterns (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  summary             text,
  industry            text,
  domain              text,
  function_area       text,
  government_domain   text,
  ai_type             text,
  business_problem    text,
  data_inputs         jsonb DEFAULT '[]'::jsonb,
  expected_outputs    jsonb DEFAULT '[]'::jsonb,
  sample_kpis         jsonb DEFAULT '[]'::jsonb,
  risks               jsonb DEFAULT '[]'::jsonb,
  controls            jsonb DEFAULT '[]'::jsonb,
  complexity_level    text,
  value_potential     text,
  maturity_level      text,
  access_tier         text NOT NULL DEFAULT 'free', -- free | pro | enterprise
  status              text NOT NULL DEFAULT 'draft', -- draft | published | archived
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.use_case_patterns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_patterns TO authenticated;
GRANT ALL ON public.use_case_patterns TO service_role;
ALTER TABLE public.use_case_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published patterns"
  ON public.use_case_patterns FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admin tier reads all patterns"
  ON public.use_case_patterns FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Admin tier manages patterns"
  ON public.use_case_patterns FOR ALL TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

-- 4. USE_CASE_BOARDS ----------------------------------------------
CREATE TABLE public.use_case_boards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  board_type    text, -- discovery | department | government | client | portfolio
  status        text NOT NULL DEFAULT 'active',
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boards_workspace ON public.use_case_boards(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_boards TO authenticated;
GRANT ALL ON public.use_case_boards TO service_role;
ALTER TABLE public.use_case_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read boards"
  ON public.use_case_boards FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Workspace members write boards"
  ON public.use_case_boards FOR INSERT TO authenticated
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "Workspace members update boards"
  ON public.use_case_boards FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id))
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members delete boards"
  ON public.use_case_boards FOR DELETE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));

-- 5. AI_USE_CASES --------------------------------------------------
CREATE TABLE public.ai_use_cases (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id                    uuid NOT NULL REFERENCES public.use_case_boards(id) ON DELETE CASCADE,
  pattern_id                  uuid REFERENCES public.use_case_patterns(id) ON DELETE SET NULL,
  title                       text NOT NULL,
  problem_statement           text,
  current_state               text,
  future_state                text,
  beneficiaries               text,
  stakeholders                jsonb DEFAULT '[]'::jsonb,
  ai_type                     text,
  data_sources                jsonb DEFAULT '[]'::jsonb,
  expected_benefits           jsonb DEFAULT '[]'::jsonb,
  kpis                        jsonb DEFAULT '[]'::jsonb,
  risks                       jsonb DEFAULT '[]'::jsonb,
  controls                    jsonb DEFAULT '[]'::jsonb,
  mvp_scope                   text,
  minimum_viable_prediction   text,
  status                      text NOT NULL DEFAULT 'idea',
  priority_score              numeric,
  risk_level                  text,
  created_by                  uuid NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_use_cases_board ON public.ai_use_cases(board_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_use_cases TO authenticated;
GRANT ALL ON public.ai_use_cases TO service_role;
ALTER TABLE public.ai_use_cases ENABLE ROW LEVEL SECURITY;

-- Helper: user can access a use case via its board -> workspace
CREATE OR REPLACE FUNCTION public.user_can_access_use_case(_user_id uuid, _use_case_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ai_use_cases uc
    JOIN public.use_case_boards b ON b.id = uc.board_id
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE uc.id = _use_case_id
      AND w.organization_id = public.user_org_id(_user_id)
  )
$$;

CREATE POLICY "Members read board use cases"
  ON public.ai_use_cases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_case_boards b
                 WHERE b.id = ai_use_cases.board_id
                   AND public.user_in_workspace(auth.uid(), b.workspace_id))
         OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Members create board use cases"
  ON public.ai_use_cases FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
              AND EXISTS (SELECT 1 FROM public.use_case_boards b
                          WHERE b.id = board_id
                            AND public.user_in_workspace(auth.uid(), b.workspace_id)));

CREATE POLICY "Members update board use cases"
  ON public.ai_use_cases FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_case_boards b
                 WHERE b.id = ai_use_cases.board_id
                   AND public.user_in_workspace(auth.uid(), b.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.use_case_boards b
                      WHERE b.id = ai_use_cases.board_id
                        AND public.user_in_workspace(auth.uid(), b.workspace_id)));

CREATE POLICY "Members delete board use cases"
  ON public.ai_use_cases FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_case_boards b
                 WHERE b.id = ai_use_cases.board_id
                   AND public.user_in_workspace(auth.uid(), b.workspace_id)));

-- Generic child-table policy generator for tables keyed by use_case_id
-- 6. FEASIBILITY_SCORES -------------------------------------------
CREATE TABLE public.feasibility_scores (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id           uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  desirability_score    numeric,
  viability_score       numeric,
  feasibility_score     numeric,
  governability_score   numeric,
  sustainability_score  numeric,
  total_score           numeric,
  recommendation        text, -- pursue | refine | hold | reject
  notes                 text,
  created_by            uuid NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feasibility_uc ON public.feasibility_scores(use_case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feasibility_scores TO authenticated;
GRANT ALL ON public.feasibility_scores TO service_role;
ALTER TABLE public.feasibility_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access feasibility"
  ON public.feasibility_scores FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));

-- 7. DATA_READINESS_ASSESSMENTS ------------------------------------
CREATE TABLE public.data_readiness_assessments (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id                     uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  data_availability_score         numeric,
  data_quality_score              numeric,
  data_accessibility_score        numeric,
  privacy_exposure_score          numeric,
  bias_risk_score                 numeric,
  ownership_clarity_score         numeric,
  overall_data_readiness_score    numeric,
  missing_data_gaps               jsonb DEFAULT '[]'::jsonb,
  mitigation_recommendations      jsonb DEFAULT '[]'::jsonb,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_data_readiness_uc ON public.data_readiness_assessments(use_case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_readiness_assessments TO authenticated;
GRANT ALL ON public.data_readiness_assessments TO service_role;
ALTER TABLE public.data_readiness_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access data readiness"
  ON public.data_readiness_assessments FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));

-- 8. BLUEPRINTS ----------------------------------------------------
CREATE TABLE public.blueprints (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id            uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  executive_summary      text,
  business_case          text,
  technical_scope        text,
  data_requirements      text,
  model_approach         text,
  risk_summary           text,
  governance_controls    text,
  implementation_roadmap text,
  budget_assumptions     text,
  success_metrics        text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blueprints_uc ON public.blueprints(use_case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprints TO authenticated;
GRANT ALL ON public.blueprints TO service_role;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access blueprints"
  ON public.blueprints FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));

-- 9. INTEGRATION_LINKS --------------------------------------------
CREATE TABLE public.integration_links (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id           uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  integration_type      text NOT NULL, -- SARPI | AdvisorX | C3G
  external_reference_id text,
  status                text,
  metadata              jsonb DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_integration_links_uc ON public.integration_links(use_case_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_links TO authenticated;
GRANT ALL ON public.integration_links TO service_role;
ALTER TABLE public.integration_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access integration links"
  ON public.integration_links FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));

-- 10. AUDIT_EVENTS -------------------------------------------------
CREATE TABLE public.audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid,
  entity_type     text NOT NULL,
  entity_id       uuid,
  event_type      text NOT NULL,
  previous_value  jsonb,
  new_value       jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_events(entity_type, entity_id);
GRANT INSERT ON public.audit_events TO authenticated;
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authed users log audit"
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "Admin tier reads audit"
  ON public.audit_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()) OR actor_id = auth.uid());

-- ----- updated_at triggers ---------------------------------------
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_patterns_updated BEFORE UPDATE ON public.use_case_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_boards_updated BEFORE UPDATE ON public.use_case_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_aiusecases_updated BEFORE UPDATE ON public.ai_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_feasibility_updated BEFORE UPDATE ON public.feasibility_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_data_readiness_updated BEFORE UPDATE ON public.data_readiness_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_blueprints_updated BEFORE UPDATE ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_integration_links_updated BEFORE UPDATE ON public.integration_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();