-- ============ Submission status enum ============
DO $$ BEGIN
  CREATE TYPE public.submission_status AS ENUM ('draft','submitted','in_review','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 1. use_case_submissions ============
CREATE TABLE public.use_case_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  business_problem text,
  ai_solution text,
  industry text,
  sector text,
  tags text[] NOT NULL DEFAULT '{}',
  sources text[] NOT NULL DEFAULT '{}',
  status public.submission_status NOT NULL DEFAULT 'draft',
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_submissions TO authenticated;
GRANT ALL ON public.use_case_submissions TO service_role;

ALTER TABLE public.use_case_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions" ON public.use_case_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Users create own submissions" ON public.use_case_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users edit own draft submissions" ON public.use_case_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('draft','submitted'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update submissions" ON public.use_case_submissions
  FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE POLICY "Users delete own draft submissions" ON public.use_case_submissions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

CREATE TRIGGER trg_submissions_updated
  BEFORE UPDATE ON public.use_case_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. collections ============
CREATE TABLE public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX collections_share_token_idx ON public.collections(share_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT ON public.collections TO anon;
GRANT ALL ON public.collections TO service_role;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage collections" ON public.collections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public collections readable by authenticated" ON public.collections
  FOR SELECT TO authenticated
  USING (is_public = true);

CREATE POLICY "Public collections readable by anon" ON public.collections
  FOR SELECT TO anon
  USING (is_public = true);

CREATE TRIGGER trg_collections_updated
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is a collection owned by user, or public?
CREATE OR REPLACE FUNCTION public.collection_is_accessible(_collection_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = _collection_id
      AND (c.user_id = _user_id OR c.is_public = true)
  )
$$;

CREATE OR REPLACE FUNCTION public.collection_is_owned(_collection_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = _collection_id AND c.user_id = _user_id
  )
$$;

-- ============ 3. collection_items ============
CREATE TABLE public.collection_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  use_case_id uuid NOT NULL REFERENCES public.use_cases(id) ON DELETE CASCADE,
  note text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, use_case_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
GRANT SELECT ON public.collection_items TO anon;
GRANT ALL ON public.collection_items TO service_role;

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read items of accessible collections" ON public.collection_items
  FOR SELECT TO authenticated
  USING (public.collection_is_accessible(collection_id, auth.uid()));

CREATE POLICY "Read items of public collections anon" ON public.collection_items
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.is_public = true));

CREATE POLICY "Owners insert items" ON public.collection_items
  FOR INSERT TO authenticated
  WITH CHECK (public.collection_is_owned(collection_id, auth.uid()));

CREATE POLICY "Owners update items" ON public.collection_items
  FOR UPDATE TO authenticated
  USING (public.collection_is_owned(collection_id, auth.uid()))
  WITH CHECK (public.collection_is_owned(collection_id, auth.uid()));

CREATE POLICY "Owners delete items" ON public.collection_items
  FOR DELETE TO authenticated
  USING (public.collection_is_owned(collection_id, auth.uid()));

-- ============ 4. module_events ============
CREATE TABLE public.module_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  module_key text NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX module_events_module_idx ON public.module_events(module_key);
CREATE INDEX module_events_user_idx ON public.module_events(user_id);

GRANT SELECT, INSERT ON public.module_events TO authenticated;
GRANT INSERT ON public.module_events TO anon;
GRANT ALL ON public.module_events TO service_role;

ALTER TABLE public.module_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record module events" ON public.module_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IN ('view','click','lock_attempt','unlock_attempt')
    AND length(module_key) BETWEEN 1 AND 120
  );

CREATE POLICY "Users read own module events" ON public.module_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));