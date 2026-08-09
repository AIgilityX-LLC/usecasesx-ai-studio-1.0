CREATE TABLE public.suite_handoff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid,
  target text NOT NULL CHECK (target IN ('sarpi','sarn_c3g','advisorx','human_advisory')),
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','in_review','accepted','dispatched','completed','declined','cancelled')),
  delivery_mode text NOT NULL DEFAULT 'internal_queue'
    CHECK (delivery_mode IN ('internal_queue','endpoint')),
  title text NOT NULL,
  summary text,
  requested_by uuid NOT NULL,
  owner_user_id uuid,
  subject_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_version jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity text NOT NULL DEFAULT 'internal'
    CHECK (sensitivity IN ('internal','confidential','restricted')),
  status_note text,
  dispatched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suite_handoffs_ws ON public.suite_handoff_requests (workspace_id, created_at DESC);
CREATE INDEX idx_suite_handoffs_status ON public.suite_handoff_requests (status, target);
CREATE INDEX idx_suite_handoffs_requester ON public.suite_handoff_requests (requested_by);

GRANT SELECT, INSERT, UPDATE ON public.suite_handoff_requests TO authenticated;
GRANT ALL ON public.suite_handoff_requests TO service_role;

ALTER TABLE public.suite_handoff_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read handoff requests"
  ON public.suite_handoff_requests FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Workspace editors raise handoff requests"
  ON public.suite_handoff_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND public.workspace_can_edit(auth.uid(), workspace_id)
  );

CREATE POLICY "Managers and owners update handoff requests"
  ON public.suite_handoff_requests FOR UPDATE TO authenticated
  USING (
    public.workspace_can_manage(auth.uid(), workspace_id)
    OR requested_by = auth.uid()
    OR owner_user_id = auth.uid()
    OR public.is_admin_tier(auth.uid())
  )
  WITH CHECK (
    public.workspace_can_manage(auth.uid(), workspace_id)
    OR requested_by = auth.uid()
    OR owner_user_id = auth.uid()
    OR public.is_admin_tier(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.sync_handoff_tenancy()
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

CREATE TRIGGER trg_suite_handoffs_tenancy
  BEFORE INSERT ON public.suite_handoff_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_handoff_tenancy();

CREATE TRIGGER trg_suite_handoffs_updated
  BEFORE UPDATE ON public.suite_handoff_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();