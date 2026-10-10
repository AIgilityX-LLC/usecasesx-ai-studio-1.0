-- 1) use_case_deliverables: scope policy to authenticated
DROP POLICY IF EXISTS "Members access deliverables" ON public.use_case_deliverables;
CREATE POLICY "Members access deliverables"
ON public.use_case_deliverables
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.user_can_access_use_case(auth.uid(), use_case_id)
  OR public.is_admin_tier(auth.uid())
)
WITH CHECK (
  public.user_can_access_use_case(auth.uid(), use_case_id)
  OR public.is_admin_tier(auth.uid())
);

-- 2) lead_captures: restrict INSERT to anon + authenticated explicitly (drop broad public grant)
DROP POLICY IF EXISTS "Anyone can submit lead" ON public.lead_captures;
CREATE POLICY "Anyone can submit lead"
ON public.lead_captures
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
