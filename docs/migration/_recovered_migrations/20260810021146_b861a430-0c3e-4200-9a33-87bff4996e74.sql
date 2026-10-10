ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_key ON public.collections (slug) WHERE slug IS NOT NULL;
ALTER TABLE public.cta_events ADD COLUMN IF NOT EXISTS device text;
CREATE INDEX IF NOT EXISTS cta_events_created_at_idx ON public.cta_events (created_at DESC);
