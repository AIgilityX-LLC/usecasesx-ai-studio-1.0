ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS entitlement_tier text NOT NULL DEFAULT 'lite',
  ADD COLUMN IF NOT EXISTS entitlement_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS founding_member boolean NOT NULL DEFAULT false;

ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS eligible boolean,
  ADD COLUMN IF NOT EXISTS waitlist_status text NOT NULL DEFAULT 'pending';
