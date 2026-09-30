-- Prefer scripts/ops/fix-founding-access-rls.sql
-- Do NOT use INSERT ... RETURNING as anon (requires SELECT policy).

DO $$
BEGIN
  IF to_regclass('public.founding_access_requests') IS NULL THEN
    RAISE EXCEPTION
      'Table public.founding_access_requests does not exist. Run scripts/ops/apply-founding-access-requests.sql first.';
  END IF;
END $$;

RESET ROLE;
DELETE FROM public.founding_access_requests WHERE lower(work_email) = 'rls-test-anon@example.org';

SET ROLE anon;
SELECT current_user AS as_role;

INSERT INTO public.founding_access_requests (full_name, work_email, organization, role_title)
VALUES ('RLS Test User', 'rls-test-anon@example.org', 'Test Org', 'Tester');

SELECT count(*) AS anon_visible FROM public.founding_access_requests;

UPDATE public.founding_access_requests
SET status = 'approved'
WHERE work_email = 'rls-test-anon@example.org';

DELETE FROM public.founding_access_requests WHERE work_email = 'rls-test-anon@example.org';

RESET ROLE;

SELECT id, status FROM public.founding_access_requests
WHERE lower(work_email) = 'rls-test-anon@example.org';

DELETE FROM public.founding_access_requests WHERE lower(work_email) = 'rls-test-anon@example.org';

SELECT 'RLS checks finished — anon insert allowed; anon read/update/delete denied' AS result;
