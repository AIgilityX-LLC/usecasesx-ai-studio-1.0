-- ============================================================
-- T1 ÔÇö New tenancy tables (additive only)
-- ============================================================

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','admin','contributor','viewer','facilitator')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','admin','contributor','viewer','facilitator')),
  added_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.organization_units(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_units TO authenticated;
GRANT ALL ON public.organization_units TO service_role;
ALTER TABLE public.organization_units ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.plans(code),
  source text NOT NULL DEFAULT 'manual',
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_ws_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_ws_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX idx_org_units_org ON public.organization_units(organization_id);
CREATE INDEX idx_entitlements_org ON public.entitlements(organization_id);

CREATE TRIGGER trg_org_members_updated BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ws_members_updated BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_org_units_updated BEFORE UPDATE ON public.organization_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_entitlements_updated BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- T2 ÔÇö Helper functions (SECURITY DEFINER, no recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _user_id AND m.organization_id = _org_id AND m.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.org_role(_user_id uuid, _org_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.organization_members m
  WHERE m.user_id = _user_id AND m.organization_id = _org_id AND m.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.workspace_org(_workspace_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.organization_id FROM public.workspaces w WHERE w.id = _workspace_id
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.user_id = _user_id AND m.workspace_id = _workspace_id
  )
$$;

CREATE OR REPLACE FUNCTION public.workspace_role(_user_id uuid, _workspace_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.workspace_members m
  WHERE m.user_id = _user_id AND m.workspace_id = _workspace_id
  LIMIT 1
$$;

-- Signature unchanged; membership first, legacy org rule as compatibility fallback.
CREATE OR REPLACE FUNCTION public.user_in_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_workspace_member(_user_id, _workspace_id)
     OR EXISTS (
       SELECT 1 FROM public.workspaces w
       WHERE w.id = _workspace_id
         AND w.organization_id = public.user_org_id(_user_id)
     )
$$;

-- ============================================================
-- T1b ÔÇö Policies for the new tables
-- ============================================================

CREATE POLICY "Members read their org membership rows" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners and admins add members" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org owners and admins update members" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org admins remove members or member leaves" ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin') OR user_id = auth.uid());

CREATE POLICY "Members read workspace membership rows" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Org admins add workspace members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin'));
CREATE POLICY "Org admins update workspace members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin'))
  WITH CHECK (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin'));
CREATE POLICY "Org admins remove workspace members or member leaves" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin') OR user_id = auth.uid());

CREATE POLICY "Org members read units" ON public.organization_units
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins insert units" ON public.organization_units
  FOR INSERT TO authenticated WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org admins update units" ON public.organization_units
  FOR UPDATE TO authenticated
  USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org admins delete units" ON public.organization_units
  FOR DELETE TO authenticated USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));

CREATE POLICY "Plans are publicly readable" ON public.plans
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Platform admins insert plans" ON public.plans
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins update plans" ON public.plans
  FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid())) WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins delete plans" ON public.plans
  FOR DELETE TO authenticated USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Org members read entitlements" ON public.entitlements
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

INSERT INTO public.plans (code, name, description, sort_order, limits) VALUES
  ('lite', 'Lite', 'Public discovery of the AI use case repository.', 0, '{}'::jsonb),
  ('pro_founding', 'Pro Founding Access', 'Registered professional use, complimentary through 31 December 2026.', 1, '{}'::jsonb),
  ('enterprise', 'Enterprise', 'Enterprise Design Partner engagements.', 2, '{}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- T3 ÔÇö Additive tenancy columns (nullable) + indexes
-- ============================================================

ALTER TABLE public.ai_use_cases                ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.blueprints                  ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.feasibility_scores          ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.data_readiness_assessments  ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.integration_links           ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.use_case_deliverables       ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.use_case_submissions        ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.use_case_scores             ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.generated_reports           ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.portfolios                  ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.collections                 ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.saved_use_cases             ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.shortlists                  ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.use_case_boards             ADD COLUMN IF NOT EXISTS organization_id uuid;

CREATE INDEX IF NOT EXISTS idx_ai_use_cases_ws ON public.ai_use_cases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_org ON public.ai_use_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_ws ON public.blueprints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_scores_ws ON public.feasibility_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dra_ws ON public.data_readiness_assessments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integration_links_ws ON public.integration_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_ws ON public.use_case_deliverables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_submissions_ws ON public.use_case_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_uc_scores_ws ON public.use_case_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_ws ON public.generated_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_ws ON public.portfolios(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collections_ws ON public.collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_use_cases_ws ON public.saved_use_cases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_ws ON public.shortlists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_use_case_boards_org ON public.use_case_boards(organization_id);

-- ============================================================
-- T4 ÔÇö Backfill (idempotent)
-- ============================================================

INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at)
SELECT p.organization_id, p.user_id, 'owner', 'active', COALESCE(p.created_at, now())
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.workspace_members (workspace_id, user_id, role, joined_at)
SELECT w.id, m.user_id, m.role, now()
FROM public.workspaces w
JOIN public.organization_members m ON m.organization_id = w.organization_id
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO public.entitlements (organization_id, plan_code, source, expires_at)
SELECT DISTINCT ON (p.organization_id)
  p.organization_id,
  CASE
    WHEN COALESCE(p.entitlement_tier, p.plan_type) = 'pro' THEN 'pro_founding'
    WHEN COALESCE(p.entitlement_tier, p.plan_type) = 'enterprise' THEN 'enterprise'
    ELSE 'lite'
  END,
  'backfill_2026_08',
  p.entitlement_expires_at
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.entitlements e WHERE e.organization_id = p.organization_id)
ORDER BY p.organization_id, p.created_at;

UPDATE public.use_case_boards b
SET organization_id = w.organization_id
FROM public.workspaces w
WHERE w.id = b.workspace_id AND b.organization_id IS NULL;

UPDATE public.ai_use_cases u
SET workspace_id = b.workspace_id, organization_id = b.organization_id
FROM public.use_case_boards b
WHERE b.id = u.board_id AND u.workspace_id IS NULL;

UPDATE public.blueprints t SET workspace_id = u.workspace_id, organization_id = u.organization_id
FROM public.ai_use_cases u WHERE u.id = t.use_case_id AND t.workspace_id IS NULL;
UPDATE public.feasibility_scores t SET workspace_id = u.workspace_id, organization_id = u.organization_id
FROM public.ai_use_cases u WHERE u.id = t.use_case_id AND t.workspace_id IS NULL;
UPDATE public.data_readiness_assessments t SET workspace_id = u.workspace_id, organization_id = u.organization_id
FROM public.ai_use_cases u WHERE u.id = t.use_case_id AND t.workspace_id IS NULL;
UPDATE public.integration_links t SET workspace_id = u.workspace_id, organization_id = u.organization_id
FROM public.ai_use_cases u WHERE u.id = t.use_case_id AND t.workspace_id IS NULL;
UPDATE public.use_case_deliverables t SET workspace_id = u.workspace_id, organization_id = u.organization_id
FROM public.ai_use_cases u WHERE u.id = t.use_case_id AND t.workspace_id IS NULL;

UPDATE public.collections t SET organization_id = p.organization_id,
  workspace_id = (SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1)
FROM public.profiles p WHERE p.user_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.portfolios t SET organization_id = p.organization_id,
  workspace_id = (SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1)
FROM public.profiles p WHERE p.user_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.saved_use_cases t SET organization_id = p.organization_id,
  workspace_id = (SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1)
FROM public.profiles p WHERE p.user_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.shortlists t SET organization_id = p.organization_id,
  workspace_id = (SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1)
FROM public.profiles p WHERE p.user_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.generated_reports t SET organization_id = p.organization_id,
  workspace_id = (SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1)
FROM public.profiles p WHERE p.user_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.use_case_scores t SET organization_id = p.organization_id,
  workspace_id = (SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1)
FROM public.profiles p WHERE p.user_id = t.user_id AND t.workspace_id IS NULL;
UPDATE public.use_case_submissions t SET organization_id = p.organization_id,
  workspace_id = (SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1)
FROM public.profiles p WHERE p.user_id = t.user_id AND t.workspace_id IS NULL;

-- ============================================================
-- T5 ÔÇö Sync triggers so existing inserts keep working unchanged
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_tenancy_from_board()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT b.workspace_id INTO NEW.workspace_id FROM public.use_case_boards b WHERE b.id = NEW.board_id;
  END IF;
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_tenancy_from_ai_use_case()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT u.workspace_id, u.organization_id INTO NEW.workspace_id, NEW.organization_id
    FROM public.ai_use_cases u WHERE u.id = NEW.use_case_id;
  END IF;
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_tenancy_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org uuid;
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT p.organization_id INTO org FROM public.profiles p WHERE p.user_id = NEW.user_id;
    NEW.organization_id := org;
  END IF;
  IF NEW.workspace_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    SELECT w.id INTO NEW.workspace_id FROM public.workspaces w
    WHERE w.organization_id = NEW.organization_id ORDER BY w.created_at LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_board_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_boards_tenancy BEFORE INSERT ON public.use_case_boards
  FOR EACH ROW EXECUTE FUNCTION public.sync_board_org();
CREATE TRIGGER trg_ai_use_cases_tenancy BEFORE INSERT ON public.ai_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_board();
CREATE TRIGGER trg_blueprints_tenancy BEFORE INSERT ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
CREATE TRIGGER trg_feasibility_tenancy BEFORE INSERT ON public.feasibility_scores
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
CREATE TRIGGER trg_dra_tenancy BEFORE INSERT ON public.data_readiness_assessments
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
CREATE TRIGGER trg_integration_links_tenancy BEFORE INSERT ON public.integration_links
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
CREATE TRIGGER trg_deliverables_tenancy BEFORE INSERT ON public.use_case_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
CREATE TRIGGER trg_collections_tenancy BEFORE INSERT ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
CREATE TRIGGER trg_portfolios_tenancy BEFORE INSERT ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
CREATE TRIGGER trg_saved_use_cases_tenancy BEFORE INSERT ON public.saved_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
CREATE TRIGGER trg_shortlists_tenancy BEFORE INSERT ON public.shortlists
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
CREATE TRIGGER trg_generated_reports_tenancy BEFORE INSERT ON public.generated_reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
CREATE TRIGGER trg_uc_scores_tenancy BEFORE INSERT ON public.use_case_scores
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
CREATE TRIGGER trg_submissions_tenancy BEFORE INSERT ON public.use_case_submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();

-- ============================================================
-- Provisioning: ensure_user_workspace also writes membership rows
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_user_workspace(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := _user_id;
  prof_org uuid;
  prof_name text;
  prof_email text;
  prof_company text;
  new_org uuid;
  ws uuid;
  created_org boolean := false;
  created_ws boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Missing user id';
  END IF;

  SELECT organization_id, full_name, email, organization
    INTO prof_org, prof_name, prof_email, prof_company
  FROM public.profiles WHERE user_id = uid LIMIT 1;

  IF prof_org IS NULL THEN
    INSERT INTO public.organizations(name, plan)
    VALUES (COALESCE(NULLIF(prof_company,''), NULLIF(prof_name,''), prof_email, 'My Organization'), 'lite')
    RETURNING id INTO new_org;
    created_org := true;

    INSERT INTO public.profiles(user_id, email, organization_id)
    VALUES (uid, prof_email, new_org)
    ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    prof_org := new_org;
  END IF;

  SELECT id INTO ws FROM public.workspaces WHERE organization_id = prof_org LIMIT 1;
  IF ws IS NULL THEN
    INSERT INTO public.workspaces(organization_id, name, created_by)
    VALUES (prof_org, 'Default Workspace', uid)
    RETURNING id INTO ws;
    created_ws := true;
  END IF;

  INSERT INTO public.organization_members(organization_id, user_id, role, status)
  VALUES (prof_org, uid, 'owner', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO public.workspace_members(workspace_id, user_id, role)
  VALUES (ws, uid, COALESCE(public.org_role(uid, prof_org), 'owner'))
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  INSERT INTO public.entitlements(organization_id, plan_code, source)
  SELECT prof_org, 'lite', 'auto_provision'
  WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e WHERE e.organization_id = prof_org);

  IF created_org OR created_ws THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'workspace', ws, 'workspace.provisioned',
            jsonb_build_object('organization_id', prof_org, 'workspace_id', ws,
                               'created_org', created_org, 'created_workspace', created_ws));
  END IF;

  RETURN ws;
END;
$$;
