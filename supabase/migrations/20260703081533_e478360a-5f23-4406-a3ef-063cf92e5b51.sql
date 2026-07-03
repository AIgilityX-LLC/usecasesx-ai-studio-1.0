ALTER TABLE public.use_cases
  ADD COLUMN IF NOT EXISTS security_classification text,
  ADD COLUMN IF NOT EXISTS deployment_model text,
  ADD COLUMN IF NOT EXISTS cost_range text;

COMMENT ON COLUMN public.use_cases.security_classification IS 'Security classification e.g. Public, Official, Secret, Top Secret';
COMMENT ON COLUMN public.use_cases.deployment_model IS 'Deployment model e.g. Cloud, On-Premise, Hybrid, Air-Gapped, Sovereign Cloud';
COMMENT ON COLUMN public.use_cases.cost_range IS 'Indicative cost range e.g. $, $$, $$$ or a band label';