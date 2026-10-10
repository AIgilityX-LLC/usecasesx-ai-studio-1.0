INSERT INTO public.plans (code, name, description, sort_order) VALUES
  ('lite', 'Lite', 'Public discovery of the AI use case repository.', 1),
  ('pro', 'Pro Founding Access', 'Complimentary professional access through 31 December 2026, subject to fair use.', 2),
  ('enterprise', 'Enterprise', 'Enterprise programme access with additional roles and governance features.', 3)
ON CONFLICT (code) DO NOTHING;
