CREATE TABLE IF NOT EXISTS public.portfolio_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  label text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_shares_token_key ON public.portfolio_shares(token);
CREATE INDEX IF NOT EXISTS portfolio_shares_portfolio_idx ON public.portfolio_shares(portfolio_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_shares TO authenticated;
GRANT ALL ON public.portfolio_shares TO service_role;

ALTER TABLE public.portfolio_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readable by portfolio readers"
ON public.portfolio_shares FOR SELECT TO authenticated
USING (public.portfolio_is_readable(portfolio_id, auth.uid()));

CREATE POLICY "Writable by portfolio writers"
ON public.portfolio_shares FOR INSERT TO authenticated
WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Updatable by portfolio writers"
ON public.portfolio_shares FOR UPDATE TO authenticated
USING (public.portfolio_is_writable(portfolio_id, auth.uid()))
WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()));

CREATE POLICY "Deletable by portfolio writers"
ON public.portfolio_shares FOR DELETE TO authenticated
USING (public.portfolio_is_writable(portfolio_id, auth.uid()));

CREATE TRIGGER update_portfolio_shares_updated_at
BEFORE UPDATE ON public.portfolio_shares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
