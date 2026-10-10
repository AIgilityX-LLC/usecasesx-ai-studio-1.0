-- Bound and speed up the highest-traffic list reads (additive: indexes only).
CREATE INDEX IF NOT EXISTS idx_opportunities_updated_at
  ON public.opportunities USING btree (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_use_case_boards_ws_created
  ON public.use_case_boards USING btree (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_use_cases_user_saved_at
  ON public.saved_use_cases USING btree (user_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_created
  ON public.portfolios USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolios_ws_created
  ON public.portfolios USING btree (workspace_id, created_at DESC);
