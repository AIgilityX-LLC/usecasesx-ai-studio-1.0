
-- Visibility enum + column
DO $$ BEGIN
  CREATE TYPE public.use_case_visibility AS ENUM ('free_lite','pro','both','hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.use_cases
  ADD COLUMN IF NOT EXISTS visibility public.use_case_visibility NOT NULL DEFAULT 'both';

-- Admin workflow status (kept separate from publish lifecycle 'status' enum)
ALTER TABLE public.use_cases
  ADD COLUMN IF NOT EXISTS content_status text NOT NULL DEFAULT 'draft';

-- Audit log
CREATE TABLE IF NOT EXISTS public.use_case_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid,
  actor_id uuid,
  action text NOT NULL,
  detail text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.use_case_audit_log TO authenticated;
GRANT ALL ON public.use_case_audit_log TO service_role;

ALTER TABLE public.use_case_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log" ON public.use_case_audit_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')
    OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  );

CREATE POLICY "Admins insert audit log" ON public.use_case_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND (
      has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')
      OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
      OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
      OR has_role(auth.uid(),'reviewer')
    )
  );

CREATE INDEX IF NOT EXISTS idx_use_case_audit_log_use_case ON public.use_case_audit_log(use_case_id, created_at DESC);

-- Tighten public-read policy on use_cases to respect visibility
DROP POLICY IF EXISTS "Anyone reads published" ON public.use_cases;

CREATE POLICY "Public reads published free_lite"
  ON public.use_cases FOR SELECT TO anon, authenticated
  USING (status = 'published'::use_case_status AND visibility IN ('free_lite','both'));

CREATE POLICY "Authenticated reads pro"
  ON public.use_cases FOR SELECT TO authenticated
  USING (status = 'published'::use_case_status AND visibility = 'pro');

-- Allow admin-tier roles broader access on use_cases (in addition to existing admin/moderator)
CREATE POLICY "Admin-tier reads all use cases"
  ON public.use_cases FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  );

CREATE POLICY "Admin-tier inserts use cases"
  ON public.use_cases FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND (
      has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
      OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    )
  );

CREATE POLICY "Admin-tier updates use cases"
  ON public.use_cases FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  );

CREATE POLICY "Admin-tier deletes use cases"
  ON public.use_cases FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin'));

-- Index for visibility filter
CREATE INDEX IF NOT EXISTS idx_use_cases_visibility_status ON public.use_cases(status, visibility);
