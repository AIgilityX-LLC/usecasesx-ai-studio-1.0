-- Immutable application audit architecture (additive).
-- Extends public.audit_events with compliance fields; hardens append-only
-- posture; allows tenant administrators / platform auditors to SELECT.
-- Application debugging logs MUST NOT be written to this table.

-- ---------------------------------------------------------------------------
-- 1. Additive columns (canonical AuditEvent fields)
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS actor_type text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS context jsonb,
  ADD COLUMN IF NOT EXISTS result text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.audit_events
    ADD CONSTRAINT audit_events_actor_type_check
    CHECK (actor_type IN ('user', 'system', 'service', 'support'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.audit_events
    ADD CONSTRAINT audit_events_result_check
    CHECK (result IN ('success', 'failure', 'denied', 'partial'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.audit_events.actor_type IS
  'AuditEvent.actor_type — user | system | service | support';
COMMENT ON COLUMN public.audit_events.session_id IS
  'AuditEvent.session_id — auth session correlation when available';
COMMENT ON COLUMN public.audit_events.context IS
  'AuditEvent context — ip / userAgent / path / method / region (redacted)';
COMMENT ON COLUMN public.audit_events.result IS
  'AuditEvent.result — success | failure | denied | partial';
COMMENT ON COLUMN public.audit_events.metadata IS
  'AuditEvent.metadata — non-sensitive structured attributes';
COMMENT ON COLUMN public.audit_events.organization_id IS
  'Tenant id (AuditEvent.tenant_id). Workspace scope uses workspace_id.';
COMMENT ON COLUMN public.audit_events.entity_type IS
  'Resource type (AuditEvent.resource_type)';
COMMENT ON COLUMN public.audit_events.entity_id IS
  'Resource id (AuditEvent.resource_id)';
COMMENT ON COLUMN public.audit_events.previous_value IS
  'Before state (AuditEvent.before_state)';
COMMENT ON COLUMN public.audit_events.new_value IS
  'After state (AuditEvent.after_state)';
COMMENT ON COLUMN public.audit_events.created_at IS
  'Event timestamp (AuditEvent.timestamp)';

COMMENT ON TABLE public.audit_events IS
  'Immutable compliance / business audit stream. Separate from product_events (activation) and ops structured logs (debugging).';

CREATE INDEX IF NOT EXISTS audit_events_org_created_idx
  ON public.audit_events (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_events_workspace_created_idx
  ON public.audit_events (workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_events_event_type_idx
  ON public.audit_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_request_id_idx
  ON public.audit_events (request_id)
  WHERE request_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Immutability: REVOKE mutations + trigger (defense in depth)
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON public.audit_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.audit_events FROM anon;
REVOKE UPDATE, DELETE ON public.audit_events FROM authenticated;

-- Insert + select only for application roles; service_role retains full ops.
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

CREATE OR REPLACE FUNCTION public.audit_events_deny_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are immutable: % is not allowed', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_events_immutable_update ON public.audit_events;
CREATE TRIGGER trg_audit_events_immutable_update
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_deny_mutation();

DROP TRIGGER IF EXISTS trg_audit_events_immutable_delete ON public.audit_events;
CREATE TRIGGER trg_audit_events_immutable_delete
  BEFORE DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_deny_mutation();

REVOKE EXECUTE ON FUNCTION public.audit_events_deny_mutation() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. SELECT for tenant administrators (org owner/admin) — additive policy
--    Existing self / platform-admin policies remain; RLS ORs SELECT policies.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenant admins read org audit events" ON public.audit_events;
CREATE POLICY "Tenant admins read org audit events"
  ON public.audit_events FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = audit_events.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

-- Ensure INSERT remains attributable (idempotent recreate if missing).
DROP POLICY IF EXISTS "Users insert own audit events" ON public.audit_events;
CREATE POLICY "Users insert own audit events"
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- No UPDATE / DELETE policies — intentional.
