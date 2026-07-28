CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  workspace_id uuid,
  task text NOT NULL,
  model text NOT NULL,
  provider_alias text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  error_kind text,
  duration_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  entity_type text,
  entity_id uuid,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx
  ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_events_workspace_created_idx
  ON public.ai_usage_events (workspace_id, created_at DESC);

GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_events_select_own"
  ON public.ai_usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ai_usage_events_select_workspace_admin"
  ON public.ai_usage_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_role(auth.uid(), workspace_id) IN ('owner','admin')
  );

CREATE POLICY "ai_usage_events_insert_own"
  ON public.ai_usage_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());