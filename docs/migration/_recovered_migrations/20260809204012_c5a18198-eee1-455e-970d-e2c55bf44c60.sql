-- 1. Demo labelling on tenancy containers (additive, defaults keep existing rows unchanged)
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_demo_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_scenario_key text;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- 2. Template lineage on records that a sample copy produces
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS demo_template_key text;
ALTER TABLE public.ai_use_cases  ADD COLUMN IF NOT EXISTS demo_template_key text;
ALTER TABLE public.portfolios    ADD COLUMN IF NOT EXISTS demo_template_key text;

CREATE INDEX IF NOT EXISTS idx_workspaces_demo ON public.workspaces (is_demo) WHERE is_demo;

-- 3. Sample-copy ledger (user-owned lineage records)
CREATE TABLE IF NOT EXISTS public.demo_sample_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id uuid,
  scenario_key text NOT NULL,
  scenario_label text NOT NULL,
  template_version text NOT NULL DEFAULT 'v1',
  entity_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.demo_sample_copies TO authenticated;
GRANT ALL ON public.demo_sample_copies TO service_role;

ALTER TABLE public.demo_sample_copies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own sample copies"
  ON public.demo_sample_copies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users record their own sample copies"
  ON public.demo_sample_copies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Users remove their own sample copies"
  ON public.demo_sample_copies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Activation metrics must ignore demonstration and internal-demo activity
CREATE OR REPLACE VIEW public.activation_funnel_daily AS
  SELECT ((e.occurred_at AT TIME ZONE 'UTC'::text))::date AS day,
         e.workspace_id,
         e.organization_id,
         e.event_name,
         count(*) AS event_count,
         count(DISTINCT e.user_id) AS user_count
    FROM public.product_events e
    LEFT JOIN public.workspaces w ON w.id = e.workspace_id
    LEFT JOIN public.organizations o ON o.id = e.organization_id
    LEFT JOIN public.profiles p ON p.user_id = e.user_id
   WHERE COALESCE(w.is_demo, false) = false
     AND COALESCE(o.is_demo, false) = false
     AND COALESCE(lower(p.email), '') NOT LIKE '%@demo.usecasex.app'
   GROUP BY 1, 2, 3, 4;
