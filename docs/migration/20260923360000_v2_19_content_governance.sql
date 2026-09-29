-- V2-19 — Repository content governance and seed upgrade (additive)
-- Workflow: draft → review → approved → published → deprecated
-- Provenance fields + evidence class (example vs verified case study vs pattern).
-- Never invent outcomes, clients or ROI in seed data.

-- ---------------------------------------------------------------------------
-- 1. use_cases — governance columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.use_cases
  ADD COLUMN IF NOT EXISTS license_usage_note text,
  ADD COLUMN IF NOT EXISTS content_owner_name text,
  ADD COLUMN IF NOT EXISTS content_owner_id uuid,
  ADD COLUMN IF NOT EXISTS content_reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS content_reviewer_name text,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by_id uuid,
  ADD COLUMN IF NOT EXISTS evidence_class text NOT NULL DEFAULT 'example',
  ADD COLUMN IF NOT EXISTS provenance_url text;

DO $$ BEGIN
  ALTER TABLE public.use_cases
    ADD CONSTRAINT use_cases_evidence_class_check
    CHECK (evidence_class IN ('example', 'verified_case_study', 'pattern_template'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.use_cases
    ADD CONSTRAINT use_cases_superseded_by_fkey
    FOREIGN KEY (superseded_by_id) REFERENCES public.use_cases (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Align content_status vocabulary (text column — additive values only)
COMMENT ON COLUMN public.use_cases.content_status IS
  'Editorial workflow: draft | submitted_for_review | approved | published | unpublished | deprecated | archived';
COMMENT ON COLUMN public.use_cases.evidence_class IS
  'FR-01: example (illustrative) | verified_case_study (attributable) | pattern_template (reusable shape). Never invent ROI.';
COMMENT ON COLUMN public.use_cases.license_usage_note IS
  'FR-01 license / usage note shown to consumers.';
COMMENT ON COLUMN public.use_cases.last_reviewed_at IS
  'FR-01 last human review date (editorial).';
COMMENT ON COLUMN public.use_cases.superseded_by_id IS
  'FR-01 pointer to the record that replaces this one when deprecated.';

-- Add deprecated to enum if missing (Postgres ADD VALUE is transactional-safe IF NOT EXISTS on PG 15+)
DO $$ BEGIN
  ALTER TYPE public.use_case_status ADD VALUE IF NOT EXISTS 'deprecated';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. use_case_patterns — governance + template taxonomy
-- ---------------------------------------------------------------------------
ALTER TABLE public.use_case_patterns
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS evidence_class text NOT NULL DEFAULT 'pattern_template',
  ADD COLUMN IF NOT EXISTS template_kind text,
  ADD COLUMN IF NOT EXISTS sector_context text,
  ADD COLUMN IF NOT EXISTS provenance text NOT NULL DEFAULT 'aigilityx_editorial',
  ADD COLUMN IF NOT EXISTS provenance_note text,
  ADD COLUMN IF NOT EXISTS provenance_url text,
  ADD COLUMN IF NOT EXISTS license_usage_note text,
  ADD COLUMN IF NOT EXISTS content_owner_name text,
  ADD COLUMN IF NOT EXISTS content_reviewer_name text,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by_id uuid,
  ADD COLUMN IF NOT EXISTS content_status text NOT NULL DEFAULT 'draft';

DO $$ BEGIN
  ALTER TABLE public.use_case_patterns
    ADD CONSTRAINT use_case_patterns_evidence_class_check
    CHECK (evidence_class IN ('example', 'verified_case_study', 'pattern_template'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.use_case_patterns
    ADD CONSTRAINT use_case_patterns_template_kind_check
    CHECK (template_kind IS NULL OR template_kind IN (
      'genai', 'rag', 'predictive_ml', 'computer_vision', 'automation', 'agentic_workflow'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.use_case_patterns
    ADD CONSTRAINT use_case_patterns_sector_context_check
    CHECK (sector_context IS NULL OR sector_context IN (
      'enterprise', 'sme', 'government', 'defense', 'regulated_industry'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS use_case_patterns_slug_uidx
  ON public.use_case_patterns (slug)
  WHERE slug IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.use_case_patterns
    ADD CONSTRAINT use_case_patterns_superseded_by_fkey
    FOREIGN KEY (superseded_by_id) REFERENCES public.use_case_patterns (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.use_case_patterns IS
  'FR-01 reusable pattern templates. Seed only reviewed, attributable shapes — no invented clients/ROI.';
COMMENT ON COLUMN public.use_case_patterns.sample_kpis IS
  'Metric *categories* only. Never store fabricated numeric outcomes.';
