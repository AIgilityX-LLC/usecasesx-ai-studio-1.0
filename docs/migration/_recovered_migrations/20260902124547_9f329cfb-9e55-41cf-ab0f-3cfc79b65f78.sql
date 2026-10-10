CREATE TABLE IF NOT EXISTS public.cron_hook_tokens (
  name text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cron_hook_tokens TO service_role;
ALTER TABLE public.cron_hook_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cron_hook_tokens (name, token)
VALUES ('launch-checks', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;
