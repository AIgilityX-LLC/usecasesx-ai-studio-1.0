-- V2-17 — AI suggestion feedback (redacted telemetry only)
-- Stores Apply / Dismiss / helpfulness. Never stores prompts, bodies or secrets.

CREATE TABLE IF NOT EXISTS public.ai_suggestion_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  workspace_id uuid,
  task text NOT NULL,
  action text NOT NULL,
  prompt_version text NOT NULL,
  entity_type text,
  entity_id uuid,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_suggestion_feedback_action_check
    CHECK (action IN ('apply', 'dismiss', 'helpful', 'unhelpful'))
);

CREATE INDEX IF NOT EXISTS ai_suggestion_feedback_user_idx
  ON public.ai_suggestion_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_suggestion_feedback_task_idx
  ON public.ai_suggestion_feedback (task, action, created_at DESC);

ALTER TABLE public.ai_suggestion_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own AI feedback" ON public.ai_suggestion_feedback;
CREATE POLICY "Users insert own AI feedback"
  ON public.ai_suggestion_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own AI feedback" ON public.ai_suggestion_feedback;
CREATE POLICY "Users read own AI feedback"
  ON public.ai_suggestion_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT ON public.ai_suggestion_feedback TO authenticated;
GRANT ALL ON public.ai_suggestion_feedback TO service_role;

COMMENT ON TABLE public.ai_suggestion_feedback IS
  'FR-14 Apply/Dismiss/Feedback telemetry. No suggestion bodies, prompts or secrets.';
