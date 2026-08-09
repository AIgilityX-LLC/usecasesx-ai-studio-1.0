INSERT INTO public.plans (code, name, description, sort_order)
VALUES
  ('lite', 'Lite', 'Public discovery of the AI use case repository.', 10),
  ('pro', 'Pro Founding Access', 'Registered professional use — complimentary through 31 December 2026, subject to fair-use limits.', 20),
  ('enterprise', 'Enterprise', 'Workspace-wide governance, advisory workshops and Enterprise Design Partner capabilities.', 30)
ON CONFLICT (code) DO NOTHING;