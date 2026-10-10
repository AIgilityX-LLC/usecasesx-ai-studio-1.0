ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;
