-- V2-05 — Evidence, provenance and audit foundation (additive)
-- Creates evidence_items as the reusable SoR for Canvas, scores, reviews,
-- value actuals and exports. Existing benefit-evidence JSON and workshop
-- canvas documents remain; this table does not rename them.

-- ---------------------------------------------------------------------------
-- 1. evidence_items
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  workspace_id uuid NOT NULL,
  -- Polymorphic subject (use_case | opportunity | canvas_section | score |
  -- review | benefit | export | workshop)
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  -- Optional bind to an immutable business version (use_case_versions /
  -- opportunity_versions id). Nullable for live drafts.
  record_version_id uuid,
  kind text NOT NULL,
  label text NOT NULL,
  url text,
  note text,
  storage_path text,
  mime_type text,
  size_bytes integer,
  source text,
  owner_user_id uuid,
  owner_label text,
  collected_at date,
  reviewed_at date,
  confidentiality text NOT NULL DEFAULT 'internal',
  applicable_fields text[] NOT NULL DEFAULT '{}',
  integrity_hash text,
  retention_label text,
  -- Indicators: active | stale | missing | conflict | revoked
  status text NOT NULL DEFAULT 'active',
  status_note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT evidence_items_kind_check
    CHECK (kind IN ('link', 'note', 'file')),
  CONSTRAINT evidence_items_subject_type_check
    CHECK (subject_type IN (
      'use_case', 'opportunity', 'canvas_section', 'score',
      'review', 'benefit', 'export', 'workshop'
    )),
  CONSTRAINT evidence_items_confidentiality_check
    CHECK (confidentiality IN ('public', 'internal', 'confidential', 'restricted')),
  CONSTRAINT evidence_items_status_check
    CHECK (status IN ('active', 'stale', 'missing', 'conflict', 'revoked')),
  CONSTRAINT evidence_items_kind_payload_check
    CHECK (
      (kind = 'link' AND url IS NOT NULL AND storage_path IS NULL)
      OR (kind = 'note' AND note IS NOT NULL AND storage_path IS NULL)
      OR (kind = 'file' AND storage_path IS NOT NULL)
    ),
  CONSTRAINT evidence_items_label_len CHECK (char_length(label) BETWEEN 1 AND 200),
  CONSTRAINT evidence_items_url_https CHECK (
    url IS NULL OR url ~* '^https?://'
  )
);

CREATE INDEX IF NOT EXISTS evidence_items_workspace_idx
  ON public.evidence_items (workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS evidence_items_subject_idx
  ON public.evidence_items (subject_type, subject_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS evidence_items_status_idx
  ON public.evidence_items (workspace_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS evidence_items_version_idx
  ON public.evidence_items (record_version_id)
  WHERE record_version_id IS NOT NULL AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_evidence_items_tenant_integrity ON public.evidence_items;
CREATE TRIGGER trg_evidence_items_tenant_integrity
  BEFORE INSERT OR UPDATE ON public.evidence_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_evidence_items_updated ON public.evidence_items;
CREATE TRIGGER trg_evidence_items_updated
  BEFORE UPDATE ON public.evidence_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read evidence" ON public.evidence_items;
CREATE POLICY "Workspace members read evidence"
  ON public.evidence_items FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors insert evidence" ON public.evidence_items;
CREATE POLICY "Workspace editors insert evidence"
  ON public.evidence_items FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.workspace_can_edit(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors update evidence" ON public.evidence_items;
CREATE POLICY "Workspace editors update evidence"
  ON public.evidence_items FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

-- No hard DELETE for members — soft-delete via UPDATE deleted_at / status=revoked.

GRANT SELECT, INSERT, UPDATE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Storage bucket — workspace-scoped evidence files
--    Path: evidence-items/{workspace_id}/{subject_type}/{subject_id}/{file}
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-items',
  'evidence-items',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "evidence items read workspace" ON storage.objects;
CREATE POLICY "evidence items read workspace"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidence-items'
    AND public.user_in_workspace(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "evidence items insert workspace" ON storage.objects;
CREATE POLICY "evidence items insert workspace"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence-items'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "evidence items update workspace" ON storage.objects;
CREATE POLICY "evidence items update workspace"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'evidence-items'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'evidence-items'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "evidence items delete workspace" ON storage.objects;
CREATE POLICY "evidence items delete workspace"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'evidence-items'
    AND public.workspace_can_edit(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
