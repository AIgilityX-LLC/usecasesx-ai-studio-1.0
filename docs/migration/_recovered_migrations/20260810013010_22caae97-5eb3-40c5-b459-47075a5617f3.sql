CREATE OR REPLACE FUNCTION public.is_demo_activity(_workspace_id uuid, _organization_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT w.is_demo FROM public.workspaces w WHERE w.id = _workspace_id), false)
    OR COALESCE((SELECT o.is_demo FROM public.organizations o WHERE o.id = _organization_id), false)
    OR COALESCE((
      SELECT lower(p.email) LIKE '%@demo.usecasex.app'
             OR COALESCE((SELECT o2.is_demo FROM public.organizations o2 WHERE o2.id = p.organization_id), false)
      FROM public.profiles p WHERE p.user_id = _user_id
    ), false)
$$;

CREATE OR REPLACE VIEW public.product_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.product_events e
  WHERE NOT public.is_demo_activity(e.workspace_id, e.organization_id, e.user_id);

CREATE OR REPLACE VIEW public.module_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.module_events e
  WHERE NOT public.is_demo_activity(NULL::uuid, NULL::uuid, e.user_id);

CREATE OR REPLACE VIEW public.cta_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.cta_events e
  WHERE NOT public.is_demo_activity(NULL::uuid, NULL::uuid, e.user_id);

CREATE OR REPLACE VIEW public.ai_usage_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.ai_usage_events e
  WHERE NOT public.is_demo_activity(e.workspace_id, e.organization_id, e.user_id);

CREATE OR REPLACE VIEW public.activation_funnel_daily
WITH (security_invoker = on) AS
  SELECT (e.occurred_at AT TIME ZONE 'UTC')::date AS day,
         e.workspace_id,
         e.organization_id,
         e.event_name,
         count(*) AS event_count,
         count(DISTINCT e.user_id) AS user_count
  FROM public.product_events e
  WHERE NOT public.is_demo_activity(e.workspace_id, e.organization_id, e.user_id)
  GROUP BY 1, 2, 3, 4;

GRANT SELECT ON public.product_events_reportable TO authenticated;
GRANT SELECT ON public.module_events_reportable TO authenticated;
GRANT SELECT ON public.cta_events_reportable TO authenticated;
GRANT SELECT ON public.ai_usage_events_reportable TO authenticated;
GRANT SELECT ON public.activation_funnel_daily TO authenticated;
GRANT ALL ON public.product_events_reportable TO service_role;
GRANT ALL ON public.module_events_reportable TO service_role;
GRANT ALL ON public.cta_events_reportable TO service_role;
GRANT ALL ON public.ai_usage_events_reportable TO service_role;
GRANT ALL ON public.activation_funnel_daily TO service_role;

CREATE TABLE IF NOT EXISTS public.demo_reset_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_label text,
  scope text NOT NULL DEFAULT 'all',
  scenario_key text,
  status text NOT NULL DEFAULT 'ok',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demo_reset_log TO authenticated;
GRANT ALL ON public.demo_reset_log TO service_role;

ALTER TABLE public.demo_reset_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read demo reset log"
  ON public.demo_reset_log FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE TRIGGER update_demo_reset_log_updated_at
  BEFORE UPDATE ON public.demo_reset_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS demo_reset_log_created_idx ON public.demo_reset_log (created_at DESC);
