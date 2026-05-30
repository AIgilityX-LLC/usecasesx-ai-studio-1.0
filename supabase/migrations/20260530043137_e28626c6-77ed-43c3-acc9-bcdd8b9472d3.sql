
-- =========================================================================
-- TAXONOMY TABLES
-- =========================================================================
CREATE TABLE public.taxonomy_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxonomy_sectors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_sectors TO authenticated;
GRANT ALL ON public.taxonomy_sectors TO service_role;
ALTER TABLE public.taxonomy_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published sectors" ON public.taxonomy_sectors FOR SELECT USING (is_published = true);
CREATE POLICY "Admins read all sectors" ON public.taxonomy_sectors FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins manage sectors" ON public.taxonomy_sectors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TABLE public.taxonomy_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxonomy_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_tags TO authenticated;
GRANT ALL ON public.taxonomy_tags TO service_role;
ALTER TABLE public.taxonomy_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published tags" ON public.taxonomy_tags FOR SELECT USING (is_published = true);
CREATE POLICY "Admins read all tags" ON public.taxonomy_tags FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins manage tags" ON public.taxonomy_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TABLE public.taxonomy_maturity_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.taxonomy_maturity_levels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_maturity_levels TO authenticated;
GRANT ALL ON public.taxonomy_maturity_levels TO service_role;
ALTER TABLE public.taxonomy_maturity_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published maturity" ON public.taxonomy_maturity_levels FOR SELECT USING (is_published = true);
CREATE POLICY "Admins read all maturity" ON public.taxonomy_maturity_levels FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins manage maturity" ON public.taxonomy_maturity_levels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TABLE public.taxonomy_meta (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID
);
GRANT SELECT ON public.taxonomy_meta TO anon;
GRANT SELECT, INSERT, UPDATE ON public.taxonomy_meta TO authenticated;
GRANT ALL ON public.taxonomy_meta TO service_role;
ALTER TABLE public.taxonomy_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read taxonomy meta" ON public.taxonomy_meta FOR SELECT USING (true);
CREATE POLICY "Admins update taxonomy meta" ON public.taxonomy_meta FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

INSERT INTO public.taxonomy_meta (id, version) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_sectors_updated BEFORE UPDATE ON public.taxonomy_sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tags_updated BEFORE UPDATE ON public.taxonomy_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_maturity_updated BEFORE UPDATE ON public.taxonomy_maturity_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- RATINGS & FEEDBACK
-- =========================================================================
CREATE TABLE public.use_case_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (use_case_slug, user_id)
);
CREATE INDEX idx_ratings_slug ON public.use_case_ratings (use_case_slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_ratings TO authenticated;
GRANT ALL ON public.use_case_ratings TO service_role;
ALTER TABLE public.use_case_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rating" ON public.use_case_ratings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read ratings" ON public.use_case_ratings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TRIGGER trg_ratings_updated BEFORE UPDATE ON public.use_case_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.use_case_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL CHECK (length(comment) BETWEEN 1 AND 2000),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_slug ON public.use_case_feedback (use_case_slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_feedback TO authenticated;
GRANT ALL ON public.use_case_feedback TO service_role;
ALTER TABLE public.use_case_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.use_case_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all feedback" ON public.use_case_feedback FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON public.use_case_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aggregate view (security_invoker so RLS still applies to underlying table; we'll query via supabaseAdmin in the API)
CREATE OR REPLACE VIEW public.use_case_rating_aggregates AS
SELECT
  use_case_slug,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*)::INTEGER AS rating_count
FROM public.use_case_ratings
GROUP BY use_case_slug;

GRANT SELECT ON public.use_case_rating_aggregates TO anon, authenticated, service_role;
