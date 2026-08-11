-- R2: authors may edit their own submitted workshop items but must not change status
DROP POLICY IF EXISTS "Authors edit unreviewed items" ON public.workshop_items;
CREATE POLICY "Authors edit unreviewed items"
ON public.workshop_items
FOR UPDATE
TO authenticated
USING (submitted_by = auth.uid() AND status = 'submitted'::text)
WITH CHECK (submitted_by = auth.uid() AND status = 'submitted'::text);

-- R3: analytics events cannot be attributed to another account
DROP POLICY IF EXISTS "Anyone can record module events" ON public.module_events;
CREATE POLICY "Anyone can record module events"
ON public.module_events
FOR INSERT
WITH CHECK (
  (event_type = ANY (ARRAY['view'::text, 'click'::text, 'lock_attempt'::text, 'unlock_attempt'::text]))
  AND (length(module_key) >= 1 AND length(module_key) <= 120)
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone log cta" ON public.cta_events;
CREATE POLICY "Anyone log cta"
ON public.cta_events
FOR INSERT
WITH CHECK (
  (length(COALESCE(cta, ''::text)) >= 1)
  AND (length(COALESCE(cta, ''::text)) <= 100)
  AND (length(COALESCE(target_platform, ''::text)) <= 100)
  AND (user_id IS NULL OR user_id = auth.uid())
);