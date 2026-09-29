-- V2-04 — Versioned core data model (additive only)
-- Wave W1: adapt use_case_versions + opportunities; add opportunity_versions,
-- use_case_canvas_sections, lifecycle_status / soft-delete columns, tenant integrity,
-- immutable version triggers, studio-canvas storage path policies.
--
-- Pattern: ADD (nullable) → BACKFILL → VALIDATE (report) → ENFORCE later (not this file).
-- Do NOT create parallel v2_* renames. Deferred: evidence_items (V2-05), scorecard_versions
-- (V2-09), decisions (V2-10), value_contracts (V2-13), agents/data_assets/vendors (V2-08).

-- ---------------------------------------------------------------------------
-- 1. Shared helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_workspace_org_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NOT NULL AND NEW.organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.workspaces w
      WHERE w.id = NEW.workspace_id
        AND w.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Tenant integrity violation: workspace % does not belong to organization %',
        NEW.workspace_id, NEW.organization_id;
    END IF;
  END IF;

  -- Prefer deriving organization from workspace when only workspace is set.
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_workspace_org_match() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_workspace_org_match() TO authenticated, service_role;

-- Append-only versions: reject UPDATE/DELETE of identity + snapshot payload.
CREATE OR REPLACE FUNCTION public.prevent_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Immutable version rows cannot be deleted';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR (TG_TABLE_NAME = 'use_case_versions' AND NEW.use_case_id IS DISTINCT FROM OLD.use_case_id)
     OR (TG_TABLE_NAME = 'opportunity_versions' AND NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id)
  THEN
    RAISE EXCEPTION 'Immutable version fields cannot be updated';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_version_mutation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_version_mutation() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_tenancy_from_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL OR NEW.organization_id IS NULL THEN
    SELECT o.workspace_id, o.organization_id
      INTO NEW.workspace_id, NEW.organization_id
    FROM public.opportunities o
    WHERE o.id = NEW.opportunity_id;
  END IF;
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_tenancy_from_opportunity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_tenancy_from_opportunity() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Adapt ai_use_cases / opportunities / use_case_versions
-- ---------------------------------------------------------------------------

ALTER TABLE public.ai_use_cases
  ADD COLUMN IF NOT EXISTS lifecycle_status text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_version_id uuid;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS lifecycle_status text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_version_id uuid;

ALTER TABLE public.use_case_versions
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Soft-delete index helpers (partial — only deleted rows / active filters later)
CREATE INDEX IF NOT EXISTS ai_use_cases_lifecycle_status_idx
  ON public.ai_use_cases (workspace_id, lifecycle_status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS opportunities_lifecycle_status_idx
  ON public.opportunities (workspace_id, lifecycle_status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ai_use_cases_deleted_at_idx
  ON public.ai_use_cases (deleted_at)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS opportunities_deleted_at_idx
  ON public.opportunities (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Tenant integrity on existing Studio parents (INSERT/UPDATE)
DROP TRIGGER IF EXISTS trg_ai_use_cases_tenant_integrity ON public.ai_use_cases;
CREATE TRIGGER trg_ai_use_cases_tenant_integrity
  BEFORE INSERT OR UPDATE ON public.ai_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_opportunities_tenant_integrity ON public.opportunities;
CREATE TRIGGER trg_opportunities_tenant_integrity
  BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_use_case_versions_tenant_integrity ON public.use_case_versions;
CREATE TRIGGER trg_use_case_versions_tenant_integrity
  BEFORE INSERT OR UPDATE ON public.use_case_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_use_case_versions_immutable ON public.use_case_versions;
CREATE TRIGGER trg_use_case_versions_immutable
  BEFORE UPDATE OR DELETE ON public.use_case_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_version_mutation();

-- Kind check (nullable until backfill validates; enforce later with NOT NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'use_case_versions_kind_check'
  ) THEN
    ALTER TABLE public.use_case_versions
      ADD CONSTRAINT use_case_versions_kind_check
      CHECK (kind IS NULL OR kind IN ('draft', 'submitted', 'published'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. opportunity_versions (mirror of use_case_versions — proven missing)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.opportunity_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,
  version integer NOT NULL,
  kind text,
  label text,
  note text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  organization_id uuid,
  workspace_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (opportunity_id, version),
  CONSTRAINT opportunity_versions_kind_check
    CHECK (kind IS NULL OR kind IN ('draft', 'submitted', 'published'))
);

CREATE INDEX IF NOT EXISTS opportunity_versions_opportunity_idx
  ON public.opportunity_versions (opportunity_id, version DESC);
CREATE INDEX IF NOT EXISTS opportunity_versions_workspace_idx
  ON public.opportunity_versions (workspace_id)
  WHERE workspace_id IS NOT NULL;

DROP TRIGGER IF EXISTS sync_opportunity_versions_tenancy ON public.opportunity_versions;
CREATE TRIGGER sync_opportunity_versions_tenancy
  BEFORE INSERT ON public.opportunity_versions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_opportunity();

DROP TRIGGER IF EXISTS trg_opportunity_versions_tenant_integrity ON public.opportunity_versions;
CREATE TRIGGER trg_opportunity_versions_tenant_integrity
  BEFORE INSERT OR UPDATE ON public.opportunity_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_opportunity_versions_immutable ON public.opportunity_versions;
CREATE TRIGGER trg_opportunity_versions_immutable
  BEFORE UPDATE OR DELETE ON public.opportunity_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_version_mutation();

ALTER TABLE public.opportunity_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can read opportunity versions" ON public.opportunity_versions;
CREATE POLICY "Workspace members can read opportunity versions"
  ON public.opportunity_versions FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace members can create opportunity versions" ON public.opportunity_versions;
CREATE POLICY "Workspace members can create opportunity versions"
  ON public.opportunity_versions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IS NOT NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );
-- No UPDATE/DELETE policies — immutability + trigger.

GRANT SELECT, INSERT ON public.opportunity_versions TO authenticated;
GRANT ALL ON public.opportunity_versions TO service_role;

-- ---------------------------------------------------------------------------
-- 4. use_case_canvas_sections (Studio Canvas V2 storage — proven missing)
--    Workshop canvas tables are ADAPTED as-is (no parallel rename).
--    version_id NULL = live draft row; non-null = snapshot bound to immutable version.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.use_case_canvas_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases (id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.use_case_versions (id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text,
  confidence text,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  organization_id uuid,
  workspace_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT use_case_canvas_sections_key_check
    CHECK (section_key ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT use_case_canvas_sections_confidence_check
    CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high'))
);

-- One live draft per section; one snapshot copy per version+section.
CREATE UNIQUE INDEX IF NOT EXISTS use_case_canvas_sections_draft_uniq
  ON public.use_case_canvas_sections (use_case_id, section_key)
  WHERE version_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS use_case_canvas_sections_version_uniq
  ON public.use_case_canvas_sections (use_case_id, version_id, section_key)
  WHERE version_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS use_case_canvas_sections_workspace_idx
  ON public.use_case_canvas_sections (workspace_id)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS sync_canvas_sections_tenancy ON public.use_case_canvas_sections;
CREATE TRIGGER sync_canvas_sections_tenancy
  BEFORE INSERT ON public.use_case_canvas_sections
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();

DROP TRIGGER IF EXISTS trg_canvas_sections_tenant_integrity ON public.use_case_canvas_sections;
CREATE TRIGGER trg_canvas_sections_tenant_integrity
  BEFORE INSERT OR UPDATE ON public.use_case_canvas_sections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_canvas_sections_updated ON public.use_case_canvas_sections;
CREATE TRIGGER trg_canvas_sections_updated
  BEFORE UPDATE ON public.use_case_canvas_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.use_case_canvas_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read canvas sections" ON public.use_case_canvas_sections;
CREATE POLICY "Workspace members read canvas sections"
  ON public.use_case_canvas_sections FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND workspace_id IS NOT NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors insert canvas sections" ON public.use_case_canvas_sections;
CREATE POLICY "Workspace editors insert canvas sections"
  ON public.use_case_canvas_sections FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IS NOT NULL
    AND public.workspace_can_edit(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors update canvas sections" ON public.use_case_canvas_sections;
CREATE POLICY "Workspace editors update canvas sections"
  ON public.use_case_canvas_sections FOR UPDATE TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_can_edit(auth.uid(), workspace_id)
  )
  WITH CHECK (
    workspace_id IS NOT NULL
    AND public.workspace_can_edit(auth.uid(), workspace_id)
  );

-- Soft delete = UPDATE deleted_at (no hard DELETE grant for members).
GRANT SELECT, INSERT, UPDATE ON public.use_case_canvas_sections TO authenticated;
GRANT ALL ON public.use_case_canvas_sections TO service_role;

-- Optional FK from parents to current version (added after both tables exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_use_cases_current_version_id_fkey'
  ) THEN
    ALTER TABLE public.ai_use_cases
      ADD CONSTRAINT ai_use_cases_current_version_id_fkey
      FOREIGN KEY (current_version_id) REFERENCES public.use_case_versions (id)
      ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opportunities_current_version_id_fkey'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_current_version_id_fkey
      FOREIGN KEY (current_version_id) REFERENCES public.opportunity_versions (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Storage path policies for Studio canvas attachments
--    Path: studio-canvas/{workspace_id}/{use_case_id}/...
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-canvas',
  'studio-canvas',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "studio canvas read workspace" ON storage.objects;
CREATE POLICY "studio canvas read workspace"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'studio-canvas'
    AND public.user_in_workspace(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "studio canvas insert workspace" ON storage.objects;
CREATE POLICY "studio canvas insert workspace"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'studio-canvas'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "studio canvas update workspace" ON storage.objects;
CREATE POLICY "studio canvas update workspace"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'studio-canvas'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'studio-canvas'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "studio canvas delete workspace" ON storage.objects;
CREATE POLICY "studio canvas delete workspace"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'studio-canvas'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- 6. Backfill (nullable columns only — no NOT NULL enforcement yet)
-- ---------------------------------------------------------------------------

-- Lifecycle map (matches src/lib/lifecycle/map.ts). Unmapped domain statuses stay NULL.
UPDATE public.ai_use_cases u
SET lifecycle_status = CASE lower(u.status)
  WHEN 'idea' THEN 'idea'
  WHEN 'in_design' THEN 'designing'
  WHEN 'defined' THEN 'review_ready'
  WHEN 'draft' THEN 'designing'
  WHEN 'review' THEN 'under_review'
  WHEN 'submitted_for_review' THEN 'under_review'
  WHEN 'approved' THEN 'approved_pilot'
  WHEN 'published' THEN 'production'
  WHEN 'unpublished' THEN 'on_hold'
  WHEN 'archived' THEN 'archived'
  ELSE u.lifecycle_status
END
WHERE u.lifecycle_status IS NULL;

UPDATE public.opportunities o
SET lifecycle_status = CASE o.status::text
  WHEN 'signal' THEN 'idea'
  WHEN 'opportunity' THEN 'triage'
  WHEN 'qualified' THEN 'designing'
  WHEN 'converted' THEN 'designing'
  WHEN 'deferred' THEN 'on_hold'
  WHEN 'archived' THEN 'archived'
  ELSE o.lifecycle_status
END
WHERE o.lifecycle_status IS NULL;

-- Tenancy backfill on existing version rows
UPDATE public.use_case_versions v
SET
  workspace_id = COALESCE(v.workspace_id, u.workspace_id),
  organization_id = COALESCE(v.organization_id, u.organization_id, public.workspace_org(COALESCE(v.workspace_id, u.workspace_id)))
FROM public.ai_use_cases u
WHERE v.use_case_id = u.id
  AND (v.workspace_id IS NULL OR v.organization_id IS NULL);

UPDATE public.use_case_versions
SET kind = COALESCE(kind, 'submitted')
WHERE kind IS NULL;

-- Point current_version_id at latest version when missing
UPDATE public.ai_use_cases u
SET current_version_id = (
  SELECT v.id
  FROM public.use_case_versions v
  WHERE v.use_case_id = u.id
  ORDER BY v.version DESC
  LIMIT 1
)
WHERE u.current_version_id IS NULL
  AND EXISTS (SELECT 1 FROM public.use_case_versions v WHERE v.use_case_id = u.id);

-- Seed one published-style opportunity snapshot for existing rows (idempotent version=1)
INSERT INTO public.opportunity_versions (
  opportunity_id, version, kind, label, note, snapshot, organization_id, workspace_id, created_by, published_at
)
SELECT
  o.id,
  1,
  'submitted',
  'Initial capture',
  'V2-04 backfill snapshot',
  to_jsonb(o) - 'ai_suggestions',
  o.organization_id,
  o.workspace_id,
  o.created_by,
  NULL
FROM public.opportunities o
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_versions ov WHERE ov.opportunity_id = o.id AND ov.version = 1
);

UPDATE public.opportunities o
SET current_version_id = (
  SELECT v.id FROM public.opportunity_versions v
  WHERE v.opportunity_id = o.id
  ORDER BY v.version DESC
  LIMIT 1
)
WHERE o.current_version_id IS NULL
  AND EXISTS (SELECT 1 FROM public.opportunity_versions v WHERE v.opportunity_id = o.id);
