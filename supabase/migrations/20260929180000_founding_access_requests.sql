-- Founding Access request → review → invite flow.
-- Pre-signup lead capture: anon may INSERT only. Admins review and invite.
-- Additive only.

CREATE TABLE IF NOT EXISTS public.founding_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  work_email text NOT NULL,
  organization text NOT NULL,
  role_title text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  notes text,
  invite_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founding_access_requests_email_format
    CHECK (
      work_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      AND length(work_email) BETWEEN 3 AND 320
    ),
  CONSTRAINT founding_access_requests_name_len
    CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  CONSTRAINT founding_access_requests_org_len
    CHECK (length(trim(organization)) BETWEEN 1 AND 200)
);

-- One open request per email; history of decided rows is allowed.
CREATE UNIQUE INDEX IF NOT EXISTS founding_access_requests_pending_email_key
  ON public.founding_access_requests (lower(work_email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS founding_access_requests_status_requested_idx
  ON public.founding_access_requests (status, requested_at DESC);

GRANT INSERT ON public.founding_access_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.founding_access_requests TO authenticated;
GRANT ALL ON public.founding_access_requests TO service_role;

ALTER TABLE public.founding_access_requests ENABLE ROW LEVEL SECURITY;

-- Anon / authenticated: INSERT only (column whitelist via WITH CHECK).
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

-- No SELECT / UPDATE / DELETE policies for anon → denied by default.

DROP POLICY IF EXISTS "Admins read founding access requests" ON public.founding_access_requests;
CREATE POLICY "Admins read founding access requests"
  ON public.founding_access_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin_tier(auth.uid()));

DROP POLICY IF EXISTS "Admins update founding access requests" ON public.founding_access_requests;
CREATE POLICY "Admins update founding access requests"
  ON public.founding_access_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

DROP TRIGGER IF EXISTS founding_access_requests_updated_at ON public.founding_access_requests;
CREATE TRIGGER founding_access_requests_updated_at
  BEFORE UPDATE ON public.founding_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
