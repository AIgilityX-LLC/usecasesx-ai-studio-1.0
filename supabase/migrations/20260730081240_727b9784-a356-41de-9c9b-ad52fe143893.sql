ALTER TABLE public.ai_use_cases
  ADD COLUMN IF NOT EXISTS wizard_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_step text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS contributors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.use_case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  organization_id uuid,
  workspace_id uuid,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (use_case_id, version)
);

CREATE INDEX IF NOT EXISTS use_case_versions_use_case_idx
  ON public.use_case_versions (use_case_id, version DESC);

GRANT SELECT, INSERT ON public.use_case_versions TO authenticated;
GRANT ALL ON public.use_case_versions TO service_role;

ALTER TABLE public.use_case_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read use case versions"
  ON public.use_case_versions FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id)
  );

CREATE POLICY "Workspace members can create use case versions"
  ON public.use_case_versions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IS NOT NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

CREATE TRIGGER sync_use_case_versions_tenancy
  BEFORE INSERT ON public.use_case_versions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();