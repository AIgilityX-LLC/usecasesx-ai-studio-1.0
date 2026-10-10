CREATE TABLE public.pilot_onboarding_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id uuid REFERENCES public.pilot_invitations(id) ON DELETE SET NULL,
  cohort text NOT NULL,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  role_title text NOT NULL,
  organization text NOT NULL,
  sector text NOT NULL,
  country text,
  team_size text,
  ai_experience text NOT NULL,
  primary_goal text NOT NULL,
  expected_use_cases text,
  availability text,
  contact_consent boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort)
);

GRANT SELECT, INSERT, UPDATE ON public.pilot_onboarding_profiles TO authenticated;
GRANT ALL ON public.pilot_onboarding_profiles TO service_role;

ALTER TABLE public.pilot_onboarding_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own pilot onboarding"
ON public.pilot_onboarding_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));

CREATE POLICY "Participants create own pilot onboarding"
ON public.pilot_onboarding_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants update own pilot onboarding"
ON public.pilot_onboarding_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_pilot_onboarding_profiles_updated_at
BEFORE UPDATE ON public.pilot_onboarding_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX pilot_onboarding_profiles_cohort_idx ON public.pilot_onboarding_profiles (cohort);
