ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS delivery_stage text NOT NULL DEFAULT 'unscheduled',
  ADD COLUMN IF NOT EXISTS planned_start_date date,
  ADD COLUMN IF NOT EXISTS planned_end_date date,
  ADD COLUMN IF NOT EXISTS milestone text,
  ADD COLUMN IF NOT EXISTS delivery_owner text,
  ADD COLUMN IF NOT EXISTS depends_on uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blocked_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'portfolio_items_delivery_stage_check'
  ) THEN
    ALTER TABLE public.portfolio_items
      ADD CONSTRAINT portfolio_items_delivery_stage_check
      CHECK (delivery_stage IN ('now','next','later','unscheduled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS portfolio_items_delivery_stage_idx
  ON public.portfolio_items (portfolio_id, delivery_stage);