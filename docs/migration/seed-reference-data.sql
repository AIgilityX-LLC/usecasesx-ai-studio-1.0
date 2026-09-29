-- Reference / lookup seed data recovered from migration history.
-- Sources under docs/migration/_recovered_migrations/
-- Intentionally omitted from docs/migration/full-schema.sql (DDL-only).
-- Idempotent via ON CONFLICT where a unique/PK key exists.
-- Do not treat as user/content corpus seed (use scripts/seed/apply-launch-corpus.mjs for that).

-- ---------------------------------------------------------------------------
-- plans  (canonical: 20260902125308_c2d8ef9a-a79d-4884-b89b-8b4e7b76a4a9.sql)
-- Earlier seeds used pro_founding / different sort_order; superseded by lite|pro|enterprise.
-- Required by ensure_user_workspace → entitlements.plan_code = 'lite'
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (code, name, description, sort_order) VALUES
  ('lite', 'Lite', 'Public discovery of the AI use case repository.', 1),
  ('pro', 'Pro Founding Access', 'Complimentary professional access through 31 December 2026, subject to fair use.', 2),
  ('enterprise', 'Enterprise', 'Enterprise programme access with additional roles and governance features.', 3)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- industries / business_functions / ai_capabilities / business_objectives
-- Source: 20260902130612_bd877000-1bcf-4c58-b60a-45d1e37435d8.sql
-- ---------------------------------------------------------------------------
INSERT INTO public.industries(slug,name) VALUES
  ('airlines-aviation','Airlines & Aviation'),
  ('automotive','Automotive & Mobility'),
  ('banking','Banking & Financial Services'),
  ('defense','Defence & National Security'),
  ('education','Education & Research'),
  ('food-agribusiness','Food & Agribusiness'),
  ('government','Government & Public Sector'),
  ('healthcare','Healthcare & Life Sciences'),
  ('hospitality','Hospitality & Tourism'),
  ('law-enforcement','Law Enforcement & Justice'),
  ('logistics','Logistics & Freight'),
  ('manufacturing','Manufacturing & Industrials'),
  ('media','Media & Entertainment'),
  ('pharma','Pharmaceuticals & Biotech'),
  ('real-estate','Real Estate & Facilities'),
  ('regulatory-compliance','Regulators & Compliance Bodies'),
  ('retail','Retail & Consumer'),
  ('transport-travel','Transport & Travel')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;

INSERT INTO public.business_functions(slug,name) VALUES
  ('clinical-operations','Clinical Operations'),
  ('customer-service','Customer Service'),
  ('data-and-analytics','Data & Analytics'),
  ('field-operations','Field Operations'),
  ('finance','Finance'),
  ('human-resources','Human Resources'),
  ('it-and-security','IT & Security'),
  ('legal','Legal'),
  ('logistics','Logistics'),
  ('maintenance','Maintenance'),
  ('marketing-and-sales','Marketing & Sales'),
  ('operations','Operations'),
  ('procurement','Procurement'),
  ('product-management','Product Management'),
  ('public-services','Public Services'),
  ('quality-assurance','Quality Assurance'),
  ('research-and-development','Research & Development'),
  ('risk-and-compliance','Risk & Compliance'),
  ('strategy-and-planning','Strategy & Planning'),
  ('supply-chain','Supply Chain')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;

INSERT INTO public.ai_capabilities(slug,name) VALUES
  ('anomaly-detection','Anomaly detection'),
  ('automl','AutoML'),
  ('computer-vision','Computer vision'),
  ('conversational-ai','Conversational AI'),
  ('decision-intelligence','Decision intelligence'),
  ('edge-ai','Edge AI'),
  ('generative-ai','Generative AI'),
  ('knowledge-graphs','Knowledge graphs'),
  ('llm-agents','LLM agents'),
  ('multimodal-ai','Multimodal AI'),
  ('nlp','Natural language processing'),
  ('ocr-document-ai','Document AI'),
  ('predictive-analytics','Predictive analytics'),
  ('process-mining-ai','Process Mining AI'),
  ('rag','Retrieval-augmented generation'),
  ('recommender-systems','Recommender systems'),
  ('reinforcement-learning','Reinforcement learning'),
  ('speech-ai','Speech AI'),
  ('synthetic-data','Synthetic data'),
  ('time-series-forecasting','Time-series forecasting')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;

INSERT INTO public.business_objectives(slug,name) VALUES
  ('citizen-services','Citizen Services'),
  ('cost-reduction','Cost Reduction'),
  ('customer-experience','Customer Experience'),
  ('cybersecurity','Cybersecurity'),
  ('data-monetization','Data Monetization'),
  ('decision-support','Decision Support'),
  ('fraud-prevention','Fraud Prevention'),
  ('innovation','Innovation'),
  ('operational-efficiency','Operational Efficiency'),
  ('personalization','Personalization'),
  ('quality-improvement','Quality Improvement'),
  ('regulatory-reporting','Regulatory Reporting'),
  ('revenue-growth','Revenue Growth'),
  ('risk-and-compliance','Risk & Compliance'),
  ('sustainability','Sustainability'),
  ('time-to-market','Time To Market'),
  ('workforce-productivity','Workforce Productivity')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name;

-- ---------------------------------------------------------------------------
-- taxonomy_sectors
-- Source: 20260902131119_acc530f9-db76-4d68-a25c-7d198a55fba6.sql
-- ---------------------------------------------------------------------------
INSERT INTO public.taxonomy_sectors(slug,name,sort_order,is_published,status)
VALUES
  ('airlines-aviation','Airlines & Aviation',1,true,'published'),
  ('automotive','Automotive & Mobility',2,true,'published'),
  ('banking','Banking & Financial Services',3,true,'published'),
  ('defense','Defence & National Security',4,true,'published'),
  ('education','Education & Research',5,true,'published'),
  ('food-agribusiness','Food & Agribusiness',6,true,'published'),
  ('government','Government & Public Sector',7,true,'published'),
  ('healthcare','Healthcare & Life Sciences',8,true,'published'),
  ('hospitality','Hospitality & Tourism',9,true,'published'),
  ('law-enforcement','Law Enforcement & Justice',10,true,'published'),
  ('logistics','Logistics & Freight',11,true,'published'),
  ('manufacturing','Manufacturing & Industrials',12,true,'published'),
  ('media','Media & Entertainment',13,true,'published'),
  ('pharma','Pharmaceuticals & Biotech',14,true,'published'),
  ('real-estate','Real Estate & Facilities',15,true,'published'),
  ('regulatory-compliance','Regulators & Compliance Bodies',16,true,'published'),
  ('retail','Retail & Consumer',17,true,'published'),
  ('transport-travel','Transport & Travel',18,true,'published')
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name,
  sort_order=EXCLUDED.sort_order,
  is_published=true,
  status='published',
  updated_at=now();

-- ---------------------------------------------------------------------------
-- ai_engines
-- Source: 20260903034718_9c209a96-fe01-4b49-84be-033658c7c5e9.sql
-- Tagline for openai: recovered file had mojibake "┬À"; restored as middle-dot.
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_engines (slug, label, provider, tagline, route, model_id, base_url, tier, enabled, is_default, editions, sort_order) VALUES
  ('conversx', 'ConversX', 'lovable', 'Conversational research engine', 'gateway', 'google/gemini-3.1-pro-preview', NULL, 'deep', true, true, ARRAY['free_lite','pro','enterprise']::text[], 10),
  ('openai', 'OpenAI', 'lovable', 'GPT family · deep reasoning', 'gateway', 'openai/gpt-5.4-mini', NULL, 'balanced', true, false, ARRAY['free_lite','pro','enterprise']::text[], 20),
  ('gemini', 'Gemini', 'lovable', 'Fast, multimodal research', 'gateway', 'google/gemini-3.6-flash', NULL, 'balanced', true, false, ARRAY['free_lite','pro','enterprise']::text[], 30),
  ('openai-api', 'OpenAI (own key)', 'openai', 'Direct OpenAI API with your key', 'openai-compatible', 'gpt-4o-mini', 'https://api.openai.com/v1', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 40),
  ('kimi', 'KIMI (Moonshot)', 'moonshot', 'Moonshot long-context research', 'openai-compatible', 'moonshot-v1-32k', 'https://api.moonshot.cn/v1', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 50),
  ('deepseek', 'DeepSeek', 'deepseek', 'DeepSeek reasoning models', 'openai-compatible', 'deepseek-chat', 'https://api.deepseek.com/v1', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 60),
  ('gemini-api', 'Gemini (own key)', 'google', 'Direct Google AI API with your key', 'openai-compatible', 'gemini-2.0-flash', 'https://generativelanguage.googleapis.com/v1beta/openai', 'balanced', false, false, ARRAY['pro','enterprise']::text[], 70)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- pilot_settings  (singleton row)
-- Source: 20260811043346_b61bc27d-656a-418c-a4bc-883d2040dda7.sql
-- ---------------------------------------------------------------------------
INSERT INTO public.pilot_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- taxonomy_meta  (singleton version row)
-- Source: 20260530043137_e28626c6-77ed-43c3-acc9-bcdd8b9472d3.sql
-- ---------------------------------------------------------------------------
INSERT INTO public.taxonomy_meta (id, version) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- cron_hook_tokens  (ops bootstrap; random token generated once)
-- Source: 20260902124547_9f329cfb-9e55-41cf-ab0f-3cfc79b65f78.sql
-- ---------------------------------------------------------------------------
INSERT INTO public.cron_hook_tokens (name, token)
VALUES ('launch-checks', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;
