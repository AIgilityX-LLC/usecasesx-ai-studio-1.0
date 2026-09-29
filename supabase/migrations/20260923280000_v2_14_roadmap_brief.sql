-- V2-14 — Roadmap gate/status + versioned implementation brief (additive)
-- Roadmap remains a view over portfolio_items; brief is a versioned delivery artifact.

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS gate_key text,
  ADD COLUMN IF NOT EXISTS roadmap_status text NOT NULL DEFAULT 'planned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_items_gate_key_check'
  ) THEN
    ALTER TABLE public.portfolio_items
      ADD CONSTRAINT portfolio_items_gate_key_check
      CHECK (
        gate_key IS NULL OR gate_key IN (
          'intake', 'discovery_complete', 'investment_review',
          'pilot_authorization', 'scale_authorization', 'retirement_review'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_items_roadmap_status_check'
  ) THEN
    ALTER TABLE public.portfolio_items
      ADD CONSTRAINT portfolio_items_roadmap_status_check
      CHECK (roadmap_status IN (
        'planned', 'in_progress', 'blocked', 'at_risk', 'complete', 'deferred'
      ));
  END IF;
END $$;

COMMENT ON COLUMN public.portfolio_items.gate_key IS
  'FR-10 linked decision gate (informational pointer; authority stays on decision_gate_*).';
COMMENT ON COLUMN public.portfolio_items.roadmap_status IS
  'FR-10 delivery status on the roadmap membership (distinct from portfolio decision).';

CREATE TABLE IF NOT EXISTS public.implementation_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL,
  portfolio_id uuid REFERENCES public.portfolios (id) ON DELETE SET NULL,
  organization_id uuid,
  workspace_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  title text NOT NULL DEFAULT 'Implementation brief',
  outcomes text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT '',
  assumptions text NOT NULL DEFAULT '',
  architecture text NOT NULL DEFAULT '',
  data_needs text NOT NULL DEFAULT '',
  human_controls text NOT NULL DEFAULT '',
  measures text NOT NULL DEFAULT '',
  acceptance_criteria text NOT NULL DEFAULT '',
  handoff_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  record_version text,
  scoring_version text,
  published_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT implementation_briefs_status_check
    CHECK (status IN ('draft', 'published')),
  CONSTRAINT implementation_briefs_version_positive
    CHECK (version >= 1),
  CONSTRAINT implementation_briefs_use_case_version_unique
    UNIQUE (use_case_id, version)
);

CREATE INDEX IF NOT EXISTS implementation_briefs_workspace_idx
  ON public.implementation_briefs (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS implementation_briefs_use_case_idx
  ON public.implementation_briefs (use_case_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_implementation_briefs_tenant ON public.implementation_briefs;
CREATE TRIGGER trg_implementation_briefs_tenant
  BEFORE INSERT OR UPDATE ON public.implementation_briefs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_implementation_briefs_updated ON public.implementation_briefs;
CREATE TRIGGER trg_implementation_briefs_updated
  BEFORE UPDATE ON public.implementation_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Published briefs are immutable (content columns only).
CREATE OR REPLACE FUNCTION public.prevent_published_brief_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status = 'published' THEN
    IF NEW.outcomes IS DISTINCT FROM OLD.outcomes
      OR NEW.scope IS DISTINCT FROM OLD.scope
      OR NEW.assumptions IS DISTINCT FROM OLD.assumptions
      OR NEW.architecture IS DISTINCT FROM OLD.architecture
      OR NEW.data_needs IS DISTINCT FROM OLD.data_needs
      OR NEW.human_controls IS DISTINCT FROM OLD.human_controls
      OR NEW.measures IS DISTINCT FROM OLD.measures
      OR NEW.acceptance_criteria IS DISTINCT FROM OLD.acceptance_criteria
      OR NEW.handoff_links IS DISTINCT FROM OLD.handoff_links
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.version IS DISTINCT FROM OLD.version
    THEN
      RAISE EXCEPTION 'Published implementation briefs are immutable; clone a new draft version.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_implementation_briefs_immutable ON public.implementation_briefs;
CREATE TRIGGER trg_implementation_briefs_immutable
  BEFORE UPDATE ON public.implementation_briefs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_published_brief_mutation();

ALTER TABLE public.implementation_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read implementation briefs" ON public.implementation_briefs;
CREATE POLICY "Workspace members read implementation briefs"
  ON public.implementation_briefs FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors insert implementation briefs" ON public.implementation_briefs;
CREATE POLICY "Workspace editors insert implementation briefs"
  ON public.implementation_briefs FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors update implementation briefs" ON public.implementation_briefs;
CREATE POLICY "Workspace editors update implementation briefs"
  ON public.implementation_briefs FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

GRANT SELECT, INSERT, UPDATE ON public.implementation_briefs TO authenticated;
GRANT ALL ON public.implementation_briefs TO service_role;

COMMENT ON TABLE public.implementation_briefs IS
  'FR-10 versioned implementation brief for delivery handoff. Published rows are immutable.';
