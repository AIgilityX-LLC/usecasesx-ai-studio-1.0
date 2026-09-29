-- V2-18 — Enterprise identity, localization and sovereignty readiness (additive)
-- SSO/OIDC|SAML config + JIT domain policy · tenant residency/AI routes ·
-- support-access grants (no impersonation). SCIM deliberately omitted.

-- ---------------------------------------------------------------------------
-- 1. Tenant sovereignty policy on organizations
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS data_region text NOT NULL DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS allowed_ai_provider_routes jsonb NOT NULL DEFAULT '["default"]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'en';

DO $$ BEGIN
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_data_region_check
    CHECK (data_region IN (
      'unspecified', 'eu', 'us', 'me', 'apac', 'private', 'airgap_reserved'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_preferred_locale_check
    CHECK (preferred_locale IN ('en', 'ar'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.organizations.data_region IS
  'FR-18 declared data residency preference. Not an automatic infra move.';
COMMENT ON COLUMN public.organizations.allowed_ai_provider_routes IS
  'FR-18 allow-list of AI provider route keys (e.g. default, openai, gemini, local).';
COMMENT ON COLUMN public.organizations.preferred_locale IS
  'FR-18 preferred UI/report locale (en baseline, ar RTL).';

-- ---------------------------------------------------------------------------
-- 2. Per-organisation SSO / OIDC / SAML configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_sso_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  protocol text NOT NULL DEFAULT 'oidc',
  enabled boolean NOT NULL DEFAULT false,
  -- Domain allow-list for discovery + JIT (lowercase, no @)
  allowed_domains text[] NOT NULL DEFAULT '{}',
  jit_enabled boolean NOT NULL DEFAULT true,
  default_member_role text NOT NULL DEFAULT 'viewer',
  -- Provider wiring (Supabase Auth / IdP metadata — no secrets in plaintext columns)
  provider_slug text,
  metadata_url text,
  entity_id text,
  attribute_email_claim text NOT NULL DEFAULT 'email',
  attribute_name_claim text NOT NULL DEFAULT 'name',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT organization_sso_configs_org_unique UNIQUE (organization_id),
  CONSTRAINT organization_sso_configs_protocol_check
    CHECK (protocol IN ('oidc', 'saml')),
  CONSTRAINT organization_sso_configs_role_check
    CHECK (default_member_role IN ('owner', 'admin', 'contributor', 'viewer', 'facilitator'))
);

CREATE INDEX IF NOT EXISTS organization_sso_configs_domain_gin
  ON public.organization_sso_configs USING gin (allowed_domains)
  WHERE deleted_at IS NULL AND enabled = true;

DROP TRIGGER IF EXISTS trg_organization_sso_configs_updated ON public.organization_sso_configs;
CREATE TRIGGER trg_organization_sso_configs_updated
  BEFORE UPDATE ON public.organization_sso_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.organization_sso_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read SSO config" ON public.organization_sso_configs;
CREATE POLICY "Org members read SSO config"
  ON public.organization_sso_configs FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Org managers write SSO config" ON public.organization_sso_configs;
CREATE POLICY "Org managers write SSO config"
  ON public.organization_sso_configs FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_sso_configs.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_sso_configs.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

-- Anonymous / signed-out discovery needs a narrow service path; authenticated
-- users may also discover their own domain via server fn (service role).
GRANT SELECT, INSERT, UPDATE ON public.organization_sso_configs TO authenticated;
GRANT ALL ON public.organization_sso_configs TO service_role;

COMMENT ON TABLE public.organization_sso_configs IS
  'FR-18 / FR security: per-org OIDC or SAML config with domain allow-list and JIT. SCIM not provisioned.';

-- ---------------------------------------------------------------------------
-- 3. Support access / break-glass (explicit, time-bound, NO impersonation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  -- Support operator acts as themselves — never as the tenant user
  grantee_user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  reason text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_access_grants_window_check CHECK (ends_at > starts_at),
  CONSTRAINT support_access_grants_reason_len CHECK (char_length(reason) BETWEEN 8 AND 500)
);

CREATE INDEX IF NOT EXISTS support_access_grants_active_idx
  ON public.support_access_grants (grantee_user_id, workspace_id)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.has_support_access(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_access_grants g
    WHERE g.grantee_user_id = _user_id
      AND g.workspace_id = _workspace_id
      AND g.revoked_at IS NULL
      AND g.starts_at <= now()
      AND g.ends_at > now()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_support_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_support_access(uuid, uuid) TO authenticated, service_role;

ALTER TABLE public.support_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org managers read support grants" ON public.support_access_grants;
CREATE POLICY "Org managers read support grants"
  ON public.support_access_grants FOR SELECT TO authenticated
  USING (
    grantee_user_id = auth.uid()
    OR public.is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Org managers insert support grants" ON public.support_access_grants;
CREATE POLICY "Org managers insert support grants"
  ON public.support_access_grants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = support_access_grants.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Org managers update support grants" ON public.support_access_grants;
CREATE POLICY "Org managers update support grants"
  ON public.support_access_grants FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = support_access_grants.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = support_access_grants.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.support_access_grants TO authenticated;
GRANT ALL ON public.support_access_grants TO service_role;

COMMENT ON TABLE public.support_access_grants IS
  'FR-16 time-bound support access. Grantee keeps own identity — impersonation prohibited.';
COMMENT ON FUNCTION public.has_support_access(uuid, uuid) IS
  'True when caller holds an unexpired, unrevoked support grant for the workspace.';
