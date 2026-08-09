-- Additive provenance + quality metadata for the global catalogue.
ALTER TABLE public.use_cases
  ADD COLUMN IF NOT EXISTS provenance text NOT NULL DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS provenance_note text,
  ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS quality_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS quality_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS implementation_notes text;

-- Validation lives in a trigger, not a CHECK, so future label sets stay editable.
CREATE OR REPLACE FUNCTION public.validate_use_case_provenance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.provenance NOT IN ('unspecified','aigilityx_editorial','community_contribution','partner_contribution','external_sourced','workspace_authored') THEN
    RAISE EXCEPTION 'Unknown provenance label: %', NEW.provenance;
  END IF;
  IF NEW.quality_status NOT IN ('unverified','needs_review','quality_passed','rejected') THEN
    RAISE EXCEPTION 'Unknown quality status: %', NEW.quality_status;
  END IF;
  -- Published global content must always carry provenance and a passed quality check.
  IF NEW.status = 'published'::public.use_case_status THEN
    IF NEW.provenance = 'unspecified' THEN
      RAISE EXCEPTION 'Published use cases require a provenance label (slug=%)', NEW.slug;
    END IF;
    IF NEW.quality_status <> 'quality_passed' THEN
      RAISE EXCEPTION 'Published use cases must pass quality review (slug=%)', NEW.slug;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_use_cases_provenance ON public.use_cases;
CREATE TRIGGER trg_use_cases_provenance
BEFORE INSERT OR UPDATE ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.validate_use_case_provenance();

CREATE INDEX IF NOT EXISTS idx_use_cases_quality_status ON public.use_cases (quality_status);
CREATE INDEX IF NOT EXISTS idx_use_cases_provenance ON public.use_cases (provenance);