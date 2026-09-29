-- V2-11 — Governance applicability preview (additive)
-- Informational facts + mapped themes for Canvas; CyberX handoff metadata.
-- Authoritative risk/assurance remains in CyberX after consented handoff.

CREATE TABLE IF NOT EXISTS public.use_case_governance_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases (id) ON DELETE CASCADE,
  organization_id uuid,
  workspace_id uuid NOT NULL,
  -- FR-07 fact capture
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Mapped themes snapshot (recomputed on save; versioned via content_pack_*)
  mappings jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_pack_version text NOT NULL,
  content_pack_date date NOT NULL,
  content_pack_source text NOT NULL,
  -- Last CyberX handoff attempt (honest delivery status)
  handoff_delivery_status text NOT NULL DEFAULT 'not_attempted',
  handoff_request_id uuid,
  package_integrity_hash text,
  package_generated_at timestamptz,
  package_json jsonb,
  consent jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT use_case_governance_previews_use_case_unique UNIQUE (use_case_id),
  CONSTRAINT use_case_governance_previews_delivery_check
    CHECK (handoff_delivery_status IN (
      'not_attempted', 'endpoint_unavailable', 'package_ready',
      'queued', 'endpoint_delivered'
    ))
);

CREATE INDEX IF NOT EXISTS use_case_governance_previews_workspace_idx
  ON public.use_case_governance_previews (workspace_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_use_case_governance_previews_tenant ON public.use_case_governance_previews;
CREATE TRIGGER trg_use_case_governance_previews_tenant
  BEFORE INSERT OR UPDATE ON public.use_case_governance_previews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_use_case_governance_previews_updated ON public.use_case_governance_previews;
CREATE TRIGGER trg_use_case_governance_previews_updated
  BEFORE UPDATE ON public.use_case_governance_previews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.use_case_governance_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read governance previews" ON public.use_case_governance_previews;
CREATE POLICY "Workspace members read governance previews"
  ON public.use_case_governance_previews FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors insert governance previews" ON public.use_case_governance_previews;
CREATE POLICY "Workspace editors insert governance previews"
  ON public.use_case_governance_previews FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors update governance previews" ON public.use_case_governance_previews;
CREATE POLICY "Workspace editors update governance previews"
  ON public.use_case_governance_previews FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

GRANT SELECT, INSERT, UPDATE ON public.use_case_governance_previews TO authenticated;
GRANT ALL ON public.use_case_governance_previews TO service_role;

COMMENT ON TABLE public.use_case_governance_previews IS
  'FR-07 informational governance readiness preview. Not legal advice. CyberX owns authoritative records after consented handoff.';
