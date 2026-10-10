ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS confirmation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmation_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_last_error text;

ALTER TABLE public.lead_captures
  DROP CONSTRAINT IF EXISTS lead_captures_confirmation_status_check;
ALTER TABLE public.lead_captures
  ADD CONSTRAINT lead_captures_confirmation_status_check
  CHECK (confirmation_status IN ('pending','sent','failed','suppressed','skipped'));

CREATE INDEX IF NOT EXISTS lead_captures_confirmation_retry_idx
  ON public.lead_captures (confirmation_next_retry_at)
  WHERE confirmation_status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.lead_captures(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_id uuid,
  actor_label text,
  detail text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_lead_idx ON public.lead_events (lead_id, created_at DESC);

GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read lead events" ON public.lead_events;
CREATE POLICY "Admins read lead events" ON public.lead_events
  FOR SELECT TO authenticated
  USING (is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Admins write lead events" ON public.lead_events;
CREATE POLICY "Admins write lead events" ON public.lead_events
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Users edit own draft submissions" ON public.use_case_submissions;
CREATE POLICY "Users edit own draft submissions" ON public.use_case_submissions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND status = ANY (ARRAY['draft'::submission_status, 'submitted'::submission_status])
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = ANY (ARRAY['draft'::submission_status, 'submitted'::submission_status])
  );
