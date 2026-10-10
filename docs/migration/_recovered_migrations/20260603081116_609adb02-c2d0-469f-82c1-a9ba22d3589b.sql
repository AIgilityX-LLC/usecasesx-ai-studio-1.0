-- Helper: any admin-tier role
CREATE OR REPLACE FUNCTION public.is_admin_tier(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'moderator'::public.app_role)
    OR public.has_role(_user_id, 'super_admin'::public.app_role)
    OR public.has_role(_user_id, 'ai_hub_admin'::public.app_role)
    OR public.has_role(_user_id, 'usecasex_admin'::public.app_role)
    OR public.has_role(_user_id, 'content_manager'::public.app_role)
    OR public.has_role(_user_id, 'reviewer'::public.app_role)
$$;

-- lead_captures
DROP POLICY IF EXISTS "Admins read leads" ON public.lead_captures;
CREATE POLICY "Admins read leads"
  ON public.lead_captures FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Admins update leads" ON public.lead_captures;
CREATE POLICY "Admins update leads"
  ON public.lead_captures FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

-- cta_events
DROP POLICY IF EXISTS "Admins read cta" ON public.cta_events;
CREATE POLICY "Admins read cta"
  ON public.cta_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

-- use_case_views
DROP POLICY IF EXISTS "Admins read views" ON public.use_case_views;
CREATE POLICY "Admins read views"
  ON public.use_case_views FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

-- use_case_downloads
DROP POLICY IF EXISTS "Admins read downloads" ON public.use_case_downloads;
CREATE POLICY "Admins read downloads"
  ON public.use_case_downloads FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));

-- use_case_ratings
DROP POLICY IF EXISTS "Admins read ratings" ON public.use_case_ratings;
CREATE POLICY "Admins read ratings"
  ON public.use_case_ratings FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
