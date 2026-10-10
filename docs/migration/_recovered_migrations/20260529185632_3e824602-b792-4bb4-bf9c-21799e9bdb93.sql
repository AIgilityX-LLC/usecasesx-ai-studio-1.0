
DROP POLICY IF EXISTS "Anyone can submit lead" ON public.lead_captures;
CREATE POLICY "Anyone can submit lead" ON public.lead_captures FOR INSERT
  WITH CHECK (
    length(coalesce(full_name,'')) BETWEEN 1 AND 200
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(email) BETWEEN 5 AND 320
  );

DROP POLICY IF EXISTS "Anyone log cta" ON public.cta_events;
CREATE POLICY "Anyone log cta" ON public.cta_events FOR INSERT
  WITH CHECK (
    length(coalesce(cta,'')) BETWEEN 1 AND 100
    AND length(coalesce(target_platform,'')) <= 100
  );
