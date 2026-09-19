-- Restore DEFAULT on use_case_boards.status (lost during full-schema rebuild).
-- Original migration: status text NOT NULL DEFAULT 'active'
-- Safe to re-run.

ALTER TABLE public.use_case_boards
  ALTER COLUMN status SET DEFAULT 'active';
