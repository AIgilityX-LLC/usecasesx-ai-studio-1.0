-- 1. Portfolios: additive columns
ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS review_cadence text,
  ADD COLUMN IF NOT EXISTS organization_unit_id uuid REFERENCES public.organization_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE SET NULL;

ALTER TABLE public.portfolios DROP CONSTRAINT IF EXISTS portfolios_visibility_check;
ALTER TABLE public.portfolios
  ADD CONSTRAINT portfolios_visibility_check
  CHECK (visibility IN ('private','workspace','organization'));

ALTER TABLE public.portfolios DROP CONSTRAINT IF EXISTS portfolios_review_cadence_check;
ALTER TABLE public.portfolios
  ADD CONSTRAINT portfolios_review_cadence_check
  CHECK (review_cadence IS NULL OR review_cadence IN ('none','weekly','monthly','quarterly','biannual','annual'));

ALTER TABLE public.portfolios DROP CONSTRAINT IF EXISTS portfolios_no_self_parent;
ALTER TABLE public.portfolios
  ADD CONSTRAINT portfolios_no_self_parent CHECK (parent_portfolio_id IS NULL OR parent_portfolio_id <> id);

CREATE INDEX IF NOT EXISTS idx_portfolios_org ON public.portfolios (organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_parent ON public.portfolios (parent_portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_org_unit ON public.portfolios (organization_unit_id);

-- 2. Portfolio items: portfolio-specific decision fields (never source scores)
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS decision text NOT NULL DEFAULT 'under_review',
  ADD COLUMN IF NOT EXISTS target_period text,
  ADD COLUMN IF NOT EXISTS funding_state text NOT NULL DEFAULT 'unfunded',
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS added_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.portfolio_items DROP CONSTRAINT IF EXISTS portfolio_items_decision_check;
ALTER TABLE public.portfolio_items
  ADD CONSTRAINT portfolio_items_decision_check
  CHECK (decision IN ('under_review','shortlisted','approved','deferred','rejected','delivered'));

ALTER TABLE public.portfolio_items DROP CONSTRAINT IF EXISTS portfolio_items_funding_state_check;
ALTER TABLE public.portfolio_items
  ADD CONSTRAINT portfolio_items_funding_state_check
  CHECK (funding_state IN ('unfunded','requested','funded','on_hold'));

ALTER TABLE public.portfolio_items DROP CONSTRAINT IF EXISTS portfolio_items_rank_check;
ALTER TABLE public.portfolio_items
  ADD CONSTRAINT portfolio_items_rank_check CHECK (rank IS NULL OR rank >= 0);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_use_case ON public.portfolio_items (use_case_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_rank ON public.portfolio_items (portfolio_id, rank);

-- 3. updated_at triggers
DROP TRIGGER IF EXISTS set_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER set_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_portfolio_items_updated_at ON public.portfolio_items;
CREATE TRIGGER set_portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Accessibility helper (avoids recursive policy lookups)
CREATE OR REPLACE FUNCTION public.portfolio_is_readable(_portfolio_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = _portfolio_id
      AND (
        p.user_id = _user_id
        OR (p.visibility <> 'private' AND p.workspace_id IS NOT NULL
            AND public.is_workspace_member(_user_id, p.workspace_id))
        OR (p.visibility = 'organization' AND p.organization_id IS NOT NULL
            AND public.is_org_member(_user_id, p.organization_id))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.portfolio_is_writable(_portfolio_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = _portfolio_id
      AND (
        p.user_id = _user_id
        OR public.org_role(_user_id, p.organization_id) IN ('owner','admin')
      )
  )
$$;

-- 5. RLS on portfolio_items: replace owner-only ALL policy with explicit per-command policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own portfolio items" ON public.portfolio_items;

CREATE POLICY "Readers view portfolio items"
  ON public.portfolio_items FOR SELECT TO authenticated
  USING (public.portfolio_is_readable(portfolio_id, auth.uid()));

CREATE POLICY "Writers insert portfolio items"
  ON public.portfolio_items FOR INSERT TO authenticated
  WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()));

CREATE POLICY "Writers update portfolio items"
  ON public.portfolio_items FOR UPDATE TO authenticated
  USING (public.portfolio_is_writable(portfolio_id, auth.uid()))
  WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()));

CREATE POLICY "Writers delete portfolio items"
  ON public.portfolio_items FOR DELETE TO authenticated
  USING (public.portfolio_is_writable(portfolio_id, auth.uid()));

-- Portfolios SELECT policy widened to respect visibility (owner access unchanged)
DROP POLICY IF EXISTS "Workspace members read portfolios" ON public.portfolios;
CREATE POLICY "Workspace members read portfolios"
  ON public.portfolios FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (visibility <> 'private' AND workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
    OR (visibility = 'organization' AND organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
  );

-- 6. Append-only audit for portfolio items
CREATE OR REPLACE FUNCTION public.audit_portfolio_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'portfolio_item', NEW.portfolio_id, 'portfolio_item.added',
            jsonb_build_object('use_case_id', NEW.use_case_id, 'decision', NEW.decision, 'rank', NEW.rank));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
    VALUES (uid, 'portfolio_item', NEW.portfolio_id, 'portfolio_item.updated',
            jsonb_build_object('decision', OLD.decision, 'rank', OLD.rank, 'funding_state', OLD.funding_state, 'target_period', OLD.target_period),
            jsonb_build_object('use_case_id', NEW.use_case_id, 'decision', NEW.decision, 'rank', NEW.rank, 'funding_state', NEW.funding_state, 'target_period', NEW.target_period));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'portfolio_item', OLD.portfolio_id, 'portfolio_item.removed',
            jsonb_build_object('use_case_id', OLD.use_case_id, 'decision', OLD.decision));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_portfolio_items_trg ON public.portfolio_items;
CREATE TRIGGER audit_portfolio_items_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_portfolio_items();

-- 7. Keep tenancy columns in sync from the owner profile (non-destructive backfill)
DROP TRIGGER IF EXISTS sync_portfolio_tenancy ON public.portfolios;
CREATE TRIGGER sync_portfolio_tenancy
  BEFORE INSERT ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();

UPDATE public.portfolios p
SET organization_id = COALESCE(p.organization_id, public.user_org_id(p.user_id))
WHERE p.organization_id IS NULL;

UPDATE public.portfolios p
SET workspace_id = COALESCE(p.workspace_id, (
  SELECT w.id FROM public.workspaces w WHERE w.organization_id = p.organization_id ORDER BY w.created_at LIMIT 1
))
WHERE p.workspace_id IS NULL;