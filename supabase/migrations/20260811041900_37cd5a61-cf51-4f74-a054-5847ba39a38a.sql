ALTER TABLE public.product_feedback
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'p3',
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

CREATE INDEX IF NOT EXISTS product_feedback_assigned_to_idx ON public.product_feedback (assigned_to);
CREATE INDEX IF NOT EXISTS product_feedback_due_at_idx ON public.product_feedback (due_at);

DROP VIEW IF EXISTS public.v_feedback_queue;

CREATE VIEW public.v_feedback_queue AS
SELECT id,
    created_at,
    updated_at,
    status,
    category,
    severity,
    context_route,
    entity_type,
    entity_id,
    message,
    evidence_url,
    allow_contact,
    user_id,
    workspace_id,
    organization_id,
    resolution_note,
    resolved_at,
    assigned_to,
    assigned_by,
    assigned_at,
    priority,
    due_at,
    first_response_at,
    NOT public.is_demo_activity(workspace_id, organization_id, user_id) AS is_real_activity
   FROM public.product_feedback f;

GRANT SELECT ON public.v_feedback_queue TO authenticated;
GRANT ALL ON public.v_feedback_queue TO service_role;

CREATE TABLE IF NOT EXISTS public.request_status_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.product_feedback (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  priority text,
  due_at timestamptz,
  note text,
  actor_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.request_status_alerts TO authenticated;
GRANT ALL ON public.request_status_alerts TO service_role;

ALTER TABLE public.request_status_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters read their own request alerts"
ON public.request_status_alerts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Reporters mark their own alerts read"
ON public.request_status_alerts FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins create request alerts"
ON public.request_status_alerts FOR INSERT TO authenticated
WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE INDEX IF NOT EXISTS request_status_alerts_user_idx
  ON public.request_status_alerts (user_id, created_at DESC);