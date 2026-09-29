-- V2-08 — Agentic and AI System Designer (additive)
-- One solution-design record per Studio use case. Agentic control fields are
-- nullable for non-agentic types; Pilot Authorization readiness is enforced
-- in application logic (action limits, human checkpoints, kill switch).

CREATE TABLE IF NOT EXISTS public.use_case_solution_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases (id) ON DELETE CASCADE,
  organization_id uuid,
  workspace_id uuid NOT NULL,
  -- Core solution classification (FR-04)
  solution_type text,
  modality_notes text,
  model_options text,
  tool_options text,
  vendor_options text,
  build_buy_partner text,
  human_role text,
  autonomy_level text,
  -- Agentic workflow (required for readiness when solution_type is agentic)
  agent_goal text,
  planning_method text,
  tools_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  identities_credentials text,
  memory text,
  knowledge_sources text,
  delegation text,
  human_checkpoints text,
  action_limits text,
  transaction_limits text,
  sandbox text,
  kill_switch text,
  observability text,
  fallback text,
  -- Per-field confirmation: { fieldKey: { status: confirmed|ai_draft|missing, note? } }
  field_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- OWASP GenAI prompt responses keyed by catalogue id (configurable prompts, not legal conclusions)
  owasp_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT use_case_solution_designs_use_case_unique UNIQUE (use_case_id),
  CONSTRAINT use_case_solution_designs_solution_type_check
    CHECK (
      solution_type IS NULL OR solution_type IN (
        'analytics', 'predictive_ml', 'generative_ai', 'assistant_copilot',
        'rag', 'computer_vision', 'speech', 'optimization', 'automation',
        'agentic_workflow', 'robotics', 'hybrid', 'undecided'
      )
    ),
  CONSTRAINT use_case_solution_designs_build_buy_check
    CHECK (
      build_buy_partner IS NULL OR build_buy_partner IN (
        'build', 'buy', 'partner', 'hybrid', 'undecided'
      )
    ),
  CONSTRAINT use_case_solution_designs_autonomy_check
    CHECK (
      autonomy_level IS NULL OR autonomy_level IN (
        'advisory_only', 'human_in_the_loop', 'human_on_the_loop',
        'bounded_autonomous', 'undecided'
      )
    )
);

CREATE INDEX IF NOT EXISTS use_case_solution_designs_workspace_idx
  ON public.use_case_solution_designs (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS use_case_solution_designs_type_idx
  ON public.use_case_solution_designs (workspace_id, solution_type)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_use_case_solution_designs_tenant ON public.use_case_solution_designs;
CREATE TRIGGER trg_use_case_solution_designs_tenant
  BEFORE INSERT OR UPDATE ON public.use_case_solution_designs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_use_case_solution_designs_updated ON public.use_case_solution_designs;
CREATE TRIGGER trg_use_case_solution_designs_updated
  BEFORE UPDATE ON public.use_case_solution_designs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.use_case_solution_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read solution designs" ON public.use_case_solution_designs;
CREATE POLICY "Workspace members read solution designs"
  ON public.use_case_solution_designs FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors insert solution designs" ON public.use_case_solution_designs;
CREATE POLICY "Workspace editors insert solution designs"
  ON public.use_case_solution_designs FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors update solution designs" ON public.use_case_solution_designs;
CREATE POLICY "Workspace editors update solution designs"
  ON public.use_case_solution_designs FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors soft-delete solution designs" ON public.use_case_solution_designs;
CREATE POLICY "Workspace editors soft-delete solution designs"
  ON public.use_case_solution_designs FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

GRANT SELECT, INSERT, UPDATE ON public.use_case_solution_designs TO authenticated;
GRANT ALL ON public.use_case_solution_designs TO service_role;
