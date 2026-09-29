-- V2-19 follow-up: extend anon column-level SELECT on use_cases.
-- Root cause: 20260907160000 revoked table SELECT from anon and granted a
-- fixed column list. Later additive columns (quality_*, provenance_url,
-- V2-19 governance fields, submitted_by) were never added to that grant, so
-- publicClient() listUseCases fails with:
--   permission denied for table use_cases (42501)
-- while SELECT id, title still works.

GRANT SELECT (
  provenance_url,
  quality_status,
  quality_checked_at,
  submitted_by,
  evidence_class,
  license_usage_note,
  content_owner_name,
  content_owner_id,
  content_reviewer_id,
  content_reviewer_name,
  last_reviewed_at,
  superseded_by_id
) ON public.use_cases TO anon;
