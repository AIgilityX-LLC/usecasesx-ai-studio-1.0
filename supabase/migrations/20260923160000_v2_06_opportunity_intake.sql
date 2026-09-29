-- V2-06 — Opportunity Intake V2 (additive)
-- Adds FR-02 fields missing from the capture model: sponsor, affected users,
-- geography and constraints. Existing columns (pain, process, baseline,
-- outcome, urgency, owner, stakeholders, evidence) are unchanged.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS affected_users text,
  ADD COLUMN IF NOT EXISTS geography text,
  ADD COLUMN IF NOT EXISTS constraints_text text;

COMMENT ON COLUMN public.opportunities.sponsor_name IS
  'Named executive or business sponsor for the opportunity (FR-02).';
COMMENT ON COLUMN public.opportunities.affected_users IS
  'Who feels the pain today — roles, teams or citizen groups (FR-02).';
COMMENT ON COLUMN public.opportunities.geography IS
  'Geographic or jurisdiction scope of the problem (FR-02).';
COMMENT ON COLUMN public.opportunities.constraints_text IS
  'Known constraints: policy, budget, timing, technology or regulatory (FR-02).';
