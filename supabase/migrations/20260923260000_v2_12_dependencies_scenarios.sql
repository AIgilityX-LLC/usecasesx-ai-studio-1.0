-- V2-12 — Portfolio dependencies and saved scenarios (additive)
-- Typed dependencies beyond portfolio_items.depends_on uuid[].
-- Scenarios adjust weights/budget/capacity/constraints without mutating baseline.

CREATE TABLE IF NOT EXISTS public.portfolio_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  organization_id uuid,
  workspace_id uuid NOT NULL,
  from_use_case_id uuid NOT NULL,
  dependency_type text NOT NULL,
  to_use_case_id uuid,
  label text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT portfolio_dependencies_type_check
    CHECK (dependency_type IN (
      'data', 'model', 'vendor', 'platform', 'integration',
      'policy', 'skills', 'prerequisite_use_case'
    )),
  CONSTRAINT portfolio_dependencies_label_len
    CHECK (char_length(label) BETWEEN 1 AND 200),
  CONSTRAINT portfolio_dependencies_prereq_check
    CHECK (
      dependency_type <> 'prerequisite_use_case'
      OR to_use_case_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS portfolio_dependencies_portfolio_idx
  ON public.portfolio_dependencies (portfolio_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS portfolio_dependencies_from_idx
  ON public.portfolio_dependencies (from_use_case_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.portfolio_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios (id) ON DELETE CASCADE,
  organization_id uuid,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  weights jsonb NOT NULL DEFAULT '{"value":1,"feasibility":1,"governability":1,"urgency":1}'::jsonb,
  budget numeric,
  capacity numeric,
  constraints_text text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT portfolio_scenarios_name_len
    CHECK (char_length(name) BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS portfolio_scenarios_portfolio_idx
  ON public.portfolio_scenarios (portfolio_id)
  WHERE deleted_at IS NULL;

-- Triggers
DROP TRIGGER IF EXISTS trg_portfolio_dependencies_tenant ON public.portfolio_dependencies;
CREATE TRIGGER trg_portfolio_dependencies_tenant
  BEFORE INSERT OR UPDATE ON public.portfolio_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_portfolio_dependencies_updated ON public.portfolio_dependencies;
CREATE TRIGGER trg_portfolio_dependencies_updated
  BEFORE UPDATE ON public.portfolio_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_portfolio_scenarios_tenant ON public.portfolio_scenarios;
CREATE TRIGGER trg_portfolio_scenarios_tenant
  BEFORE INSERT OR UPDATE ON public.portfolio_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_portfolio_scenarios_updated ON public.portfolio_scenarios;
CREATE TRIGGER trg_portfolio_scenarios_updated
  BEFORE UPDATE ON public.portfolio_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.portfolio_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read portfolio dependencies" ON public.portfolio_dependencies;
CREATE POLICY "Workspace members read portfolio dependencies"
  ON public.portfolio_dependencies FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors write portfolio dependencies" ON public.portfolio_dependencies;
CREATE POLICY "Workspace editors write portfolio dependencies"
  ON public.portfolio_dependencies FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors update portfolio dependencies" ON public.portfolio_dependencies;
CREATE POLICY "Workspace editors update portfolio dependencies"
  ON public.portfolio_dependencies FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace members read portfolio scenarios" ON public.portfolio_scenarios;
CREATE POLICY "Workspace members read portfolio scenarios"
  ON public.portfolio_scenarios FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors write portfolio scenarios" ON public.portfolio_scenarios;
CREATE POLICY "Workspace editors write portfolio scenarios"
  ON public.portfolio_scenarios FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors update portfolio scenarios" ON public.portfolio_scenarios;
CREATE POLICY "Workspace editors update portfolio scenarios"
  ON public.portfolio_scenarios FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

GRANT SELECT, INSERT, UPDATE ON public.portfolio_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.portfolio_scenarios TO authenticated;
GRANT ALL ON public.portfolio_dependencies TO service_role;
GRANT ALL ON public.portfolio_scenarios TO service_role;

COMMENT ON TABLE public.portfolio_dependencies IS
  'FR-09 typed portfolio dependencies (data/model/vendor/…). List-first; graph is derived.';
COMMENT ON TABLE public.portfolio_scenarios IS
  'FR-09 saved what-if scenarios. Never mutate portfolio_items / approved baseline.';
