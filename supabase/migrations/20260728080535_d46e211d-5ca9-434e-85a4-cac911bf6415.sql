-- 1. Extend existing append-only audit trail (additive only)
ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS audit_events_workspace_created_idx
  ON public.audit_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_request_idx
  ON public.audit_events (request_id);

-- Workspace owners/admins may read audit events for their own workspace.
CREATE POLICY "Workspace admins read workspace audit"
  ON public.audit_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner','admin'])
  );

-- 2. Product / activation events
CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  workspace_id uuid,
  event_name text NOT NULL,
  entity_type text,
  entity_id uuid,
  request_id text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users record their own product events"
  ON public.product_events FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(event_name) BETWEEN 1 AND 120
  );

CREATE POLICY "Users read their own product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Workspace admins read workspace product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner','admin'])
  );

CREATE POLICY "Platform admins read product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE INDEX IF NOT EXISTS product_events_name_time_idx
  ON public.product_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_workspace_time_idx
  ON public.product_events (workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_user_time_idx
  ON public.product_events (user_id, occurred_at DESC);

-- 3. Internal activation summary (respects the reader's own permissions)
CREATE OR REPLACE VIEW public.activation_funnel_daily
WITH (security_invoker = true) AS
SELECT
  (occurred_at AT TIME ZONE 'UTC')::date AS day,
  workspace_id,
  organization_id,
  event_name,
  count(*)::bigint          AS event_count,
  count(DISTINCT user_id)::bigint AS user_count
FROM public.product_events
GROUP BY 1, 2, 3, 4;

GRANT SELECT ON public.activation_funnel_daily TO authenticated;
GRANT SELECT ON public.activation_funnel_daily TO service_role;