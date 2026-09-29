-- V2-10 — Decision gates and review workflow (additive)
-- Default gates live in application catalogue (FR-08). Reviews, immutable
-- decision events, and open conditions/change-requests are stored here.

-- ---------------------------------------------------------------------------
-- 1. decision_gate_reviews — active/historical review per use case + gate
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.decision_gate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  workspace_id uuid NOT NULL,
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases (id) ON DELETE CASCADE,
  gate_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  submitted_by uuid,
  submitted_at timestamptz,
  sla_due_at timestamptz,
  -- Immutable business version pinned at submit (use_case_versions.id)
  record_version_id uuid,
  decision_authority text NOT NULL,
  sod_enabled boolean NOT NULL DEFAULT true,
  sla_hours integer NOT NULL DEFAULT 72,
  -- Latest decision event (nullable until first decide)
  current_event_id uuid,
  -- Informational gaps (rule/AI). Never grants authority to decide or close.
  missing_inputs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT decision_gate_reviews_gate_key_check
    CHECK (gate_key IN (
      'intake', 'discovery_complete', 'investment_review',
      'pilot_authorization', 'scale_authorization', 'retirement_review'
    )),
  CONSTRAINT decision_gate_reviews_status_check
    CHECK (status IN (
      'draft', 'submitted', 'in_review', 'changes_requested',
      'approved', 'approved_with_conditions', 'held', 'rejected'
    )),
  CONSTRAINT decision_gate_reviews_sla_hours_check
    CHECK (sla_hours > 0 AND sla_hours <= 8760)
);

CREATE UNIQUE INDEX IF NOT EXISTS decision_gate_reviews_open_unique
  ON public.decision_gate_reviews (use_case_id, gate_key)
  WHERE deleted_at IS NULL
    AND status NOT IN ('approved', 'held', 'rejected');

CREATE INDEX IF NOT EXISTS decision_gate_reviews_inbox_idx
  ON public.decision_gate_reviews (workspace_id, status, sla_due_at)
  WHERE deleted_at IS NULL
    AND status IN ('submitted', 'in_review', 'changes_requested', 'approved_with_conditions');

CREATE INDEX IF NOT EXISTS decision_gate_reviews_use_case_idx
  ON public.decision_gate_reviews (use_case_id)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. decision_gate_events — append-only decision / submit records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.decision_gate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.decision_gate_reviews (id) ON DELETE CASCADE,
  organization_id uuid,
  workspace_id uuid NOT NULL,
  action text NOT NULL,
  actor_id uuid NOT NULL,
  rationale text,
  -- Snapshots at decision time (immutable)
  conditions_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_requests_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  record_version_id uuid,
  decision_authority text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_gate_events_action_check
    CHECK (action IN (
      'submit', 'request_changes', 'approve_with_conditions',
      'approve', 'hold', 'reject'
    ))
);

CREATE INDEX IF NOT EXISTS decision_gate_events_review_idx
  ON public.decision_gate_events (review_id, created_at DESC);

-- Prevent mutation of immutable decision events
CREATE OR REPLACE FUNCTION public.prevent_gate_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'decision_gate_events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_decision_gate_events_no_update ON public.decision_gate_events;
CREATE TRIGGER trg_decision_gate_events_no_update
  BEFORE UPDATE OR DELETE ON public.decision_gate_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gate_event_mutation();

-- Wire current_event_id FK after events table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'decision_gate_reviews_current_event_fkey'
  ) THEN
    ALTER TABLE public.decision_gate_reviews
      ADD CONSTRAINT decision_gate_reviews_current_event_fkey
      FOREIGN KEY (current_event_id)
      REFERENCES public.decision_gate_events (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. decision_gate_open_items — conditions + field change requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.decision_gate_open_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.decision_gate_reviews (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.decision_gate_events (id) ON DELETE CASCADE,
  organization_id uuid,
  workspace_id uuid NOT NULL,
  kind text NOT NULL,
  field_key text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  closed_by uuid,
  closed_at timestamptz,
  close_note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_gate_open_items_kind_check
    CHECK (kind IN ('condition', 'change_request')),
  CONSTRAINT decision_gate_open_items_status_check
    CHECK (status IN ('open', 'closed')),
  CONSTRAINT decision_gate_open_items_change_field_check
    CHECK (
      (kind = 'change_request' AND field_key IS NOT NULL)
      OR (kind = 'condition' AND field_key IS NULL)
    ),
  CONSTRAINT decision_gate_open_items_body_len
    CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS decision_gate_open_items_open_idx
  ON public.decision_gate_open_items (review_id, status)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS decision_gate_open_items_workspace_idx
  ON public.decision_gate_open_items (workspace_id, status)
  WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_decision_gate_reviews_tenant ON public.decision_gate_reviews;
CREATE TRIGGER trg_decision_gate_reviews_tenant
  BEFORE INSERT OR UPDATE ON public.decision_gate_reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_decision_gate_reviews_updated ON public.decision_gate_reviews;
CREATE TRIGGER trg_decision_gate_reviews_updated
  BEFORE UPDATE ON public.decision_gate_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_decision_gate_events_tenant ON public.decision_gate_events;
CREATE TRIGGER trg_decision_gate_events_tenant
  BEFORE INSERT OR UPDATE ON public.decision_gate_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_decision_gate_open_items_tenant ON public.decision_gate_open_items;
CREATE TRIGGER trg_decision_gate_open_items_tenant
  BEFORE INSERT OR UPDATE ON public.decision_gate_open_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_org_match();

DROP TRIGGER IF EXISTS trg_decision_gate_open_items_updated ON public.decision_gate_open_items;
CREATE TRIGGER trg_decision_gate_open_items_updated
  BEFORE UPDATE ON public.decision_gate_open_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.decision_gate_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_gate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_gate_open_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read gate reviews" ON public.decision_gate_reviews;
CREATE POLICY "Workspace members read gate reviews"
  ON public.decision_gate_reviews FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );

DROP POLICY IF EXISTS "Workspace editors insert gate reviews" ON public.decision_gate_reviews;
CREATE POLICY "Workspace editors insert gate reviews"
  ON public.decision_gate_reviews FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors update gate reviews" ON public.decision_gate_reviews;
CREATE POLICY "Workspace editors update gate reviews"
  ON public.decision_gate_reviews FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace members read gate events" ON public.decision_gate_events;
CREATE POLICY "Workspace members read gate events"
  ON public.decision_gate_events FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors insert gate events" ON public.decision_gate_events;
CREATE POLICY "Workspace editors insert gate events"
  ON public.decision_gate_events FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

-- No UPDATE/DELETE policies on events (append-only; trigger also blocks)

DROP POLICY IF EXISTS "Workspace members read gate open items" ON public.decision_gate_open_items;
CREATE POLICY "Workspace members read gate open items"
  ON public.decision_gate_open_items FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors insert gate open items" ON public.decision_gate_open_items;
CREATE POLICY "Workspace editors insert gate open items"
  ON public.decision_gate_open_items FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Workspace editors update gate open items" ON public.decision_gate_open_items;
CREATE POLICY "Workspace editors update gate open items"
  ON public.decision_gate_open_items FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));

GRANT SELECT, INSERT, UPDATE ON public.decision_gate_reviews TO authenticated;
GRANT SELECT, INSERT ON public.decision_gate_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.decision_gate_open_items TO authenticated;
GRANT ALL ON public.decision_gate_reviews TO service_role;
GRANT ALL ON public.decision_gate_events TO service_role;
GRANT ALL ON public.decision_gate_open_items TO service_role;

COMMENT ON TABLE public.decision_gate_reviews IS
  'FR-08 decision gate review instances. Config defaults in app; SoD + SLA enforced in app.';
COMMENT ON TABLE public.decision_gate_events IS
  'Append-only gate submit/decide events with authority, rationale and version pin.';
COMMENT ON TABLE public.decision_gate_open_items IS
  'Approve-with-conditions and field-level change requests; stay visible until human close.';
