ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS portfolio_type text NOT NULL DEFAULT 'Custom Portfolio',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS target_department text,
  ADD COLUMN IF NOT EXISTS target_quarter text;
