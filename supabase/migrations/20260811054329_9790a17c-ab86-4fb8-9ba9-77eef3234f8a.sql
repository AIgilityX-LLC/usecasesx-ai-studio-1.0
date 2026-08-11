-- ============================================================ data exports
CREATE TABLE public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  organization_id uuid,
  status text NOT NULL DEFAULT 'pending',
  progress integer NOT NULL DEFAULT 0,
  scope text[] NOT NULL DEFAULT ARRAY['profile','opportunities','use_cases','portfolios','saved','feedback','consents'],
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb,
  payload_bytes integer NOT NULL DEFAULT 0,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_export_status_check CHECK (status IN ('pending','processing','ready','failed','expired')),
  CONSTRAINT data_export_progress_check CHECK (progress BETWEEN 0 AND 100)
);

GRANT SELECT, INSERT, UPDATE ON public.data_export_requests TO authenticated;
GRANT ALL ON public.data_export_requests TO service_role;

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own export requests"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Users create own export requests"
  ON public.data_export_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own export requests"
  ON public.data_export_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX data_export_requests_user_idx
  ON public.data_export_requests (user_id, requested_at DESC);

CREATE TRIGGER update_data_export_requests_updated_at
  BEFORE UPDATE ON public.data_export_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================================== data deletions
CREATE TABLE public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  organization_id uuid,
  status text NOT NULL DEFAULT 'scheduled',
  reason text,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  grace_days integer NOT NULL DEFAULT 30,
  requested_at timestamptz NOT NULL DEFAULT now(),
  effective_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_deletion_status_check CHECK (status IN ('scheduled','cancelled','processing','completed','failed')),
  CONSTRAINT data_deletion_grace_check CHECK (grace_days BETWEEN 0 AND 90)
);

GRANT SELECT, INSERT, UPDATE ON public.data_deletion_requests TO authenticated;
GRANT ALL ON public.data_deletion_requests TO service_role;

ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own deletion requests"
  ON public.data_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Users create own deletion requests"
  ON public.data_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own deletion requests"
  ON public.data_deletion_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX data_deletion_requests_user_idx
  ON public.data_deletion_requests (user_id, requested_at DESC);

CREATE TRIGGER update_data_deletion_requests_updated_at
  BEFORE UPDATE ON public.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================== consent log
CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  organization_id uuid,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL DEFAULT 'v1',
  source text NOT NULL DEFAULT 'banner',
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_source_check CHECK (source IN ('banner','preferences_center','account','import'))
);

GRANT SELECT, INSERT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Users record own consent"
  ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX consent_records_user_idx
  ON public.consent_records (user_id, decided_at DESC);

CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();