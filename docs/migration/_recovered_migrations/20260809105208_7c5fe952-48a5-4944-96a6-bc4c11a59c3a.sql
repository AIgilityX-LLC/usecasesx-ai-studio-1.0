-- The previous SELECT policy called workshop_is_member(), a STABLE function that
-- re-reads public.workshops. During INSERT ... RETURNING the new row is not yet
-- visible to that snapshot, so the creator could not read back the session they
-- had just created. Checking created_by directly on the candidate row avoids the
-- self-referential read.
DROP POLICY IF EXISTS "Workshop members read workshops" ON public.workshops;

CREATE POLICY "Workshop members read workshops"
ON public.workshops
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.workshop_is_member(id, auth.uid()));

DELETE FROM public.workshops WHERE title = 'probe no-return';
