
-- Platform modules taxonomy (for getPlatformModules + recommended_platforms reference)
CREATE TABLE public.platform_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  external_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_modules TO anon, authenticated;
GRANT ALL ON public.platform_modules TO service_role;
ALTER TABLE public.platform_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read platform modules" ON public.platform_modules
  FOR SELECT TO public USING (is_published = true);
CREATE POLICY "Admins manage platform modules" ON public.platform_modules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Pro: saved use cases (richer than shortlists ÔÇö priority + note)
CREATE TABLE public.saved_use_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  note text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, use_case_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_use_cases TO authenticated;
GRANT ALL ON public.saved_use_cases TO service_role;
ALTER TABLE public.saved_use_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved use cases" ON public.saved_use_cases
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pro: use case scoring
CREATE TABLE public.use_case_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  strategic smallint NOT NULL DEFAULT 0,
  value smallint NOT NULL DEFAULT 0,
  feasibility smallint NOT NULL DEFAULT 0,
  risk smallint NOT NULL DEFAULT 0,
  readiness smallint NOT NULL DEFAULT 0,
  ttv smallint NOT NULL DEFAULT 0,
  total smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, use_case_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_scores TO authenticated;
GRANT ALL ON public.use_case_scores TO service_role;
ALTER TABLE public.use_case_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own scores" ON public.use_case_scores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pro: portfolios
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  objective text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own portfolios" ON public.portfolios
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.portfolio_items (
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  use_case_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, use_case_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own portfolio items" ON public.portfolio_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_items.portfolio_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_items.portfolio_id AND p.user_id = auth.uid()));

-- Pro: generated reports
CREATE TABLE public.generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  kind text NOT NULL,
  use_case_count integer NOT NULL DEFAULT 0,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT ALL ON public.generated_reports TO service_role;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reports" ON public.generated_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Analytics: use case views (impressions)
CREATE TABLE public.use_case_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  source_page text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.use_case_views TO anon, authenticated;
GRANT SELECT ON public.use_case_views TO authenticated;
GRANT ALL ON public.use_case_views TO service_role;
ALTER TABLE public.use_case_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone log view" ON public.use_case_views
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins read views" ON public.use_case_views
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Analytics: downloads
CREATE TABLE public.use_case_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  asset_kind text,
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.use_case_downloads TO anon, authenticated;
GRANT SELECT ON public.use_case_downloads TO authenticated;
GRANT ALL ON public.use_case_downloads TO service_role;
ALTER TABLE public.use_case_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone log download" ON public.use_case_downloads
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins read downloads" ON public.use_case_downloads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Integration events (cross-module activity log)
CREATE TABLE public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  source_module text NOT NULL,
  target_module text NOT NULL,
  event_type text NOT NULL,
  use_case_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.integration_events TO anon, authenticated;
GRANT SELECT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone log integration event" ON public.integration_events
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users read own integration events" ON public.integration_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- External module links (deep-link contracts to other AigilityX modules)
CREATE TABLE public.external_module_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL,
  module text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_module_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.external_module_links TO authenticated;
GRANT ALL ON public.external_module_links TO service_role;
ALTER TABLE public.external_module_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read external module links" ON public.external_module_links
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = external_module_links.use_case_id AND u.status = 'published'));
CREATE POLICY "Admins manage external module links" ON public.external_module_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- updated_at triggers
CREATE TRIGGER trg_platform_modules_updated BEFORE UPDATE ON public.platform_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scores_updated BEFORE UPDATE ON public.use_case_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portfolios_updated BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX idx_saved_user ON public.saved_use_cases(user_id);
CREATE INDEX idx_scores_user ON public.use_case_scores(user_id);
CREATE INDEX idx_portfolios_user ON public.portfolios(user_id);
CREATE INDEX idx_views_uc ON public.use_case_views(use_case_id);
CREATE INDEX idx_downloads_uc ON public.use_case_downloads(use_case_id);
CREATE INDEX idx_integration_user ON public.integration_events(user_id);
CREATE INDEX idx_extlinks_uc ON public.external_module_links(use_case_id);
