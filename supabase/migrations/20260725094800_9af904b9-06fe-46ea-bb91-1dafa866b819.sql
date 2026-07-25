DROP POLICY IF EXISTS "Anyone can submit lead" ON public.lead_captures;
CREATE POLICY "Anyone can submit lead"
ON public.lead_captures
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
