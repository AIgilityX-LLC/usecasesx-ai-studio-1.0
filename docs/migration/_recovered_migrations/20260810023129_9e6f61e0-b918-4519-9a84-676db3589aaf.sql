-- 1. Safe campaign / search attribution on the public activity stream (additive)
ALTER TABLE public.cta_events
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer_host text,
  ADD COLUMN IF NOT EXISTS search_query text,
  ADD COLUMN IF NOT EXISTS result_count integer;

CREATE INDEX IF NOT EXISTS cta_events_campaign_idx
  ON public.cta_events (utm_source, created_at DESC);
CREATE INDEX IF NOT EXISTS cta_events_cta_created_idx
  ON public.cta_events (cta, created_at DESC);

-- 2. In-app feedback
CREATE TABLE IF NOT EXISTS public.product_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  organization_id uuid,
  workspace_id uuid,
  category text NOT NULL CHECK (category IN ('bug','usability','data_quality','missing_capability','performance','enterprise_interest','other')),
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('low','normal','high','blocking')),
  context_route text,
  entity_type text,
  entity_id uuid,
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 4000),
  evidence_url text,
  allow_contact boolean NOT NULL DEFAULT false,
  contact_email text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','in_progress','resolved','declined')),
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.product_feedback TO authenticated;
GRANT ALL ON public.product_feedback TO service_role;

ALTER TABLE public.product_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users submit their own feedback"
  ON public.product_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read their own feedback"
  ON public.product_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Platform admins read all feedback"
  ON public.product_feedback FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

CREATE POLICY "Platform admins triage feedback"
  ON public.product_feedback FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE INDEX IF NOT EXISTS product_feedback_status_idx
  ON public.product_feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_feedback_user_idx
  ON public.product_feedback (user_id, created_at DESC);

DROP TRIGGER IF EXISTS product_feedback_set_updated_at ON public.product_feedback;
CREATE TRIGGER product_feedback_set_updated_at
  BEFORE UPDATE ON public.product_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Internal launch-learning views (RLS of the underlying tables still applies)
CREATE OR REPLACE VIEW public.v_launch_visitors_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', c.created_at)::date AS week,
       count(DISTINCT coalesce(c.session_id, c.id::text)) AS visitor_sessions,
       count(DISTINCT c.user_id) FILTER (WHERE c.user_id IS NOT NULL) AS signed_in_users,
       count(*) AS events
FROM public.cta_events c
WHERE NOT public.is_demo_activity(NULL, NULL, c.user_id)
GROUP BY 1;

CREATE OR REPLACE VIEW public.v_activation_funnel_weekly
WITH (security_invoker = on) AS
WITH staged AS (
  SELECT date_trunc('week', p.occurred_at)::date AS week,
         p.user_id,
         CASE p.event_name
           WHEN 'user.registered' THEN 'signup'
           WHEN 'onboarding.completed' THEN 'onboarding'
           WHEN 'opportunity.captured' THEN 'opportunity'
           WHEN 'use_case.completed' THEN 'completed_case'
           WHEN 'use_case.scored' THEN 'score'
           WHEN 'shortlist.added' THEN 'shortlist'
           WHEN 'portfolio.created' THEN 'portfolio'
           WHEN 'report.exported' THEN 'report'
           WHEN 'workshop.started' THEN 'workshop_advisory'
           WHEN 'advisory.requested' THEN 'workshop_advisory'
           WHEN 'handoff.requested' THEN 'workshop_advisory'
           ELSE NULL
         END AS stage
  FROM public.product_events p
  WHERE NOT public.is_demo_activity(p.workspace_id, p.organization_id, p.user_id)
)
SELECT week,
       stage,
       CASE stage
         WHEN 'signup' THEN 1 WHEN 'onboarding' THEN 2 WHEN 'opportunity' THEN 3
         WHEN 'completed_case' THEN 4 WHEN 'score' THEN 5 WHEN 'shortlist' THEN 6
         WHEN 'portfolio' THEN 7 WHEN 'report' THEN 8 ELSE 9 END AS stage_order,
       count(DISTINCT user_id) AS users,
       count(*) AS events
FROM staged
WHERE stage IS NOT NULL
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW public.v_ai_usage_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', a.created_at)::date AS week,
       a.task,
       a.status,
       a.error_kind,
       count(*) AS calls,
       count(DISTINCT a.user_id) AS users,
       round(avg(a.duration_ms)) AS avg_duration_ms,
       sum(coalesce(a.total_tokens, 0)) AS total_tokens
FROM public.ai_usage_events a
WHERE NOT public.is_demo_activity(a.workspace_id, a.organization_id, a.user_id)
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW public.v_search_insights_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', c.created_at)::date AS week,
       lower(btrim(c.search_query)) AS search_query,
       count(*) AS searches,
       count(*) FILTER (WHERE coalesce(c.result_count, 0) = 0) AS zero_result_searches
FROM public.cta_events c
WHERE c.cta = 'search_used'
  AND c.search_query IS NOT NULL
  AND btrim(c.search_query) <> ''
  AND NOT public.is_demo_activity(NULL, NULL, c.user_id)
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.v_enterprise_interest_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', l.created_at)::date AS week,
       coalesce(l.interest_area, 'unspecified') AS interest_area,
       coalesce(l.cta, 'unspecified') AS cta,
       count(*) AS leads
FROM public.lead_captures l
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW public.v_feedback_queue
WITH (security_invoker = on) AS
SELECT f.id, f.created_at, f.updated_at, f.status, f.category, f.severity,
       f.context_route, f.entity_type, f.entity_id, f.message, f.evidence_url,
       f.allow_contact, f.user_id, f.workspace_id, f.organization_id,
       f.resolution_note, f.resolved_at,
       NOT public.is_demo_activity(f.workspace_id, f.organization_id, f.user_id) AS is_real_activity
FROM public.product_feedback f;

GRANT SELECT ON public.v_launch_visitors_weekly TO authenticated;
GRANT SELECT ON public.v_activation_funnel_weekly TO authenticated;
GRANT SELECT ON public.v_ai_usage_weekly TO authenticated;
GRANT SELECT ON public.v_search_insights_weekly TO authenticated;
GRANT SELECT ON public.v_enterprise_interest_weekly TO authenticated;
GRANT SELECT ON public.v_feedback_queue TO authenticated;
