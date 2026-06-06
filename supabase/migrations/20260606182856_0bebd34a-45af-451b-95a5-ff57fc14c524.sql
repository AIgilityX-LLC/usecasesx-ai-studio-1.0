-- Add 'editor' and 'user' to the app_role enum (admin already exists).
-- Enum value additions are idempotent via DO blocks.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'editor') THEN
    ALTER TYPE public.app_role ADD VALUE 'editor';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype AND enumlabel = 'user') THEN
    ALTER TYPE public.app_role ADD VALUE 'user';
  END IF;
END$$;