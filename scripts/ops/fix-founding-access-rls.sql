-- =============================================================================
-- FIX + VERIFY — paste whole block into Supabase SQL Editor → Run
--
-- Root cause of prior failure:
--   INSERT ... RETURNING under RLS also requires a SELECT policy for the role.
--   Anon is INSERT-only (no SELECT) by design, so RETURNING always errors with:
--   "new row violates row-level security policy"
--   That is NOT an INSERT-policy failure — remove RETURNING when testing as anon.
-- =============================================================================

DO $$
BEGIN
  BEGIN
    EXECUTE 'GRANT anon TO postgres';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

DROP POLICY IF EXISTS "Anyone can submit founding access request" ON public.founding_access_requests;
CREATE POLICY "Anyone can submit founding access request"
  ON public.founding_access_requests
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    coalesce(status, 'pending') = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND notes IS NULL
    AND invite_user_id IS NULL
    AND work_email IS NOT NULL
    AND length(work_email) BETWEEN 3 AND 320
    AND work_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(trim(full_name)) BETWEEN 1 AND 120
    AND length(trim(organization)) BETWEEN 1 AND 200
  );

GRANT INSERT ON public.founding_access_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.founding_access_requests TO authenticated;
GRANT ALL ON public.founding_access_requests TO service_role;

RESET ROLE;
DELETE FROM public.founding_access_requests WHERE lower(work_email) = 'rls-test-anon@example.org';

-- ── As anon ─────────────────────────────────────────────────────────────────
SET ROLE anon;
SELECT current_user AS as_role; -- expect: anon

-- 1) INSERT without RETURNING (RETURNING needs SELECT policy — anon must not have one)
INSERT INTO public.founding_access_requests (full_name, work_email, organization, role_title)
VALUES ('RLS Test User', 'rls-test-anon@example.org', 'Test Org', 'Tester');
-- expect: INSERT 0 1  (success, no error)

-- 2) SELECT must see nothing
SELECT count(*) AS anon_visible FROM public.founding_access_requests;
-- expect: 0

-- 3) UPDATE must change nothing
UPDATE public.founding_access_requests
SET status = 'approved'
WHERE work_email = 'rls-test-anon@example.org';
-- expect: UPDATE 0

-- 4) DELETE must change nothing
DELETE FROM public.founding_access_requests WHERE work_email = 'rls-test-anon@example.org';
-- expect: DELETE 0

RESET ROLE;

-- Owner confirms the row was actually inserted, then cleans up
SELECT id, status, work_email
FROM public.founding_access_requests
WHERE lower(work_email) = 'rls-test-anon@example.org';
-- expect: 1 row, status = pending

DELETE FROM public.founding_access_requests WHERE lower(work_email) = 'rls-test-anon@example.org';

SELECT 'RLS OK — anon can insert; cannot select/update/delete; RETURNING not used for anon' AS result;
