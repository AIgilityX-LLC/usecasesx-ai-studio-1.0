ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'pro_free',
  ADD COLUMN IF NOT EXISTS user_role text NOT NULL DEFAULT 'registered_pro_user';