-- Production ops: additive indexes for hot audit / gate / module analytics paths.
-- No destructive changes. Supports bounded list queries and readiness probes.

CREATE INDEX IF NOT EXISTS decision_gate_open_items_review_created_idx
  ON public.decision_gate_open_items (review_id, created_at ASC);

CREATE INDEX IF NOT EXISTS decision_gate_reviews_use_case_created_idx
  ON public.decision_gate_reviews (use_case_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS decision_gate_reviews_workspace_status_idx
  ON public.decision_gate_reviews (workspace_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS module_events_created_idx
  ON public.module_events (created_at DESC);

CREATE INDEX IF NOT EXISTS feasibility_scores_use_case_idx
  ON public.feasibility_scores (use_case_id);

COMMENT ON INDEX public.decision_gate_open_items_review_created_idx IS
  'Supports batched open-item loads for gate review lists (N+1 fix).';
