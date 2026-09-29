-- V2-09 — Scoring Engine V2 (additive)
-- Extends scorecard_results with criterion assessments, uncertainty band,
-- evidence completeness and a reconciliation flag. Published scorecard
-- definitions become immutable. Existing result numbers are NOT recomputed.

-- ---------------------------------------------------------------------------
-- 1. scorecard_results — V2 fields (nullable; legacy rows unchanged visually)
-- ---------------------------------------------------------------------------

ALTER TABLE public.scorecard_results
  ADD COLUMN IF NOT EXISTS criterion_assessments jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS uncertainty_low numeric,
  ADD COLUMN IF NOT EXISTS uncertainty_high numeric,
  ADD COLUMN IF NOT EXISTS evidence_completeness numeric,
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'current';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scorecard_results_reconciliation_check'
  ) THEN
    ALTER TABLE public.scorecard_results
      ADD CONSTRAINT scorecard_results_reconciliation_check
      CHECK (reconciliation_status IN ('current', 'legacy_pending', 'reconciled'));
  END IF;
END $$;

COMMENT ON COLUMN public.scorecard_results.criterion_assessments IS
  'Per-criterion rationale, confidence, evidence note, assessor and timestamp (FR-06).';
COMMENT ON COLUMN public.scorecard_results.uncertainty_low IS
  'Lower bound of uncertainty band (0–100). Null on legacy rows until reconciled.';
COMMENT ON COLUMN public.scorecard_results.uncertainty_high IS
  'Upper bound of uncertainty band (0–100). Null on legacy rows until reconciled.';
COMMENT ON COLUMN public.scorecard_results.evidence_completeness IS
  'Share of criterion weight with attached evidence (0–1). Separate from answer completeness.';
COMMENT ON COLUMN public.scorecard_results.reconciliation_status IS
  'legacy_pending = backfilled V2 columns not yet reviewed; never rewrite displayed scores blindly.';

-- Backfill: flag legacy rows for reconciliation review; do not rewrite scores.
UPDATE public.scorecard_results
SET reconciliation_status = 'legacy_pending'
WHERE uncertainty_low IS NULL
  AND uncertainty_high IS NULL
  AND reconciliation_status = 'current';

-- ---------------------------------------------------------------------------
-- 2. scorecards — draft / published / archived + immutability of published
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TABLE public.scorecards DROP CONSTRAINT IF EXISTS scorecards_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.scorecards
  DROP CONSTRAINT IF EXISTS scorecards_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scorecards_status_check'
  ) THEN
    ALTER TABLE public.scorecards
      ADD CONSTRAINT scorecards_status_check
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_published_scorecard_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'published' AND (
    NEW.definition IS DISTINCT FROM OLD.definition
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.name IS DISTINCT FROM OLD.name
  ) THEN
    RAISE EXCEPTION
      'Published scorecard versions are immutable (V2-09). Clone to a draft to edit.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scorecards_immutable_published ON public.scorecards;
CREATE TRIGGER trg_scorecards_immutable_published
  BEFORE UPDATE ON public.scorecards
  FOR EACH ROW EXECUTE FUNCTION public.prevent_published_scorecard_mutation();

-- Allow draft → published and published → archived without definition change.
COMMENT ON FUNCTION public.prevent_published_scorecard_mutation() IS
  'Blocks edits to slug/version/name/definition once status is published.';
