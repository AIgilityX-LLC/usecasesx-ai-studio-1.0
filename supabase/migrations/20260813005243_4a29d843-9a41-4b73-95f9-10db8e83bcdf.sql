ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer_host text;

UPDATE public.lead_captures
   SET reference_id = 'UCX-' || upper(substr(replace(id::text, '-', ''), 1, 8))
 WHERE reference_id IS NULL;

ALTER TABLE public.lead_captures
  ALTER COLUMN reference_id SET DEFAULT ('UCX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));

CREATE UNIQUE INDEX IF NOT EXISTS lead_captures_reference_id_key
  ON public.lead_captures (reference_id);

CREATE INDEX IF NOT EXISTS lead_captures_email_lower_idx
  ON public.lead_captures (lower(email));