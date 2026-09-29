-- V2-15 — Workshop Mode V2 (additive)
-- Agenda, teams, challenges, timeboxes, anonymous ideation, AI cluster proposals,
-- voting mode, and hard idempotency for workshop→opportunity conversion.

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS teams jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS challenge_statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS timeboxes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allow_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voting_mode text NOT NULL DEFAULT 'score';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workshops_voting_mode_check'
  ) THEN
    ALTER TABLE public.workshops
      ADD CONSTRAINT workshops_voting_mode_check
      CHECK (voting_mode IN ('score', 'dot'));
  END IF;
END $$;

COMMENT ON COLUMN public.workshops.agenda IS 'FR-12 facilitator agenda items (ordered).';
COMMENT ON COLUMN public.workshops.teams IS 'FR-12 workshop teams.';
COMMENT ON COLUMN public.workshops.challenge_statements IS 'FR-12 challenge statements for ideation.';
COMMENT ON COLUMN public.workshops.timeboxes IS 'FR-12 stage/agenda timeboxes.';
COMMENT ON COLUMN public.workshops.allow_anonymous IS 'FR-12 optional anonymous ideation.';
COMMENT ON COLUMN public.workshops.voting_mode IS 'FR-12 score (1–5) or dot voting.';

CREATE TABLE IF NOT EXISTS public.workshop_cluster_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops (id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  proposed_label text NOT NULL,
  summary text NOT NULL DEFAULT '',
  item_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'ai',
  reason text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT workshop_cluster_proposals_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT workshop_cluster_proposals_source_check
    CHECK (source IN ('ai', 'facilitator')),
  CONSTRAINT workshop_cluster_proposals_label_len
    CHECK (char_length(proposed_label) BETWEEN 1 AND 200)
);

CREATE INDEX IF NOT EXISTS workshop_cluster_proposals_workshop_idx
  ON public.workshop_cluster_proposals (workshop_id)
  WHERE deleted_at IS NULL AND status = 'pending';

DROP TRIGGER IF EXISTS trg_workshop_cluster_proposals_updated ON public.workshop_cluster_proposals;
CREATE TRIGGER trg_workshop_cluster_proposals_updated
  BEFORE UPDATE ON public.workshop_cluster_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workshop_cluster_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workshop members read cluster proposals" ON public.workshop_cluster_proposals;
CREATE POLICY "Workshop members read cluster proposals"
  ON public.workshop_cluster_proposals FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.workshop_is_member(workshop_id, auth.uid())
  );

DROP POLICY IF EXISTS "Facilitators insert cluster proposals" ON public.workshop_cluster_proposals;
CREATE POLICY "Facilitators insert cluster proposals"
  ON public.workshop_cluster_proposals FOR INSERT TO authenticated
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));

DROP POLICY IF EXISTS "Facilitators update cluster proposals" ON public.workshop_cluster_proposals;
CREATE POLICY "Facilitators update cluster proposals"
  ON public.workshop_cluster_proposals FOR UPDATE TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.workshop_cluster_proposals TO authenticated;
GRANT ALL ON public.workshop_cluster_proposals TO service_role;

COMMENT ON TABLE public.workshop_cluster_proposals IS
  'FR-12 AI/facilitator cluster proposals. Merges require explicit facilitator accept.';

-- Idempotent workshop→opportunity conversion (soft: unique source_reference when set).
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_workshop_source_reference_uidx
  ON public.opportunities (source_reference)
  WHERE source = 'workshop' AND source_reference IS NOT NULL;
