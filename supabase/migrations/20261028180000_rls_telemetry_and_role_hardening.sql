-- Additive RLS hardening (enterprise readiness).
-- Owner applies to TEST project first. Do NOT run against production from agents.
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY. No table/column drops.

-- ---------------------------------------------------------------------------
-- 1. user_roles — only super_admin may INSERT / UPDATE / DELETE
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins manage roles" ON public.user_roles;

CREATE POLICY "Super admins manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Keep self-read (if present from prior migrations).
DROP POLICY IF EXISTS "Users view their own roles" ON public.user_roles;
CREATE POLICY "Users view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. use_case_views — no unrestricted insert; anon may log with null user_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone log view" ON public.use_case_views;
DROP POLICY IF EXISTS "Log own view" ON public.use_case_views;

CREATE POLICY "Log own view"
  ON public.use_case_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 3. use_case_downloads — same pattern
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone log download" ON public.use_case_downloads;
DROP POLICY IF EXISTS "Log own download" ON public.use_case_downloads;

CREATE POLICY "Log own download"
  ON public.use_case_downloads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 4. integration_events — authenticated only; user_id must match caller
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone log integration event" ON public.integration_events;
DROP POLICY IF EXISTS "Log own integration event" ON public.integration_events;

CREATE POLICY "Log own integration event"
  ON public.integration_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Super admins manage roles" ON public.user_roles IS
  'Enterprise readiness: role grants restricted to super_admin.';
COMMENT ON POLICY "Log own view" ON public.use_case_views IS
  'Telemetry insert: user_id IS NULL (anon) OR user_id = auth.uid().';
