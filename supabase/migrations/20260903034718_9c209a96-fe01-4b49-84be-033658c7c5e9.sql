CREATE TABLE public.ai_engines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  provider text NOT NULL,
  tagline text,
  route text NOT NULL DEFAULT 'gateway',
  model_id text NOT NULL,
  base_url text,
  tier text NOT NULL DEFAULT 'balanced',
  enabled boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  allow_workspace_keys boolean NOT NULL DEFAULT true,
  fallback_to_default boolean NOT NULL DEFAULT true,
  editions text[] NOT NULL DEFAULT ARRAY['pro','enterprise']::text[],
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_engines TO authenticated;
GRANT ALL ON public.ai_engines TO service_role;
ALTER TABLE public.ai_engines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read engines"
  ON public.ai_engines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins manage engines"
  ON public.ai_engines FOR ALL TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));

CREATE TABLE public.ai_engine_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_slug text NOT NULL UNIQUE REFERENCES public.ai_engines(slug) ON DELETE CASCADE,
  key_ciphertext text NOT NULL,
  key_hint text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_engine_credentials TO service_role;
ALTER TABLE public.ai_engine_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_ai_engines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  engine_slug text NOT NULL REFERENCES public.ai_engines(slug) ON DELETE CASCADE,
  key_ciphertext text NOT NULL,
  key_hint text,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, engine_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_ai_engines TO authenticated;
GRANT ALL ON public.workspace_ai_engines TO service_role;
ALTER TABLE public.workspace_ai_engines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace managers read their engine keys"
  ON public.workspace_ai_engines FOR SELECT TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace managers add engine keys"
  ON public.workspace_ai_engines FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace managers update engine keys"
  ON public.workspace_ai_engines FOR UPDATE TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace managers delete engine keys"
  ON public.workspace_ai_engines FOR DELETE TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id));

CREATE TRIGGER update_ai_engines_updated_at BEFORE UPDATE ON public.ai_engines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_engine_credentials_updated_at BEFORE UPDATE ON public.ai_engine_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workspace_ai_engines_updated_at BEFORE UPDATE ON public.workspace_ai_engines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_engines (slug, label, provider, tagline, route, model_id, base_url, tier, enabled, is_default, editions, sort_order) VALUES
  ('conversx', 'ConversX', 'lovable', 'Conversational research engine', 'gateway', 'google/gemini-3.1-pro-preview', NULL, 'deep', true, true, ARRAY['free_lite','pro','enterprise']::text[], 10),
  ('openai', 'OpenAI', 'lovable', 'GPT family · deep reasoning', 'gateway', 'openai/gpt-5.4-mini', NULL, 'balanced', true, false, ARRAY['free_lite','pro','enterprise']::text[], 20),
  ('gemini', 'Gemini', 'lovable', 'Fast, multimodal research', 'gateway', 'google/gemini-3.6-flash', NULL, 'balanced', true, false, ARRAY['free_lite','pro','enterprise']::text[], 30),
  ('openai-api', 'OpenAI (own key)', 'openai', 'Direct OpenAI API with your key', 'openai-compatible', 'gpt-4o-mini', 'https://api.openai.com/v1', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 40),
  ('kimi', 'KIMI (Moonshot)', 'moonshot', 'Moonshot long-context research', 'openai-compatible', 'moonshot-v1-32k', 'https://api.moonshot.cn/v1', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 50),
  ('deepseek', 'DeepSeek', 'deepseek', 'DeepSeek reasoning models', 'openai-compatible', 'deepseek-chat', 'https://api.deepseek.com/v1', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 60),
  ('gemini-api', 'Gemini (own key)', 'google', 'Direct Google AI API with your key', 'openai-compatible', 'gemini-2.0-flash', 'https://generativelanguage.googleapis.com/v1beta/openai', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 70);