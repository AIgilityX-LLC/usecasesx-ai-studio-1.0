GRANT SELECT ON public.use_case_feedback TO anon;

CREATE POLICY "Public read public visible feedback"
ON public.use_case_feedback
FOR SELECT
TO anon, authenticated
USING (is_public = true AND is_hidden = false);
