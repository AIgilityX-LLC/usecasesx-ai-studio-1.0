-- =============================================================================
-- full-schema.sql
-- Phased, dependency-safe rebuild of the public schema.
--
-- Phase 1:  DROP FUNCTION / DROP TABLE / DROP TYPE
-- Phase 2:  CREATE TYPE (enums)
-- Phase 3:  CREATE TABLE (no foreign keys; FK-dependency order)
-- Phase 4:  ALTER TABLE ADD CONSTRAINT (foreign keys)
-- Phase 4b: UNIQUE constraints (idempotent DO blocks)
-- Phase 5:  CREATE INDEX
-- Phase 6:  CREATE OR REPLACE FUNCTION
-- Phase 6b: CREATE VIEW (after tables + functions; required by grants/policies)
-- Phase 7:  CREATE TRIGGER
-- Phase 8:  ALTER TABLE ENABLE ROW LEVEL SECURITY
-- Phase 9:  CREATE POLICY
-- Phase 10: GRANT / REVOKE
-- Phase 11: Storage bucket creation
--
-- DOCUMENTATION ARTIFACT ONLY - do not execute blindly against a live DB.
-- Generated: 2026-09-09
-- Tables: 117 | Enums: 9 | Functions: 44
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Phase 1: DROP FUNCTION / DROP TABLE / DROP TYPE
-- ---------------------------------------------------------------------------
-- Drop functions first (signatures may reference enums), then tables, then types.
DROP FUNCTION IF EXISTS public.accept_workshop_invitation(text) CASCADE;
DROP FUNCTION IF EXISTS public.accept_workspace_invitation(text) CASCADE;
DROP FUNCTION IF EXISTS public.audit_portfolio_items() CASCADE;
DROP FUNCTION IF EXISTS public.audit_use_case_benefits() CASCADE;
DROP FUNCTION IF EXISTS public.audit_use_case_boards() CASCADE;
DROP FUNCTION IF EXISTS public.audit_use_cases() CASCADE;
DROP FUNCTION IF EXISTS public.collab_entity_workspace(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.collection_is_accessible(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.collection_is_owned(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_workspace() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_workspace(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_use_case_integration_package(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_pro_entitlement(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_tier(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_demo_activity(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_editor_tier(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.org_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.portfolio_is_readable(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.portfolio_is_writable(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.prevent_profile_org_self_change() CASCADE;
DROP FUNCTION IF EXISTS public.publish_use_case_submission(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_board_org() CASCADE;
DROP FUNCTION IF EXISTS public.sync_handoff_tenancy() CASCADE;
DROP FUNCTION IF EXISTS public.sync_opportunity_org() CASCADE;
DROP FUNCTION IF EXISTS public.sync_sector_published() CASCADE;
DROP FUNCTION IF EXISTS public.sync_tenancy_from_ai_use_case() CASCADE;
DROP FUNCTION IF EXISTS public.sync_tenancy_from_board() CASCADE;
DROP FUNCTION IF EXISTS public.sync_tenancy_from_profile() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_use_case(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_in_workspace(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_org_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_use_case_provenance() CASCADE;
DROP FUNCTION IF EXISTS public.workshop_is_facilitator(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.workshop_is_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.workspace_can_edit(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.workspace_can_manage(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.workspace_display_names(uuid, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.workspace_member_directory(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.workspace_org(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.workspace_role(uuid, uuid) CASCADE;
-- Drop tables (dependents first)
DROP TABLE IF EXISTS public.use_case_versions CASCADE;
DROP TABLE IF EXISTS public.use_case_deliverables CASCADE;
DROP TABLE IF EXISTS public.use_case_deliverable_versions CASCADE;
DROP TABLE IF EXISTS public.use_case_benefits CASCADE;
DROP TABLE IF EXISTS public.scorecard_results CASCADE;
DROP TABLE IF EXISTS public.opportunities CASCADE;
DROP TABLE IF EXISTS public.integration_links CASCADE;
DROP TABLE IF EXISTS public.feasibility_scores CASCADE;
DROP TABLE IF EXISTS public.data_readiness_assessments CASCADE;
DROP TABLE IF EXISTS public.blueprints CASCADE;
DROP TABLE IF EXISTS public.ai_use_cases CASCADE;
DROP TABLE IF EXISTS public.ai_use_case_value_themes CASCADE;
DROP TABLE IF EXISTS public.ai_use_case_strategic_themes CASCADE;
DROP TABLE IF EXISTS public.ai_use_case_processes CASCADE;
DROP TABLE IF EXISTS public.ai_use_case_org_units CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspace_invitations CASCADE;
DROP TABLE IF EXISTS public.workspace_export_preferences CASCADE;
DROP TABLE IF EXISTS public.workspace_ai_engines CASCADE;
DROP TABLE IF EXISTS public.workshop_votes CASCADE;
DROP TABLE IF EXISTS public.workshop_public_value_canvas CASCADE;
DROP TABLE IF EXISTS public.workshop_participants CASCADE;
DROP TABLE IF EXISTS public.workshop_outcomes CASCADE;
DROP TABLE IF EXISTS public.workshop_items CASCADE;
DROP TABLE IF EXISTS public.workshop_invitations CASCADE;
DROP TABLE IF EXISTS public.workshop_canvas_versions CASCADE;
DROP TABLE IF EXISTS public.workshop_canvas_documents CASCADE;
DROP TABLE IF EXISTS public.workshops CASCADE;
DROP TABLE IF EXISTS public.use_case_boards CASCADE;
DROP TABLE IF EXISTS public.suite_handoff_requests CASCADE;
DROP TABLE IF EXISTS public.scorecards CASCADE;
DROP TABLE IF EXISTS public.demo_sample_copies CASCADE;
DROP TABLE IF EXISTS public.collab_review_states CASCADE;
DROP TABLE IF EXISTS public.collab_comments CASCADE;
DROP TABLE IF EXISTS public.collab_assignments CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.use_case_strategic_themes CASCADE;
DROP TABLE IF EXISTS public.use_case_processes CASCADE;
DROP TABLE IF EXISTS public.use_case_metrics CASCADE;
DROP TABLE IF EXISTS public.use_case_links CASCADE;
DROP TABLE IF EXISTS public.use_case_industries CASCADE;
DROP TABLE IF EXISTS public.use_case_gov_functions CASCADE;
DROP TABLE IF EXISTS public.use_case_countries CASCADE;
DROP TABLE IF EXISTS public.use_case_capabilities CASCADE;
DROP TABLE IF EXISTS public.use_case_business_objectives CASCADE;
DROP TABLE IF EXISTS public.use_case_business_functions CASCADE;
DROP TABLE IF EXISTS public.shortlists CASCADE;
DROP TABLE IF EXISTS public.collection_items CASCADE;
DROP TABLE IF EXISTS public.use_cases CASCADE;
DROP TABLE IF EXISTS public.use_case_views CASCADE;
DROP TABLE IF EXISTS public.use_case_submissions CASCADE;
DROP TABLE IF EXISTS public.use_case_scores CASCADE;
DROP TABLE IF EXISTS public.use_case_ratings CASCADE;
DROP TABLE IF EXISTS public.use_case_patterns CASCADE;
DROP TABLE IF EXISTS public.use_case_feedback CASCADE;
DROP TABLE IF EXISTS public.use_case_downloads CASCADE;
DROP TABLE IF EXISTS public.use_case_audit_log CASCADE;
DROP TABLE IF EXISTS public.taxonomy_value_themes CASCADE;
DROP TABLE IF EXISTS public.taxonomy_tags CASCADE;
DROP TABLE IF EXISTS public.taxonomy_strategic_themes CASCADE;
DROP TABLE IF EXISTS public.taxonomy_sectors CASCADE;
DROP TABLE IF EXISTS public.taxonomy_risk_levels CASCADE;
DROP TABLE IF EXISTS public.taxonomy_processes CASCADE;
DROP TABLE IF EXISTS public.taxonomy_meta CASCADE;
DROP TABLE IF EXISTS public.taxonomy_maturity_levels CASCADE;
DROP TABLE IF EXISTS public.taxonomy_lifecycle_stages CASCADE;
DROP TABLE IF EXISTS public.saved_use_cases CASCADE;
DROP TABLE IF EXISTS public.request_status_alerts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.product_feedback CASCADE;
DROP TABLE IF EXISTS public.product_events CASCADE;
DROP TABLE IF EXISTS public.portfolio_shares CASCADE;
DROP TABLE IF EXISTS public.portfolio_items CASCADE;
DROP TABLE IF EXISTS public.portfolios CASCADE;
DROP TABLE IF EXISTS public.platform_modules CASCADE;
DROP TABLE IF EXISTS public.entitlements CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.pilot_verdict_snapshots CASCADE;
DROP TABLE IF EXISTS public.pilot_settings CASCADE;
DROP TABLE IF EXISTS public.pilot_reminders CASCADE;
DROP TABLE IF EXISTS public.pilot_reminder_dispatches CASCADE;
DROP TABLE IF EXISTS public.pilot_rc_waivers CASCADE;
DROP TABLE IF EXISTS public.pilot_onboarding_profiles CASCADE;
DROP TABLE IF EXISTS public.pilot_milestone_approvals CASCADE;
DROP TABLE IF EXISTS public.pilot_launch_check_runs CASCADE;
DROP TABLE IF EXISTS public.pilot_checkpoint_responses CASCADE;
DROP TABLE IF EXISTS public.pilot_audit_events CASCADE;
DROP TABLE IF EXISTS public.pilot_applications CASCADE;
DROP TABLE IF EXISTS public.pilot_invitations CASCADE;
DROP TABLE IF EXISTS public.pilot_browser_suite_runs CASCADE;
DROP TABLE IF EXISTS public.organization_units CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.module_events CASCADE;
DROP TABLE IF EXISTS public.lead_events CASCADE;
DROP TABLE IF EXISTS public.lead_captures CASCADE;
DROP TABLE IF EXISTS public.integration_events CASCADE;
DROP TABLE IF EXISTS public.industries CASCADE;
DROP TABLE IF EXISTS public.gov_functions CASCADE;
DROP TABLE IF EXISTS public.generated_reports CASCADE;
DROP TABLE IF EXISTS public.external_module_links CASCADE;
DROP TABLE IF EXISTS public.demo_reset_log CASCADE;
DROP TABLE IF EXISTS public.data_export_requests CASCADE;
DROP TABLE IF EXISTS public.data_deletion_requests CASCADE;
DROP TABLE IF EXISTS public.cta_events CASCADE;
DROP TABLE IF EXISTS public.cron_hook_tokens CASCADE;
DROP TABLE IF EXISTS public.countries CASCADE;
DROP TABLE IF EXISTS public.consent_records CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.business_objectives CASCADE;
DROP TABLE IF EXISTS public.business_functions CASCADE;
DROP TABLE IF EXISTS public.audit_events CASCADE;
DROP TABLE IF EXISTS public.ai_usage_events CASCADE;
DROP TABLE IF EXISTS public.ai_engine_credentials CASCADE;
DROP TABLE IF EXISTS public.ai_engines CASCADE;
DROP TABLE IF EXISTS public.ai_capabilities CASCADE;
-- Drop types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.maturity_stage CASCADE;
DROP TYPE IF EXISTS public.opportunity_source CASCADE;
DROP TYPE IF EXISTS public.opportunity_status CASCADE;
DROP TYPE IF EXISTS public.opportunity_urgency CASCADE;
DROP TYPE IF EXISTS public.org_unit_type CASCADE;
DROP TYPE IF EXISTS public.submission_status CASCADE;
DROP TYPE IF EXISTS public.use_case_status CASCADE;
DROP TYPE IF EXISTS public.use_case_visibility CASCADE;

-- ---------------------------------------------------------------------------
-- Phase 2: CREATE TYPE (enums)
-- ---------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'contributor', 'viewer', 'super_admin', 'ai_hub_admin', 'usecasex_admin', 'content_manager', 'reviewer', 'editor', 'user');
CREATE TYPE public.maturity_stage AS ENUM ('concept', 'prototype', 'pilot', 'production', 'scaled');
CREATE TYPE public.opportunity_source AS ENUM ('scratch', 'repository', 'workshop', 'referral');
CREATE TYPE public.opportunity_status AS ENUM ('signal', 'opportunity', 'qualified', 'converted', 'deferred', 'archived');
CREATE TYPE public.opportunity_urgency AS ENUM ('now', 'next', 'later', 'unknown');
CREATE TYPE public.org_unit_type AS ENUM ('group', 'company', 'business_unit', 'department', 'team', 'program', 'project');
CREATE TYPE public.submission_status AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected');
CREATE TYPE public.use_case_status AS ENUM ('draft', 'review', 'published', 'archived', 'submitted_for_review', 'approved', 'unpublished');
CREATE TYPE public.use_case_visibility AS ENUM ('free_lite', 'pro', 'both', 'hidden');

-- ---------------------------------------------------------------------------
-- Phase 3: CREATE TABLE (no foreign keys; dependency order)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_capabilities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ai_engines (
  allow_workspace_keys boolean NOT NULL DEFAULT true,
  base_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  editions text[] NOT NULL DEFAULT ARRAY['pro','enterprise']::text[],
  enabled boolean NOT NULL DEFAULT false,
  fallback_to_default boolean NOT NULL DEFAULT true,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_default boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  model_id text NOT NULL,
  provider text NOT NULL,
  route text NOT NULL DEFAULT 'gateway',
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 100,
  tagline text,
  tier text NOT NULL DEFAULT 'balanced',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ai_engine_credentials (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  engine_slug text NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_ciphertext text NOT NULL,
  key_hint text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  completion_tokens integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer,
  entity_id uuid,
  entity_type text,
  error_kind text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  model text NOT NULL,
  organization_id uuid,
  prompt_tokens integer,
  prompt_version text,
  provider_alias text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  task text NOT NULL,
  total_tokens integer,
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  entity_id uuid,
  entity_type text NOT NULL,
  event_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  new_value jsonb,
  organization_id uuid,
  previous_value jsonb,
  request_id text,
  severity text NOT NULL DEFAULT 'info',
  source text,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.business_functions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.business_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.collections (
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_public boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  organization_id uuid,
  share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.consent_records (
  analytics boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  marketing boolean NOT NULL DEFAULT false,
  organization_id uuid,
  policy_version text NOT NULL DEFAULT 'v1',
  source text NOT NULL DEFAULT 'banner',
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.countries (
  code text NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.cron_hook_tokens (
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  token text NOT NULL,
  PRIMARY KEY (name)
);

CREATE TABLE IF NOT EXISTS public.cta_events (
  created_at timestamptz NOT NULL DEFAULT now(),
  cta text NOT NULL,
  device text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_host text,
  result_count integer,
  search_query text,
  session_id text,
  source_page text,
  target_platform text,
  target_route text,
  use_case_id uuid,
  user_id uuid,
  utm_campaign text,
  utm_medium text,
  utm_source text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  effective_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  grace_days integer NOT NULL DEFAULT 30,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'scheduled',
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  error_message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  payload jsonb,
  payload_bytes integer NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0,
  requested_at timestamptz NOT NULL DEFAULT now(),
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope text[] NOT NULL DEFAULT ARRAY['profile',
  'opportunities',
  'use_cases',
  'portfolios',
  'saved',
  'feedback',
  'consents'],
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.demo_reset_log (
  actor_id uuid,
  actor_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenario_key text,
  scope text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'ok',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.external_module_links (
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  module text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  url text NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.generated_reports (
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  organization_id uuid,
  payload jsonb,
  title text NOT NULL,
  use_case_count integer NOT NULL DEFAULT 0,
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.gov_functions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.industries (
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.integration_events (
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payload jsonb,
  source_module text NOT NULL,
  target_module text NOT NULL,
  use_case_id uuid,
  user_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.lead_captures (
  company text,
  confirmation_attempts integer NOT NULL DEFAULT 0,
  confirmation_last_attempt_at timestamptz,
  confirmation_last_error text,
  confirmation_next_retry_at timestamptz,
  confirmation_sent_at timestamptz,
  confirmation_status text NOT NULL DEFAULT 'pending',
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  cta text,
  eligible boolean,
  email text NOT NULL,
  full_name text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text,
  interest_area text,
  lead_status text NOT NULL DEFAULT 'new',
  notes text,
  reference_id text DEFAULT ('UCX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  referrer_host text,
  role text,
  source_page text,
  source_use_case uuid,
  utm_campaign text,
  utm_medium text,
  utm_source text,
  waitlist_status text NOT NULL DEFAULT 'pending',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.lead_events (
  actor_id uuid,
  actor_label text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  detail text,
  event_type text NOT NULL,
  from_status text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  to_status text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.module_events (
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metadata jsonb NOT NULL DEFAULT '{}',
  module_key text NOT NULL,
  user_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.organizations (
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text,
  is_demo boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'lite',
  type text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  UNIQUE (organization_id, user_id),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.organization_units (
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  name text NOT NULL,
  organization_id uuid NOT NULL,
  parent_id uuid,
  slug text,
  sort_order integer NOT NULL DEFAULT 0,
  unit_type public.org_unit_type NOT NULL DEFAULT 'department',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_browser_suite_runs (
  actor_email text,
  actor_id uuid,
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  failing_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notes text,
  participant_email text,
  passed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  spec_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  suite text NOT NULL DEFAULT 'p0-p1',
  total integer NOT NULL DEFAULT 0,
  verdict text NOT NULL DEFAULT 'unknown',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_invitations (
  activated_at timestamptz,
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  full_name text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invite_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex') UNIQUE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid,
  notes text,
  organization text,
  registered_at timestamptz,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_applications (
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  decision_reason text,
  email text NOT NULL,
  full_name text NOT NULL,
  goals text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invitation_id uuid,
  organization text NOT NULL,
  referrer text,
  role_title text,
  sector text,
  source text NOT NULL DEFAULT 'self_serve',
  status text NOT NULL DEFAULT 'requested',
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_audit_events (
  action text NOT NULL,
  actor_id uuid,
  actor_kind text NOT NULL DEFAULT 'admin',
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  created_at timestamptz NOT NULL DEFAULT now(),
  from_status text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invitation_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  subject_email text,
  subject_user_id uuid,
  to_status text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_checkpoint_responses (
  advisory_interest boolean NOT NULL DEFAULT false,
  blocked boolean NOT NULL DEFAULT false,
  checkpoint text NOT NULL,
  comment text,
  context_route text,
  created_at timestamptz NOT NULL DEFAULT now(),
  effort_rating smallint,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  journey_stage text,
  mission_step text,
  organization_id uuid,
  pilot_id uuid,
  portfolio_id uuid,
  rating smallint,
  use_case_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  user_id uuid NOT NULL DEFAULT auth.uid(),
  value_rating smallint,
  willingness text,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_launch_check_runs (
  actor_email text,
  actor_id uuid,
  cohort text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  errored integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  p0_failures integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  skipped integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  trigger text NOT NULL DEFAULT 'manual',
  trigger_detail text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_milestone_approvals (
  cohort TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by UUID,
  decided_by_label TEXT,
  decision_note TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  milestone_key TEXT NOT NULL,
  participant_note TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  UNIQUE (user_id, cohort, milestone_key),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_onboarding_profiles (
  ai_experience text NOT NULL,
  availability text,
  cohort text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  contact_consent boolean NOT NULL DEFAULT false,
  country text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expected_use_cases text,
  full_name text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invitation_id uuid,
  organization text NOT NULL,
  primary_goal text NOT NULL,
  role_title text NOT NULL,
  sector text NOT NULL,
  team_size text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  UNIQUE (user_id, cohort),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_rc_waivers (
  approved_by uuid NOT NULL,
  approver_name text NOT NULL,
  approver_role text NOT NULL,
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  revoke_reason text,
  revoked_at timestamptz,
  revoked_by uuid,
  scope text NOT NULL DEFAULT 'pilot_evidence',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_reminder_dispatches (
  channel text NOT NULL DEFAULT 'email',
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  created_at timestamptz NOT NULL DEFAULT now(),
  detail text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  invitation_id uuid,
  kind text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  updated_at timestamptz NOT NULL DEFAULT now(),
  window_days integer,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_reminders (
  actor_id uuid,
  body text NOT NULL,
  checkpoint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invitation_id uuid,
  kind text NOT NULL,
  mission_step text,
  read_at timestamptz,
  target_route text,
  title text NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_settings (
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  id boolean NOT NULL DEFAULT true,
  invitations_paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  paused_at timestamptz,
  paused_by uuid,
  seat_target integer NOT NULL DEFAULT 25,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.pilot_verdict_snapshots (
  checkpoint_answers integer NOT NULL,
  cohort text NOT NULL DEFAULT 'founding-pilot-2026-08',
  created_at timestamptz NOT NULL DEFAULT now(),
  evidence_gap_state text,
  freeze_recommended boolean NOT NULL DEFAULT false,
  headline text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invited integer NOT NULL DEFAULT 0,
  p0_count integer NOT NULL DEFAULT 0,
  p1_count integer NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  recorded_by uuid,
  registered integer NOT NULL DEFAULT 0,
  verdict text NOT NULL,
  waiver_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.plans (
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (code)
);

CREATE TABLE IF NOT EXISTS public.entitlements (
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  granted_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notes text,
  organization_id uuid NOT NULL,
  plan_code text NOT NULL,
  revoked_at timestamptz,
  source text NOT NULL DEFAULT 'manual',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.platform_modules (
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  description text,
  external_url text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT true,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.portfolios (
  created_at timestamptz NOT NULL DEFAULT now(),
  demo_template_key text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  last_reviewed_at timestamptz,
  name text NOT NULL,
  objective text,
  organization_id uuid,
  organization_unit_id uuid,
  parent_portfolio_id uuid,
  portfolio_type text NOT NULL DEFAULT 'Custom Portfolio',
  review_cadence text,
  review_notes text,
  status text NOT NULL DEFAULT 'Draft',
  target_department text,
  target_quarter text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  visibility text NOT NULL DEFAULT 'workspace',
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid,
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decision text NOT NULL DEFAULT 'under_review',
  delivery_owner text,
  delivery_stage text NOT NULL DEFAULT 'unscheduled',
  depends_on uuid[] NOT NULL DEFAULT '{}',
  funding_state text NOT NULL DEFAULT 'unfunded',
  last_reviewed_at timestamptz,
  milestone text,
  next_action text,
  notes text,
  planned_end_date date,
  planned_start_date date,
  portfolio_id uuid NOT NULL,
  rank integer,
  review_notes text,
  reviewed_by uuid,
  target_period text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  PRIMARY KEY (portfolio_id, use_case_id)
);

CREATE TABLE IF NOT EXISTS public.portfolio_shares (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  expires_at timestamptz,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text,
  portfolio_id uuid NOT NULL,
  revoked_at timestamptz,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.product_events (
  created_at timestamptz NOT NULL DEFAULT now(),
  entity_id uuid,
  entity_type text,
  event_name text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  user_id uuid,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.product_feedback (
  allow_contact boolean NOT NULL DEFAULT false,
  assigned_at timestamptz,
  assigned_by uuid,
  assigned_to uuid,
  category text NOT NULL,
  contact_email text,
  context_route text,
  created_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  entity_id uuid,
  entity_type text,
  evidence_url text,
  first_response_at timestamptz,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL,
  organization_id uuid,
  priority text NOT NULL DEFAULT 'p3',
  resolution_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  severity text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'new',
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  avatar_url text,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email TEXT,
  entitlement_expires_at timestamptz,
  entitlement_tier text NOT NULL DEFAULT 'lite',
  founding_member boolean NOT NULL DEFAULT false,
  full_name TEXT,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  industry TEXT,
  main_ai_interest TEXT,
  organization TEXT,
  organization_id uuid,
  plan_type text NOT NULL DEFAULT 'pro_free',
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  role TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL UNIQUE,
  user_role text NOT NULL DEFAULT 'registered_pro_user',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.request_status_alerts (
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  feedback_id uuid NOT NULL,
  from_status text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note text,
  priority text,
  read_at timestamptz,
  to_status text NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.saved_use_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note text,
  organization_id uuid,
  priority text NOT NULL DEFAULT 'Medium',
  saved_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  user_id uuid NOT NULL,
  workspace_id uuid,
  UNIQUE (user_id, use_case_id),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_lifecycle_stages (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  organization_id uuid,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_maturity_levels (
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  is_published BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_meta (
  id INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_processes (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT true,
  name text NOT NULL,
  organization_id uuid,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_risk_levels (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  organization_id uuid,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_sectors (
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  is_featured boolean NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  organization_id uuid,
  reviewed_at timestamptz,
  reviewed_by uuid,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  submitted_by uuid,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_strategic_themes (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  organization_id uuid,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_tags (
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  is_published BOOLEAN NOT NULL DEFAULT false,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_value_themes (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  organization_id uuid,
  slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_audit_log (
  action text NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  detail text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metadata jsonb,
  use_case_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_downloads (
  asset_kind text,
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text,
  source_page text,
  use_case_id uuid NOT NULL,
  user_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_feedback (
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  sentiment TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  use_case_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_patterns (
  access_tier text NOT NULL DEFAULT 'free',
  ai_type text,
  business_problem text,
  complexity_level text,
  controls jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  data_inputs jsonb DEFAULT '[]'::jsonb,
  domain text,
  expected_outputs jsonb DEFAULT '[]'::jsonb,
  function_area text,
  government_domain text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text,
  maturity_level text,
  risks jsonb DEFAULT '[]'::jsonb,
  sample_kpis jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL,
  summary text,
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  value_potential text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_ratings (
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  rating SMALLINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  use_case_slug TEXT NOT NULL,
  user_id UUID NOT NULL,
  UNIQUE (use_case_slug, user_id),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_scores (
  created_at timestamptz NOT NULL DEFAULT now(),
  feasibility smallint NOT NULL DEFAULT 0,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  readiness smallint NOT NULL DEFAULT 0,
  risk smallint NOT NULL DEFAULT 0,
  strategic smallint NOT NULL DEFAULT 0,
  total smallint NOT NULL DEFAULT 0,
  ttv smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  user_id uuid NOT NULL,
  value smallint NOT NULL DEFAULT 0,
  workspace_id uuid,
  UNIQUE (user_id, use_case_id),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_submissions (
  ai_solution text,
  business_problem text,
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text,
  organization_id uuid,
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  sector text,
  sources text[] NOT NULL DEFAULT '{}',
  status public.submission_status NOT NULL DEFAULT 'draft',
  summary text,
  tags text[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_views (
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer text,
  session_id text,
  source_page text,
  use_case_id uuid NOT NULL,
  user_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_cases (
  ai_solution_concept text,
  assurance_review_required boolean NOT NULL DEFAULT false,
  business_problem text,
  business_value text,
  complexity text,
  content_status text NOT NULL DEFAULT 'draft',
  cost_range text,
  created_at timestamptz NOT NULL DEFAULT now(),
  cyber_review_required boolean NOT NULL DEFAULT false,
  cybersecurity_notes text,
  data_required text,
  deployment_model text,
  display_order integer NOT NULL DEFAULT 0,
  effort_score smallint,
  evidence_urls text[] NOT NULL DEFAULT '{}'::text[],
  governance_notes text,
  governance_required boolean NOT NULL DEFAULT false,
  hero_image_url text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  impact_score smallint,
  implementation_notes text,
  is_featured boolean NOT NULL DEFAULT false,
  kpis text[] DEFAULT '{}'::text[],
  maturity public.maturity_stage,
  maturity_level text,
  maturity_score smallint,
  organization text,
  organization_type text,
  outcomes text,
  privacy_notes text,
  privacy_review_required boolean NOT NULL DEFAULT false,
  problem text,
  provenance text NOT NULL DEFAULT 'unspecified',
  provenance_note text,
  published_at timestamptz,
  quality_checked_at timestamptz,
  quality_status text NOT NULL DEFAULT 'unverified',
  recommended_platforms text[] DEFAULT '{}'::text[],
  region text,
  risk_level text,
  risk_score smallint,
  roi_areas text[] DEFAULT '{}'::text[],
  security_classification text,
  show_on_landing boolean NOT NULL DEFAULT false,
  slug text NOT NULL UNIQUE,
  solution text,
  status public.use_case_status NOT NULL DEFAULT 'draft',
  submitted_by uuid,
  summary text NOT NULL,
  time_to_value text,
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  value_potential text,
  visibility public.use_case_visibility NOT NULL DEFAULT 'both',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.collection_items (
  collection_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note text,
  position integer NOT NULL DEFAULT 0,
  use_case_id uuid NOT NULL,
  UNIQUE (collection_id, use_case_id),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shortlists (
  added_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid,
  use_case_id uuid NOT NULL,
  user_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (user_id, use_case_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_business_functions (
  business_function_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, business_function_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_business_objectives (
  objective_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, objective_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_capabilities (
  capability_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, capability_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_countries (
  country_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, country_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_gov_functions (
  gov_function_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, gov_function_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_industries (
  industry_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, industry_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind text DEFAULT 'evidence',
  label text NOT NULL,
  url text NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order int DEFAULT 0,
  unit text,
  use_case_id uuid NOT NULL,
  value text NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_processes (
  process_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, process_id)
);

CREATE TABLE IF NOT EXISTS public.use_case_strategic_themes (
  theme_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, theme_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  user_id uuid NOT NULL,
  UNIQUE (user_id, role),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  demo_scenario_key text,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_demo boolean NOT NULL DEFAULT false,
  is_demo_template boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  organization_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_type text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.collab_assignments (
  assigned_by uuid NOT NULL,
  assignment_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  UNIQUE (entity_type, entity_id, user_id, assignment_role),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.collab_comments (
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.collab_review_states (
  created_at timestamptz NOT NULL DEFAULT now(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note text,
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL,
  workspace_id uuid NOT NULL,
  UNIQUE (entity_type, entity_id),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.demo_sample_copies (
  created_at timestamptz NOT NULL DEFAULT now(),
  entity_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  scenario_key text NOT NULL,
  scenario_label text NOT NULL,
  template_version text NOT NULL DEFAULT 'v1',
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.scorecards (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_default boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  organization_id uuid,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.suite_handoff_requests (
  completed_at timestamptz,
  consent jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivery_mode text NOT NULL,
  dispatched_at timestamptz,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  owner_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_type text NOT NULL,
  requested_by uuid NOT NULL,
  sensitivity text NOT NULL,
  source_version jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL,
  status_note text,
  subject_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  target text NOT NULL,
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_boards (
  board_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  status text NOT NULL DEFAULT 'active',
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshops (
  business_functions text[] NOT NULL DEFAULT '{}',
  client_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  ends_on date,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  objective text,
  organization_id uuid,
  outcome_report_id uuid,
  portfolio_id uuid,
  stage text NOT NULL DEFAULT 'context',
  starts_on date,
  status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_canvas_documents (
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  note TEXT,
  section TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL UNIQUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL,
  workshop_id UUID NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_canvas_versions (
  answered INTEGER NOT NULL DEFAULT 0,
  completeness INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  note TEXT,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL,
  workshop_id UUID NOT NULL,
  UNIQUE (workshop_id, version),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_invitations (
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  display_name text,
  email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  max_uses integer NOT NULL DEFAULT 1,
  revoked_at timestamptz,
  role text NOT NULL DEFAULT 'participant',
  token text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_count integer NOT NULL DEFAULT 0,
  workshop_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_items (
  business_function text,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  detail text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'pain_point',
  merged_into_id uuid,
  opportunity_id uuid,
  source_item_id uuid,
  status text NOT NULL DEFAULT 'submitted',
  submitted_by uuid,
  submitted_by_name text,
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid,
  workshop_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_outcomes (
  created_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workshop_id uuid NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_participants (
  created_at timestamptz NOT NULL DEFAULT now(),
  display_name text NOT NULL,
  email text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'participant',
  user_id uuid,
  workshop_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_public_value_canvas (
  completeness integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  workshop_id uuid NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workshop_votes (
  created_at timestamptz NOT NULL DEFAULT now(),
  criterion text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  score integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  voter_id uuid NOT NULL,
  workshop_id uuid NOT NULL,
  UNIQUE (item_id, voter_id, criterion),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workspace_ai_engines (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  enabled boolean NOT NULL DEFAULT true,
  engine_slug text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_ciphertext text NOT NULL,
  key_hint text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid NOT NULL,
  UNIQUE (workspace_id, engine_slug),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workspace_export_preferences (
  columns text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  export_key text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  workspace_id uuid NOT NULL,
  UNIQUE (workspace_id, export_key),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  message text,
  organization_id uuid,
  revoked_at timestamptz,
  role text NOT NULL,
  token text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_count integer NOT NULL DEFAULT 0,
  workspace_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  role text NOT NULL DEFAULT 'viewer',
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  UNIQUE (workspace_id, user_id),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ai_use_case_org_units (
  created_at timestamptz NOT NULL DEFAULT now(),
  org_unit_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, org_unit_id)
);

CREATE TABLE IF NOT EXISTS public.ai_use_case_processes (
  created_at timestamptz NOT NULL DEFAULT now(),
  process_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, process_id)
);

CREATE TABLE IF NOT EXISTS public.ai_use_case_strategic_themes (
  created_at timestamptz NOT NULL DEFAULT now(),
  theme_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, theme_id)
);

CREATE TABLE IF NOT EXISTS public.ai_use_case_value_themes (
  created_at timestamptz NOT NULL DEFAULT now(),
  theme_id uuid NOT NULL,
  use_case_id uuid NOT NULL,
  PRIMARY KEY (use_case_id, theme_id)
);

CREATE TABLE IF NOT EXISTS public.ai_use_cases (
  ai_type text,
  beneficiaries text,
  board_id uuid NOT NULL,
  completed_at timestamp with time zone,
  contributors jsonb NOT NULL DEFAULT '[]'::jsonb,
  controls jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  current_state text,
  current_step text,
  data_sources jsonb DEFAULT '[]'::jsonb,
  demo_template_key text,
  expected_benefits jsonb DEFAULT '[]'::jsonb,
  future_state text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kpis jsonb DEFAULT '[]'::jsonb,
  minimum_viable_prediction text,
  mvp_scope text,
  organization_id uuid,
  owner_user_id uuid,
  pattern_id uuid,
  position integer NOT NULL DEFAULT 0,
  priority_score numeric,
  problem_statement text,
  risk_level text,
  risks jsonb DEFAULT '[]'::jsonb,
  source_opportunity_id uuid,
  source_use_case_id uuid,
  stakeholders jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'idea',
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  visibility text NOT NULL DEFAULT 'workspace',
  wizard_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.blueprints (
  budget_assumptions text,
  business_case text,
  created_at timestamptz NOT NULL DEFAULT now(),
  data_requirements text,
  executive_summary text,
  governance_controls text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  implementation_roadmap text,
  model_approach text,
  organization_id uuid,
  risk_summary text,
  success_metrics text,
  technical_scope text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.data_readiness_assessments (
  bias_risk_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  data_accessibility_score numeric,
  data_availability_score numeric,
  data_quality_score numeric,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  missing_data_gaps jsonb DEFAULT '[]'::jsonb,
  mitigation_recommendations jsonb DEFAULT '[]'::jsonb,
  organization_id uuid,
  overall_data_readiness_score numeric,
  ownership_clarity_score numeric,
  privacy_exposure_score numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.feasibility_scores (
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  desirability_score numeric,
  feasibility_score numeric,
  governability_score numeric,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notes text,
  organization_id uuid,
  recommendation text,
  sustainability_score numeric,
  total_score numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  viability_score numeric,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.integration_links (
  created_at timestamptz NOT NULL DEFAULT now(),
  external_reference_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  integration_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  organization_id uuid,
  status text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.opportunities (
  ai_assisted boolean NOT NULL DEFAULT false,
  ai_suggested_at timestamp with time zone,
  ai_suggestions jsonb,
  baseline text,
  business_function text,
  converted_at timestamp with time zone,
  converted_use_case_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  demo_template_key text,
  desired_outcome text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_unit_id uuid,
  organization_id uuid,
  owner_name text,
  owner_user_id uuid,
  pain_point text,
  process text,
  process_id uuid,
  source public.opportunity_source NOT NULL DEFAULT 'scratch',
  source_reference text,
  source_use_case_id uuid,
  stakeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.opportunity_status NOT NULL,
  strategic_objective text,
  strategic_theme_id uuid,
  title text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  urgency public.opportunity_urgency NOT NULL DEFAULT 'unknown',
  workspace_id uuid NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.scorecard_results (
  completeness numeric,
  composite_score numeric,
  confidence text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note text,
  organization_id uuid,
  recommendation text,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_adjusted_score numeric,
  scorecard_id uuid NOT NULL,
  scorecard_slug text NOT NULL,
  scorecard_version integer NOT NULL,
  use_case_id uuid NOT NULL,
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_benefits (
  baseline_value numeric,
  benefit_owner text,
  category text NOT NULL DEFAULT 'cost_reduction',
  confidence text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  currency text,
  erp_last_verified_at timestamptz,
  erp_reference text,
  erp_system text,
  erp_verification_status text NOT NULL DEFAULT 'not_configured',
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_source text,
  expected_value numeric,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kpi text,
  measurement_frequency text NOT NULL DEFAULT 'quarterly',
  name text NOT NULL,
  notes text,
  organization_id uuid,
  period text NOT NULL DEFAULT 'annual',
  state text NOT NULL DEFAULT 'proposed',
  target_value numeric,
  unit_type text NOT NULL DEFAULT 'currency',
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  verification_method text NOT NULL DEFAULT 'manual',
  workspace_id uuid,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_deliverable_versions (
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deliverable_id uuid NOT NULL,
  deliverable_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  origin text NOT NULL DEFAULT 'authored',
  status text NOT NULL DEFAULT 'draft',
  summary text,
  use_case_id uuid NOT NULL,
  version integer NOT NULL,
  UNIQUE (deliverable_id, version),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_deliverables (
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deliverable_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  status text NOT NULL DEFAULT 'not_started',
  updated_at timestamptz NOT NULL DEFAULT now(),
  use_case_id uuid NOT NULL,
  workspace_id uuid,
  UNIQUE (use_case_id, deliverable_type),

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.use_case_versions (
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note text,
  organization_id uuid,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  use_case_id uuid NOT NULL,
  version integer NOT NULL,
  workspace_id uuid,
  UNIQUE (use_case_id, version),

  PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- Phase 4: ALTER TABLE ADD CONSTRAINT (foreign keys)
-- Phase 4b follows after FKs (UNIQUE constraints)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_engine_credentials ADD CONSTRAINT ai_engine_credentials_engine_slug_fkey FOREIGN KEY (engine_slug) REFERENCES public.ai_engines (slug);
ALTER TABLE public.lead_events ADD CONSTRAINT lead_events_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.lead_captures (id);
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.organization_units ADD CONSTRAINT organization_units_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.organization_units ADD CONSTRAINT organization_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.organization_units (id);
ALTER TABLE public.pilot_applications ADD CONSTRAINT pilot_applications_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.pilot_invitations (id);
ALTER TABLE public.pilot_audit_events ADD CONSTRAINT pilot_audit_events_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.pilot_invitations (id);
ALTER TABLE public.pilot_checkpoint_responses ADD CONSTRAINT pilot_checkpoint_responses_pilot_id_fkey FOREIGN KEY (pilot_id) REFERENCES public.pilot_invitations (id);
ALTER TABLE public.pilot_onboarding_profiles ADD CONSTRAINT pilot_onboarding_profiles_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.pilot_invitations (id);
ALTER TABLE public.pilot_reminder_dispatches ADD CONSTRAINT pilot_reminder_dispatches_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.pilot_invitations (id);
ALTER TABLE public.pilot_reminders ADD CONSTRAINT pilot_reminders_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.pilot_invitations (id);
ALTER TABLE public.pilot_verdict_snapshots ADD CONSTRAINT pilot_verdict_snapshots_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES public.pilot_rc_waivers (id);
ALTER TABLE public.entitlements ADD CONSTRAINT entitlements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.entitlements ADD CONSTRAINT entitlements_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES public.plans (code);
ALTER TABLE public.portfolios ADD CONSTRAINT portfolios_organization_unit_id_fkey FOREIGN KEY (organization_unit_id) REFERENCES public.organization_units (id);
ALTER TABLE public.portfolios ADD CONSTRAINT portfolios_parent_portfolio_id_fkey FOREIGN KEY (parent_portfolio_id) REFERENCES public.portfolios (id);
ALTER TABLE public.portfolio_items ADD CONSTRAINT portfolio_items_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios (id);
ALTER TABLE public.portfolio_shares ADD CONSTRAINT portfolio_shares_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.request_status_alerts ADD CONSTRAINT request_status_alerts_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.product_feedback (id);
ALTER TABLE public.taxonomy_lifecycle_stages ADD CONSTRAINT taxonomy_lifecycle_stages_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.taxonomy_processes ADD CONSTRAINT taxonomy_processes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.taxonomy_risk_levels ADD CONSTRAINT taxonomy_risk_levels_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.taxonomy_sectors ADD CONSTRAINT taxonomy_sectors_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.taxonomy_strategic_themes ADD CONSTRAINT taxonomy_strategic_themes_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.taxonomy_value_themes ADD CONSTRAINT taxonomy_value_themes_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.collection_items ADD CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections (id);
ALTER TABLE public.collection_items ADD CONSTRAINT collection_items_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.shortlists ADD CONSTRAINT shortlists_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_business_functions ADD CONSTRAINT use_case_business_functions_business_function_id_fkey FOREIGN KEY (business_function_id) REFERENCES public.business_functions (id);
ALTER TABLE public.use_case_business_functions ADD CONSTRAINT use_case_business_functions_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_business_objectives ADD CONSTRAINT use_case_business_objectives_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.business_objectives (id);
ALTER TABLE public.use_case_business_objectives ADD CONSTRAINT use_case_business_objectives_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_capabilities ADD CONSTRAINT use_case_capabilities_capability_id_fkey FOREIGN KEY (capability_id) REFERENCES public.ai_capabilities (id);
ALTER TABLE public.use_case_capabilities ADD CONSTRAINT use_case_capabilities_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_countries ADD CONSTRAINT use_case_countries_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries (id);
ALTER TABLE public.use_case_countries ADD CONSTRAINT use_case_countries_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_gov_functions ADD CONSTRAINT use_case_gov_functions_gov_function_id_fkey FOREIGN KEY (gov_function_id) REFERENCES public.gov_functions (id);
ALTER TABLE public.use_case_gov_functions ADD CONSTRAINT use_case_gov_functions_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_industries ADD CONSTRAINT use_case_industries_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries (id);
ALTER TABLE public.use_case_industries ADD CONSTRAINT use_case_industries_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_links ADD CONSTRAINT use_case_links_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_metrics ADD CONSTRAINT use_case_metrics_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_processes ADD CONSTRAINT use_case_processes_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.taxonomy_processes (id);
ALTER TABLE public.use_case_processes ADD CONSTRAINT use_case_processes_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.use_case_strategic_themes ADD CONSTRAINT use_case_strategic_themes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.taxonomy_strategic_themes (id);
ALTER TABLE public.use_case_strategic_themes ADD CONSTRAINT use_case_strategic_themes_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.collab_assignments ADD CONSTRAINT collab_assignments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.collab_comments ADD CONSTRAINT collab_comments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.collab_review_states ADD CONSTRAINT collab_review_states_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.demo_sample_copies ADD CONSTRAINT demo_sample_copies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.scorecards ADD CONSTRAINT scorecards_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.scorecards ADD CONSTRAINT scorecards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.suite_handoff_requests ADD CONSTRAINT suite_handoff_requests_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.use_case_boards ADD CONSTRAINT use_case_boards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.workshops ADD CONSTRAINT workshops_outcome_report_id_fkey FOREIGN KEY (outcome_report_id) REFERENCES public.generated_reports (id);
ALTER TABLE public.workshops ADD CONSTRAINT workshops_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios (id);
ALTER TABLE public.workshops ADD CONSTRAINT workshops_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.workshop_canvas_documents ADD CONSTRAINT workshop_canvas_documents_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workshop_canvas_versions ADD CONSTRAINT workshop_canvas_versions_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workshop_invitations ADD CONSTRAINT workshop_invitations_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workshop_items ADD CONSTRAINT workshop_items_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.workshop_items (id);
ALTER TABLE public.workshop_items ADD CONSTRAINT workshop_items_source_item_id_fkey FOREIGN KEY (source_item_id) REFERENCES public.workshop_items (id);
ALTER TABLE public.workshop_items ADD CONSTRAINT workshop_items_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workshop_outcomes ADD CONSTRAINT workshop_outcomes_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workshop_participants ADD CONSTRAINT workshop_participants_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workshop_public_value_canvas ADD CONSTRAINT workshop_public_value_canvas_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workshop_votes ADD CONSTRAINT workshop_votes_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.workshop_items (id);
ALTER TABLE public.workshop_votes ADD CONSTRAINT workshop_votes_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops (id);
ALTER TABLE public.workspace_ai_engines ADD CONSTRAINT workspace_ai_engines_engine_slug_fkey FOREIGN KEY (engine_slug) REFERENCES public.ai_engines (slug);
ALTER TABLE public.workspace_ai_engines ADD CONSTRAINT workspace_ai_engines_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.workspace_export_preferences ADD CONSTRAINT workspace_export_preferences_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.workspace_invitations ADD CONSTRAINT workspace_invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.ai_use_case_org_units ADD CONSTRAINT ai_use_case_org_units_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.organization_units (id);
ALTER TABLE public.ai_use_case_org_units ADD CONSTRAINT ai_use_case_org_units_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.ai_use_case_processes ADD CONSTRAINT ai_use_case_processes_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.taxonomy_processes (id);
ALTER TABLE public.ai_use_case_processes ADD CONSTRAINT ai_use_case_processes_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.ai_use_case_strategic_themes ADD CONSTRAINT ai_use_case_strategic_themes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.taxonomy_strategic_themes (id);
ALTER TABLE public.ai_use_case_strategic_themes ADD CONSTRAINT ai_use_case_strategic_themes_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.ai_use_case_value_themes ADD CONSTRAINT ai_use_case_value_themes_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.taxonomy_value_themes (id);
ALTER TABLE public.ai_use_case_value_themes ADD CONSTRAINT ai_use_case_value_themes_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.ai_use_cases ADD CONSTRAINT ai_use_cases_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.use_case_boards (id);
ALTER TABLE public.ai_use_cases ADD CONSTRAINT ai_use_cases_pattern_id_fkey FOREIGN KEY (pattern_id) REFERENCES public.use_case_patterns (id);
ALTER TABLE public.ai_use_cases ADD CONSTRAINT ai_use_cases_source_opportunity_id_fkey FOREIGN KEY (source_opportunity_id) REFERENCES public.opportunities (id);
ALTER TABLE public.ai_use_cases ADD CONSTRAINT ai_use_cases_source_use_case_id_fkey FOREIGN KEY (source_use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.blueprints ADD CONSTRAINT blueprints_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.data_readiness_assessments ADD CONSTRAINT data_readiness_assessments_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.feasibility_scores ADD CONSTRAINT feasibility_scores_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.integration_links ADD CONSTRAINT integration_links_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_converted_use_case_id_fkey FOREIGN KEY (converted_use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES public.organization_units (id);
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations (id);
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.taxonomy_processes (id);
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_source_use_case_id_fkey FOREIGN KEY (source_use_case_id) REFERENCES public.use_cases (id);
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_strategic_theme_id_fkey FOREIGN KEY (strategic_theme_id) REFERENCES public.taxonomy_strategic_themes (id);
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces (id);
ALTER TABLE public.scorecard_results ADD CONSTRAINT scorecard_results_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards (id);
ALTER TABLE public.scorecard_results ADD CONSTRAINT scorecard_results_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.use_case_benefits ADD CONSTRAINT use_case_benefits_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.use_case_deliverable_versions ADD CONSTRAINT use_case_deliverable_versions_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES public.use_case_deliverables (id);
ALTER TABLE public.use_case_deliverables ADD CONSTRAINT use_case_deliverables_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);
ALTER TABLE public.use_case_versions ADD CONSTRAINT use_case_versions_use_case_id_fkey FOREIGN KEY (use_case_id) REFERENCES public.ai_use_cases (id);

-- ---------------------------------------------------------------------------
-- Phase 4b: UNIQUE constraints (idempotent; mirrors add-missing-unique-constraints.sql)
-- ---------------------------------------------------------------------------

-- Column-level UNIQUE (19)

-- public.ai_capabilities.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.ai_capabilities'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'ai_capabilities_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.ai_capabilities
      ADD CONSTRAINT ai_capabilities_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.ai_engine_credentials.engine_slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.ai_engine_credentials'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'ai_engine_credentials_engine_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (engine_slug)'
      )
  ) THEN
    ALTER TABLE public.ai_engine_credentials
      ADD CONSTRAINT ai_engine_credentials_engine_slug_key UNIQUE (engine_slug);
  END IF;
END $$;

-- public.business_functions.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.business_functions'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'business_functions_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.business_functions
      ADD CONSTRAINT business_functions_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.business_objectives.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.business_objectives'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'business_objectives_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.business_objectives
      ADD CONSTRAINT business_objectives_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.countries.code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.countries'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'countries_code_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (code)'
      )
  ) THEN
    ALTER TABLE public.countries
      ADD CONSTRAINT countries_code_key UNIQUE (code);
  END IF;
END $$;

-- public.gov_functions.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.gov_functions'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'gov_functions_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.gov_functions
      ADD CONSTRAINT gov_functions_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.industries.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.industries'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'industries_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.industries
      ADD CONSTRAINT industries_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.pilot_invitations.invite_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.pilot_invitations'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'pilot_invitations_invite_token_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (invite_token)'
      )
  ) THEN
    ALTER TABLE public.pilot_invitations
      ADD CONSTRAINT pilot_invitations_invite_token_key UNIQUE (invite_token);
  END IF;
END $$;

-- public.platform_modules.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.platform_modules'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'platform_modules_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.platform_modules
      ADD CONSTRAINT platform_modules_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.profiles'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'profiles_user_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (user_id)'
      )
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- public.taxonomy_maturity_levels.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.taxonomy_maturity_levels'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'taxonomy_maturity_levels_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.taxonomy_maturity_levels
      ADD CONSTRAINT taxonomy_maturity_levels_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.taxonomy_sectors.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.taxonomy_sectors'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'taxonomy_sectors_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.taxonomy_sectors
      ADD CONSTRAINT taxonomy_sectors_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.taxonomy_tags.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.taxonomy_tags'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'taxonomy_tags_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.taxonomy_tags
      ADD CONSTRAINT taxonomy_tags_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.use_cases.slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.use_cases'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'use_cases_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (slug)'
      )
  ) THEN
    ALTER TABLE public.use_cases
      ADD CONSTRAINT use_cases_slug_key UNIQUE (slug);
  END IF;
END $$;

-- public.workshop_canvas_documents.storage_path
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workshop_canvas_documents'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workshop_canvas_documents_storage_path_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (storage_path)'
      )
  ) THEN
    ALTER TABLE public.workshop_canvas_documents
      ADD CONSTRAINT workshop_canvas_documents_storage_path_key UNIQUE (storage_path);
  END IF;
END $$;

-- public.workshop_invitations.token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workshop_invitations'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workshop_invitations_token_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (token)'
      )
  ) THEN
    ALTER TABLE public.workshop_invitations
      ADD CONSTRAINT workshop_invitations_token_key UNIQUE (token);
  END IF;
END $$;

-- public.workshop_outcomes.workshop_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workshop_outcomes'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workshop_outcomes_workshop_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (workshop_id)'
      )
  ) THEN
    ALTER TABLE public.workshop_outcomes
      ADD CONSTRAINT workshop_outcomes_workshop_id_key UNIQUE (workshop_id);
  END IF;
END $$;

-- public.workshop_public_value_canvas.workshop_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workshop_public_value_canvas'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workshop_public_value_canvas_workshop_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (workshop_id)'
      )
  ) THEN
    ALTER TABLE public.workshop_public_value_canvas
      ADD CONSTRAINT workshop_public_value_canvas_workshop_id_key UNIQUE (workshop_id);
  END IF;
END $$;

-- public.workspace_invitations.token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workspace_invitations'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workspace_invitations_token_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (token)'
      )
  ) THEN
    ALTER TABLE public.workspace_invitations
      ADD CONSTRAINT workspace_invitations_token_key UNIQUE (token);
  END IF;
END $$;

-- Composite UNIQUE (19)

-- public.collab_assignments(entity_type, entity_id, user_id, assignment_role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.collab_assignments'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'collab_assignments_entity_user_role_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (entity_type, entity_id, user_id, assignment_role)'
      )
  ) THEN
    ALTER TABLE public.collab_assignments
      ADD CONSTRAINT collab_assignments_entity_user_role_key UNIQUE (entity_type, entity_id, user_id, assignment_role);
  END IF;
END $$;

-- public.collab_review_states(entity_type, entity_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.collab_review_states'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'collab_review_states_entity_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (entity_type, entity_id)'
      )
  ) THEN
    ALTER TABLE public.collab_review_states
      ADD CONSTRAINT collab_review_states_entity_key UNIQUE (entity_type, entity_id);
  END IF;
END $$;

-- public.collection_items(collection_id, use_case_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.collection_items'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'collection_items_collection_id_use_case_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (collection_id, use_case_id)'
      )
  ) THEN
    ALTER TABLE public.collection_items
      ADD CONSTRAINT collection_items_collection_id_use_case_id_key UNIQUE (collection_id, use_case_id);
  END IF;
END $$;

-- public.organization_members(organization_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.organization_members'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'organization_members_organization_id_user_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (organization_id, user_id)'
      )
  ) THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);
  END IF;
END $$;

-- public.organization_units(organization_id, slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.organization_units'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'organization_units_organization_id_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (organization_id, slug)'
      )
  ) THEN
    ALTER TABLE public.organization_units
      ADD CONSTRAINT organization_units_organization_id_slug_key UNIQUE (organization_id, slug);
  END IF;
END $$;

-- public.pilot_milestone_approvals(user_id, cohort, milestone_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.pilot_milestone_approvals'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'pilot_milestone_approvals_user_cohort_milestone_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, cohort, milestone_key)'
      )
  ) THEN
    ALTER TABLE public.pilot_milestone_approvals
      ADD CONSTRAINT pilot_milestone_approvals_user_cohort_milestone_key UNIQUE (user_id, cohort, milestone_key);
  END IF;
END $$;

-- public.pilot_onboarding_profiles(user_id, cohort)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.pilot_onboarding_profiles'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'pilot_onboarding_profiles_user_id_cohort_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, cohort)'
      )
  ) THEN
    ALTER TABLE public.pilot_onboarding_profiles
      ADD CONSTRAINT pilot_onboarding_profiles_user_id_cohort_key UNIQUE (user_id, cohort);
  END IF;
END $$;

-- public.saved_use_cases(user_id, use_case_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.saved_use_cases'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'saved_use_cases_user_id_use_case_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, use_case_id)'
      )
  ) THEN
    ALTER TABLE public.saved_use_cases
      ADD CONSTRAINT saved_use_cases_user_id_use_case_id_key UNIQUE (user_id, use_case_id);
  END IF;
END $$;

-- public.use_case_deliverable_versions(deliverable_id, version)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.use_case_deliverable_versions'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'use_case_deliverable_versions_deliverable_id_version_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (deliverable_id, version)'
      )
  ) THEN
    ALTER TABLE public.use_case_deliverable_versions
      ADD CONSTRAINT use_case_deliverable_versions_deliverable_id_version_key UNIQUE (deliverable_id, version);
  END IF;
END $$;

-- public.use_case_deliverables(use_case_id, deliverable_type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.use_case_deliverables'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'use_case_deliverables_use_case_id_deliverable_type_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (use_case_id, deliverable_type)'
      )
  ) THEN
    ALTER TABLE public.use_case_deliverables
      ADD CONSTRAINT use_case_deliverables_use_case_id_deliverable_type_key UNIQUE (use_case_id, deliverable_type);
  END IF;
END $$;

-- public.use_case_ratings(use_case_slug, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.use_case_ratings'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'use_case_ratings_use_case_slug_user_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (use_case_slug, user_id)'
      )
  ) THEN
    ALTER TABLE public.use_case_ratings
      ADD CONSTRAINT use_case_ratings_use_case_slug_user_id_key UNIQUE (use_case_slug, user_id);
  END IF;
END $$;

-- public.use_case_scores(user_id, use_case_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.use_case_scores'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'use_case_scores_user_id_use_case_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, use_case_id)'
      )
  ) THEN
    ALTER TABLE public.use_case_scores
      ADD CONSTRAINT use_case_scores_user_id_use_case_id_key UNIQUE (user_id, use_case_id);
  END IF;
END $$;

-- public.use_case_versions(use_case_id, version)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.use_case_versions'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'use_case_versions_use_case_id_version_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (use_case_id, version)'
      )
  ) THEN
    ALTER TABLE public.use_case_versions
      ADD CONSTRAINT use_case_versions_use_case_id_version_key UNIQUE (use_case_id, version);
  END IF;
END $$;

-- public.user_roles(user_id, role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.user_roles'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'user_roles_user_id_role_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, role)'
      )
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

-- public.workshop_canvas_versions(workshop_id, version)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workshop_canvas_versions'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workshop_canvas_versions_workshop_id_version_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (workshop_id, version)'
      )
  ) THEN
    ALTER TABLE public.workshop_canvas_versions
      ADD CONSTRAINT workshop_canvas_versions_workshop_id_version_key UNIQUE (workshop_id, version);
  END IF;
END $$;

-- public.workshop_votes(item_id, voter_id, criterion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workshop_votes'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workshop_votes_item_id_voter_id_criterion_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (item_id, voter_id, criterion)'
      )
  ) THEN
    ALTER TABLE public.workshop_votes
      ADD CONSTRAINT workshop_votes_item_id_voter_id_criterion_key UNIQUE (item_id, voter_id, criterion);
  END IF;
END $$;

-- public.workspace_ai_engines(workspace_id, engine_slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workspace_ai_engines'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workspace_ai_engines_workspace_id_engine_slug_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (workspace_id, engine_slug)'
      )
  ) THEN
    ALTER TABLE public.workspace_ai_engines
      ADD CONSTRAINT workspace_ai_engines_workspace_id_engine_slug_key UNIQUE (workspace_id, engine_slug);
  END IF;
END $$;

-- public.workspace_export_preferences(workspace_id, export_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workspace_export_preferences'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workspace_export_preferences_workspace_id_export_key_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (workspace_id, export_key)'
      )
  ) THEN
    ALTER TABLE public.workspace_export_preferences
      ADD CONSTRAINT workspace_export_preferences_workspace_id_export_key_key UNIQUE (workspace_id, export_key);
  END IF;
END $$;

-- public.workspace_members(workspace_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.workspace_members'::regclass
      AND c.contype = 'u'
      AND (
        c.conname = 'workspace_members_workspace_id_user_id_key'
        OR pg_get_constraintdef(c.oid) = 'UNIQUE (workspace_id, user_id)'
      )
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
  END IF;
END $$;

-- Phase 5: CREATE INDEX
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS use_cases_status_idx ON public.use_cases(status);
CREATE INDEX IF NOT EXISTS use_cases_slug_idx ON public.use_cases(slug);
CREATE INDEX IF NOT EXISTS idx_ratings_slug ON public.use_case_ratings (use_case_slug);
CREATE INDEX IF NOT EXISTS idx_feedback_slug ON public.use_case_feedback (use_case_slug);
CREATE INDEX IF NOT EXISTS idx_saved_user ON public.saved_use_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_user ON public.use_case_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_views_uc ON public.use_case_views(use_case_id);
CREATE INDEX IF NOT EXISTS idx_downloads_uc ON public.use_case_downloads(use_case_id);
CREATE INDEX IF NOT EXISTS idx_integration_user ON public.integration_events(user_id);
CREATE INDEX IF NOT EXISTS idx_extlinks_uc ON public.external_module_links(use_case_id);
CREATE INDEX IF NOT EXISTS idx_use_case_audit_log_use_case ON public.use_case_audit_log(use_case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_use_cases_visibility_status ON public.use_cases(status, visibility);
CREATE INDEX IF NOT EXISTS idx_workspaces_org ON public.workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON public.use_case_boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_board ON public.ai_use_cases(board_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_uc ON public.feasibility_scores(use_case_id);
CREATE INDEX IF NOT EXISTS idx_data_readiness_uc ON public.data_readiness_assessments(use_case_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_uc ON public.blueprints(use_case_id);
CREATE INDEX IF NOT EXISTS idx_integration_links_uc ON public.integration_links(use_case_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_events(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS ai_use_cases_board_source_unique
  ON public.ai_use_cases (board_id, source_use_case_id)
  WHERE source_use_case_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS collections_share_token_idx ON public.collections(share_token);
CREATE INDEX IF NOT EXISTS module_events_module_idx ON public.module_events(module_key);
CREATE INDEX IF NOT EXISTS module_events_user_idx ON public.module_events(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_org_units_org ON public.organization_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_org ON public.entitlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_ws ON public.ai_use_cases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_org ON public.ai_use_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_ws ON public.blueprints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_scores_ws ON public.feasibility_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_dra_ws ON public.data_readiness_assessments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integration_links_ws ON public.integration_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_ws ON public.use_case_deliverables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_submissions_ws ON public.use_case_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_uc_scores_ws ON public.use_case_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_ws ON public.generated_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_ws ON public.portfolios(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collections_ws ON public.collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_use_cases_ws ON public.saved_use_cases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_ws ON public.shortlists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_use_case_boards_org ON public.use_case_boards(organization_id);
CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx
  ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_events_workspace_created_idx
  ON public.ai_usage_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_workspace_created_idx
  ON public.audit_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_request_idx
  ON public.audit_events (request_id);
CREATE INDEX IF NOT EXISTS product_events_name_time_idx
  ON public.product_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_workspace_time_idx
  ON public.product_events (workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_user_time_idx
  ON public.product_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_workspace_status_idx
  ON public.opportunities (workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_created_by_idx
  ON public.opportunities (created_by);
CREATE INDEX IF NOT EXISTS ai_use_cases_source_opportunity_idx
  ON public.ai_use_cases (source_opportunity_id);
CREATE INDEX IF NOT EXISTS use_case_versions_use_case_idx
  ON public.use_case_versions (use_case_id, version DESC);
CREATE UNIQUE INDEX IF NOT EXISTS scorecards_global_slug_version_key
  ON public.scorecards (slug, version) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS scorecards_workspace_slug_version_key
  ON public.scorecards (workspace_id, slug, version) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS scorecards_workspace_idx ON public.scorecards (workspace_id);
CREATE INDEX IF NOT EXISTS scorecard_results_use_case_idx
  ON public.scorecard_results (use_case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_org ON public.portfolios (organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_parent ON public.portfolios (parent_portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_org_unit ON public.portfolios (organization_unit_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_use_case ON public.portfolio_items (use_case_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_rank ON public.portfolio_items (portfolio_id, rank);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_shares_token_key ON public.portfolio_shares(token);
CREATE INDEX IF NOT EXISTS portfolio_shares_portfolio_idx ON public.portfolio_shares(portfolio_id);
CREATE INDEX IF NOT EXISTS portfolio_items_delivery_stage_idx
  ON public.portfolio_items (portfolio_id, delivery_stage);
CREATE INDEX IF NOT EXISTS idx_deliverable_versions_lookup
  ON public.use_case_deliverable_versions (use_case_id, deliverable_type, version DESC);
CREATE INDEX IF NOT EXISTS idx_use_case_benefits_use_case ON public.use_case_benefits(use_case_id);
CREATE INDEX IF NOT EXISTS idx_use_case_benefits_workspace ON public.use_case_benefits(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS workshop_participants_user_uniq
  ON public.workshop_participants (workshop_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS workshop_participants_workshop_idx ON public.workshop_participants (workshop_id);
CREATE INDEX IF NOT EXISTS workshop_items_workshop_idx ON public.workshop_items (workshop_id, kind);
CREATE INDEX IF NOT EXISTS workshop_votes_workshop_idx ON public.workshop_votes (workshop_id);
CREATE INDEX IF NOT EXISTS workshop_invitations_workshop_idx
  ON public.workshop_invitations(workshop_id);
CREATE INDEX IF NOT EXISTS workspace_invitations_ws_idx ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS collab_comments_entity_idx
  ON public.collab_comments(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS collab_assignments_entity_idx
  ON public.collab_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_suite_handoffs_ws ON public.suite_handoff_requests (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suite_handoffs_status ON public.suite_handoff_requests (status, target);
CREATE INDEX IF NOT EXISTS idx_suite_handoffs_requester ON public.suite_handoff_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_use_cases_quality_status ON public.use_cases (quality_status);
CREATE INDEX IF NOT EXISTS idx_use_cases_provenance ON public.use_cases (provenance);
CREATE INDEX IF NOT EXISTS idx_workspaces_demo ON public.workspaces (is_demo) WHERE is_demo;
CREATE INDEX IF NOT EXISTS demo_reset_log_created_idx ON public.demo_reset_log (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_key ON public.collections (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS cta_events_created_at_idx ON public.cta_events (created_at DESC);
CREATE INDEX IF NOT EXISTS cta_events_campaign_idx
  ON public.cta_events (utm_source, created_at DESC);
CREATE INDEX IF NOT EXISTS cta_events_cta_created_idx
  ON public.cta_events (cta, created_at DESC);
CREATE INDEX IF NOT EXISTS product_feedback_status_idx
  ON public.product_feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_feedback_user_idx
  ON public.product_feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_updated_at
  ON public.opportunities USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_use_case_boards_ws_created
  ON public.use_case_boards USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_use_cases_user_saved_at
  ON public.saved_use_cases USING btree (user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_created
  ON public.portfolios USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_ws_created
  ON public.portfolios USING btree (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_feedback_assigned_to_idx ON public.product_feedback (assigned_to);
CREATE INDEX IF NOT EXISTS product_feedback_due_at_idx ON public.product_feedback (due_at);
CREATE INDEX IF NOT EXISTS request_status_alerts_user_idx
  ON public.request_status_alerts (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS pilot_invitations_cohort_email_key
  ON public.pilot_invitations (cohort, lower(email));
CREATE INDEX IF NOT EXISTS pilot_invitations_user_idx ON public.pilot_invitations (user_id);
CREATE INDEX IF NOT EXISTS pilot_invitations_status_idx ON public.pilot_invitations (cohort, status);
CREATE INDEX IF NOT EXISTS pilot_checkpoints_user_idx
  ON public.pilot_checkpoint_responses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_checkpoints_checkpoint_idx
  ON public.pilot_checkpoint_responses (checkpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_audit_events_cohort_idx
  ON public.pilot_audit_events (cohort, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_audit_events_invitation_idx
  ON public.pilot_audit_events (invitation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_reminders_user_idx
  ON public.pilot_reminders (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS pilot_reminders_unique_open_idx
  ON public.pilot_reminders (user_id, kind, coalesce(mission_step, checkpoint, ''))
  WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS data_export_requests_user_idx
  ON public.data_export_requests (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS data_deletion_requests_user_idx
  ON public.data_deletion_requests (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS consent_records_user_idx
  ON public.consent_records (user_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS pilot_rc_waivers_cohort_idx ON public.pilot_rc_waivers (cohort, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS pilot_rc_waivers_active_idx
  ON public.pilot_rc_waivers (cohort, scope)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS pilot_verdict_snapshots_cohort_idx
  ON public.pilot_verdict_snapshots (cohort, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS pilot_reminder_dispatches_idem_idx
  ON public.pilot_reminder_dispatches (idempotency_key);
CREATE INDEX IF NOT EXISTS pilot_reminder_dispatches_cohort_idx
  ON public.pilot_reminder_dispatches (cohort, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_launch_check_runs_cohort_created_idx
ON public.pilot_launch_check_runs (cohort, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_documents_workshop ON public.workshop_canvas_documents (workshop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_versions_workshop ON public.workshop_canvas_versions (workshop_id, version DESC);
CREATE UNIQUE INDEX IF NOT EXISTS lead_captures_reference_id_key
  ON public.lead_captures (reference_id);
CREATE INDEX IF NOT EXISTS lead_captures_email_lower_idx
  ON public.lead_captures (lower(email));
CREATE INDEX IF NOT EXISTS lead_captures_confirmation_retry_idx
  ON public.lead_captures (confirmation_next_retry_at)
  WHERE confirmation_status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS lead_events_lead_idx ON public.lead_events (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_onboarding_profiles_cohort_idx ON public.pilot_onboarding_profiles (cohort);
CREATE INDEX IF NOT EXISTS pilot_browser_suite_runs_cohort_created_idx
  ON public.pilot_browser_suite_runs (cohort, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS use_case_metrics_uc_label_sort_uidx
  ON public.use_case_metrics (use_case_id, label, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS pilot_applications_open_email_uidx
  ON public.pilot_applications (cohort, lower(email))
  WHERE status = 'requested';
CREATE INDEX IF NOT EXISTS pilot_applications_status_idx ON public.pilot_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS pilot_milestone_approvals_status_idx
  ON public.pilot_milestone_approvals (status, submitted_at DESC);

-- ---------------------------------------------------------------------------
-- Phase 6: CREATE OR REPLACE FUNCTION
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.workspace_invitations%ROWTYPE;
  ws public.workspaces%ROWTYPE;
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to join a workspace.';
  END IF;

  SELECT * INTO inv FROM public.workspace_invitations WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'This invitation link is not valid.'; END IF;
  IF inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'This invitation has been revoked.'; END IF;
  IF inv.expires_at < now() THEN RAISE EXCEPTION 'This invitation has expired.'; END IF;
  IF inv.use_count >= inv.max_uses THEN RAISE EXCEPTION 'This invitation has already been used.'; END IF;

  SELECT * INTO ws FROM public.workspaces WHERE id = inv.workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'That workspace is no longer available.'; END IF;

  SELECT email INTO user_email FROM public.profiles WHERE user_id = uid;
  IF inv.email IS NOT NULL
     AND (user_email IS NULL OR lower(inv.email) <> lower(user_email)) THEN
    RAISE EXCEPTION 'This invitation was issued to a different email address.';
  END IF;

  INSERT INTO public.workspace_members(workspace_id, user_id, role, added_by)
  VALUES (ws.id, uid, inv.role, inv.invited_by)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.workspace_invitations
     SET use_count = use_count + 1,
         accepted_at = COALESCE(accepted_at, now()),
         accepted_by = COALESCE(accepted_by, uid)
   WHERE id = inv.id;

  INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type,
                                  organization_id, workspace_id, new_value)
  VALUES (uid, 'workspace', ws.id, 'membership.added', ws.organization_id, ws.id,
          jsonb_build_object('invitation_id', inv.id, 'role', inv.role, 'via', 'invitation'));

  RETURN ws.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_portfolio_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'portfolio_item', NEW.portfolio_id, 'portfolio_item.added',
            jsonb_build_object('use_case_id', NEW.use_case_id, 'decision', NEW.decision, 'rank', NEW.rank,
                               'delivery_stage', NEW.delivery_stage, 'delivery_owner', NEW.delivery_owner));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
    VALUES (uid, 'portfolio_item', NEW.portfolio_id, 'portfolio_item.updated',
            jsonb_build_object('decision', OLD.decision, 'rank', OLD.rank, 'funding_state', OLD.funding_state,
                               'target_period', OLD.target_period, 'delivery_stage', OLD.delivery_stage,
                               'planned_start_date', OLD.planned_start_date, 'planned_end_date', OLD.planned_end_date,
                               'milestone', OLD.milestone, 'delivery_owner', OLD.delivery_owner,
                               'blocked_reason', OLD.blocked_reason, 'depends_on', to_jsonb(OLD.depends_on)),
            jsonb_build_object('use_case_id', NEW.use_case_id, 'decision', NEW.decision, 'rank', NEW.rank,
                               'funding_state', NEW.funding_state, 'target_period', NEW.target_period,
                               'delivery_stage', NEW.delivery_stage,
                               'planned_start_date', NEW.planned_start_date, 'planned_end_date', NEW.planned_end_date,
                               'milestone', NEW.milestone, 'delivery_owner', NEW.delivery_owner,
                               'blocked_reason', NEW.blocked_reason, 'depends_on', to_jsonb(NEW.depends_on)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'portfolio_item', OLD.portfolio_id, 'portfolio_item.removed',
            jsonb_build_object('use_case_id', OLD.use_case_id, 'decision', OLD.decision,
                               'delivery_stage', OLD.delivery_stage));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_use_case_benefits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'use_case_benefit', NEW.use_case_id, 'benefit.created',
            jsonb_build_object('benefit_id', NEW.id, 'name', NEW.name, 'category', NEW.category,
                               'unit_type', NEW.unit_type, 'currency', NEW.currency, 'period', NEW.period,
                               'baseline_value', NEW.baseline_value, 'target_value', NEW.target_value,
                               'expected_value', NEW.expected_value, 'confidence', NEW.confidence,
                               'state', NEW.state, 'benefit_owner', NEW.benefit_owner,
                               'measurement_frequency', NEW.measurement_frequency,
                               'evidence_source', NEW.evidence_source,
                               'evidence_links', NEW.evidence_links,
                               'erp_verification_status', NEW.erp_verification_status,
                               'erp_system', NEW.erp_system,
                               'erp_reference', NEW.erp_reference,
                               'erp_last_verified_at', NEW.erp_last_verified_at,
                               'verification_method', NEW.verification_method));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
    VALUES (uid, 'use_case_benefit', NEW.use_case_id,
            CASE
              WHEN NEW.erp_verification_status IS DISTINCT FROM OLD.erp_verification_status
                THEN 'benefit.verification_changed'
              WHEN NEW.evidence_links IS DISTINCT FROM OLD.evidence_links
                THEN 'benefit.evidence_changed'
              ELSE 'benefit.updated'
            END,
            jsonb_build_object('benefit_id', OLD.id, 'name', OLD.name, 'category', OLD.category,
                               'unit_type', OLD.unit_type, 'currency', OLD.currency, 'period', OLD.period,
                               'baseline_value', OLD.baseline_value, 'target_value', OLD.target_value,
                               'expected_value', OLD.expected_value, 'confidence', OLD.confidence,
                               'state', OLD.state, 'benefit_owner', OLD.benefit_owner,
                               'measurement_frequency', OLD.measurement_frequency,
                               'evidence_source', OLD.evidence_source,
                               'evidence_links', OLD.evidence_links,
                               'erp_verification_status', OLD.erp_verification_status,
                               'erp_system', OLD.erp_system,
                               'erp_reference', OLD.erp_reference,
                               'erp_last_verified_at', OLD.erp_last_verified_at,
                               'verification_method', OLD.verification_method),
            jsonb_build_object('benefit_id', NEW.id, 'name', NEW.name, 'category', NEW.category,
                               'unit_type', NEW.unit_type, 'currency', NEW.currency, 'period', NEW.period,
                               'baseline_value', NEW.baseline_value, 'target_value', NEW.target_value,
                               'expected_value', NEW.expected_value, 'confidence', NEW.confidence,
                               'state', NEW.state, 'benefit_owner', NEW.benefit_owner,
                               'measurement_frequency', NEW.measurement_frequency,
                               'evidence_source', NEW.evidence_source,
                               'evidence_links', NEW.evidence_links,
                               'erp_verification_status', NEW.erp_verification_status,
                               'erp_system', NEW.erp_system,
                               'erp_reference', NEW.erp_reference,
                               'erp_last_verified_at', NEW.erp_last_verified_at,
                               'verification_method', NEW.verification_method));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'use_case_benefit', OLD.use_case_id, 'benefit.removed',
            jsonb_build_object('benefit_id', OLD.id, 'name', OLD.name, 'expected_value', OLD.expected_value,
                               'unit_type', OLD.unit_type, 'currency', OLD.currency, 'state', OLD.state));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_use_case_boards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    RAISE NOTICE '[audit] use_case_boards INSERT board=% workspace=% user=%', NEW.id, NEW.workspace_id, uid;
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'use_case_board', NEW.id, 'board.created',
            jsonb_build_object('title', NEW.title, 'workspace_id', NEW.workspace_id, 'board_type', NEW.board_type));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE NOTICE '[audit] use_case_boards DELETE board=% workspace=% user=%', OLD.id, OLD.workspace_id, uid;
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'use_case_board', OLD.id, 'board.deleted',
            jsonb_build_object('title', OLD.title, 'workspace_id', OLD.workspace_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_use_cases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'use_case', NEW.id, 'use_case.created',
            jsonb_build_object('title', NEW.title, 'slug', NEW.slug, 'status', NEW.status));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status transitions we care about
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
      VALUES (
        uid, 'use_case', NEW.id,
        CASE
          WHEN NEW.status::text = 'published' THEN 'use_case.published'
          WHEN NEW.status::text = 'archived'  THEN 'use_case.archived'
          WHEN NEW.status::text = 'draft'     THEN 'use_case.unpublished'
          ELSE 'use_case.status_changed'
        END,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status, 'title', NEW.title, 'slug', NEW.slug)
      );
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'use_case', OLD.id, 'use_case.deleted',
            jsonb_build_object('title', OLD.title, 'slug', OLD.slug, 'status', OLD.status));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_entity_workspace(_entity_type text, _entity_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  IF _entity_type = 'opportunity' THEN
    SELECT workspace_id INTO ws FROM public.opportunities WHERE id = _entity_id;
  ELSIF _entity_type = 'use_case' THEN
    SELECT workspace_id INTO ws FROM public.ai_use_cases WHERE id = _entity_id;
  ELSIF _entity_type = 'portfolio' THEN
    SELECT workspace_id INTO ws FROM public.portfolios WHERE id = _entity_id;
  END IF;
  RETURN ws;
END;
$$;

CREATE OR REPLACE FUNCTION public.collection_is_accessible(_collection_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = _collection_id
      AND (c.user_id = _user_id OR c.is_public = true)
  )
$$;

CREATE OR REPLACE FUNCTION public.collection_is_owned(_collection_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = _collection_id AND c.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_workspace(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := _user_id;
  prof_org uuid;
  prof_name text;
  prof_email text;
  prof_company text;
  new_org uuid;
  ws uuid;
  created_org boolean := false;
  created_ws boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Missing user id';
  END IF;

  SELECT organization_id, full_name, email, organization
    INTO prof_org, prof_name, prof_email, prof_company
  FROM public.profiles WHERE user_id = uid LIMIT 1;

  IF prof_org IS NULL THEN
    INSERT INTO public.organizations(name, plan)
    VALUES (COALESCE(NULLIF(prof_company,''), NULLIF(prof_name,''), prof_email, 'My Organization'), 'lite')
    RETURNING id INTO new_org;
    created_org := true;

    INSERT INTO public.profiles(user_id, email, organization_id)
    VALUES (uid, prof_email, new_org)
    ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

    prof_org := new_org;
  END IF;

  -- Deterministic: always the oldest workspace of the organization.
  SELECT id INTO ws
  FROM public.workspaces
  WHERE organization_id = prof_org
  ORDER BY created_at, id
  LIMIT 1;

  IF ws IS NULL THEN
    INSERT INTO public.workspaces(organization_id, name, created_by)
    VALUES (prof_org, 'Default Workspace', uid)
    RETURNING id INTO ws;
    created_ws := true;
  END IF;

  INSERT INTO public.organization_members(organization_id, user_id, role, status)
  VALUES (prof_org, uid, 'owner', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Guarantee membership of the workspace we are about to hand back, so
  -- workspace-scoped INSERT policies (workshops, boards, ...) always pass.
  INSERT INTO public.workspace_members(workspace_id, user_id, role)
  VALUES (ws, uid, COALESCE(public.org_role(uid, prof_org), 'owner'))
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  INSERT INTO public.entitlements(organization_id, plan_code, source)
  SELECT prof_org, 'lite', 'auto_provision'
  WHERE NOT EXISTS (SELECT 1 FROM public.entitlements e WHERE e.organization_id = prof_org);

  IF created_org OR created_ws THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'workspace', ws, 'workspace.provisioned',
            jsonb_build_object('organization_id', prof_org, 'workspace_id', ws,
                               'created_org', created_org, 'created_workspace', created_ws));
  END IF;

  RETURN ws;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.ensure_user_workspace(auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_use_case_integration_package(use_case_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uc public.use_cases%ROWTYPE;
  is_admin boolean;
  is_authed boolean;
  industry_name text;
  function_name text;
  ai_type_name text;
  tag_names text[];
  allowed_vis public.use_case_visibility[];
  result jsonb;
BEGIN
  SELECT * INTO uc FROM public.use_cases WHERE id = use_case_uuid;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  is_authed := auth.uid() IS NOT NULL;
  is_admin := is_authed AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ai_hub_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'usecasex_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_manager'::public.app_role)
    OR public.has_role(auth.uid(), 'reviewer'::public.app_role)
  );

  IF NOT is_admin THEN
    IF uc.status <> 'published'::public.use_case_status THEN
      RETURN NULL;
    END IF;
    IF is_authed THEN
      allowed_vis := ARRAY['free_lite','pro','both']::public.use_case_visibility[];
    ELSE
      allowed_vis := ARRAY['free_lite','both']::public.use_case_visibility[];
    END IF;
    IF NOT (uc.visibility = ANY(allowed_vis)) THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT i.name INTO industry_name
  FROM public.use_case_industries uci
  JOIN public.industries i ON i.id = uci.industry_id
  WHERE uci.use_case_id = uc.id
  ORDER BY i.name
  LIMIT 1;

  SELECT bf.name INTO function_name
  FROM public.use_case_business_functions ucbf
  JOIN public.business_functions bf ON bf.id = ucbf.business_function_id
  WHERE ucbf.use_case_id = uc.id
  ORDER BY bf.name
  LIMIT 1;

  SELECT ac.name INTO ai_type_name
  FROM public.use_case_capabilities ucc
  JOIN public.ai_capabilities ac ON ac.id = ucc.capability_id
  WHERE ucc.use_case_id = uc.id
  ORDER BY ac.name
  LIMIT 1;

  SELECT COALESCE(array_agg(DISTINCT bo.name ORDER BY bo.name), '{}')
  INTO tag_names
  FROM public.use_case_business_objectives ucbo
  JOIN public.business_objectives bo ON bo.id = ucbo.objective_id
  WHERE ucbo.use_case_id = uc.id;

  result := jsonb_build_object(
    'use_case_id', uc.id,
    'title', uc.title,
    'slug', uc.slug,
    'short_description', uc.summary,
    'full_description', uc.business_problem,
    'industry_name', industry_name,
    'function_name', function_name,
    'ai_type_name', ai_type_name,
    'value_potential', uc.value_potential,
    'complexity_level', uc.complexity,
    'risk_level', uc.risk_level,
    'maturity_level', COALESCE(uc.maturity_level, uc.maturity::text),
    'time_to_value', uc.time_to_value,
    'business_problem', uc.business_problem,
    'ai_solution', uc.ai_solution_concept,
    'data_required', uc.data_required,
    'kpis', COALESCE(to_jsonb(uc.kpis), '[]'::jsonb),
    'roi_areas', COALESCE(to_jsonb(uc.roi_areas), '[]'::jsonb),
    'implementation_steps', COALESCE(to_jsonb(uc.outcomes), '[]'::jsonb),
    'governance_notes', uc.governance_notes,
    'cybersecurity_notes', uc.cybersecurity_notes,
    'privacy_notes', uc.privacy_notes,
    'recommended_platforms', COALESCE(to_jsonb(uc.recommended_platforms), '[]'::jsonb),
    'tags', COALESCE(to_jsonb(tag_names), '[]'::jsonb),
    'governance_required', COALESCE(uc.governance_required, false),
    'privacy_review_required', COALESCE(uc.privacy_review_required, false),
    'cyber_review_required', COALESCE(uc.cyber_review_required, false),
    'assurance_review_required', COALESCE(uc.assurance_review_required, false),
    'roi_calculation_ready', (
      COALESCE(array_length(uc.kpis, 1), 0) > 0
      OR COALESCE(array_length(uc.roi_areas, 1), 0) > 0
    ),
    'readiness_assessment_ready', (
      uc.maturity_level IS NOT NULL OR uc.maturity IS NOT NULL
    ),
    'workflow_design_ready', (uc.ai_solution_concept IS NOT NULL),
    'advisor_recommendation_ready', (uc.value_potential IS NOT NULL)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_tier(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'moderator'::public.app_role)
    OR public.has_role(_user_id, 'super_admin'::public.app_role)
    OR public.has_role(_user_id, 'ai_hub_admin'::public.app_role)
    OR public.has_role(_user_id, 'usecasex_admin'::public.app_role)
    OR public.has_role(_user_id, 'content_manager'::public.app_role)
    OR public.has_role(_user_id, 'reviewer'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.has_pro_entitlement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (
        p.entitlement_tier IN ('pro','enterprise')
        OR p.plan_type IN ('pro','enterprise')
      )
      AND (p.entitlement_expires_at IS NULL OR p.entitlement_expires_at > now())
  ) OR public.is_admin_tier(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_demo_activity(_workspace_id uuid, _organization_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT w.is_demo FROM public.workspaces w WHERE w.id = _workspace_id), false)
    OR COALESCE((SELECT o.is_demo FROM public.organizations o WHERE o.id = _organization_id), false)
    OR COALESCE((
      SELECT lower(p.email) LIKE '%@demo.usecasex.app'
             OR COALESCE((SELECT o2.is_demo FROM public.organizations o2 WHERE o2.id = p.organization_id), false)
      FROM public.profiles p WHERE p.user_id = _user_id
    ), false)
$$;

CREATE OR REPLACE FUNCTION public.is_editor_tier(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'super_admin'::public.app_role)
    OR public.has_role(_user_id, 'ai_hub_admin'::public.app_role)
    OR public.has_role(_user_id, 'usecasex_admin'::public.app_role)
    OR public.has_role(_user_id, 'editor'::public.app_role)
    OR public.has_role(_user_id, 'moderator'::public.app_role)
    OR public.has_role(_user_id, 'content_manager'::public.app_role)
    OR public.has_role(_user_id, 'reviewer'::public.app_role)
    OR public.has_role(_user_id, 'contributor'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _user_id AND m.organization_id = _org_id AND m.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.user_id = _user_id AND m.workspace_id = _workspace_id
  )
$$;

CREATE OR REPLACE FUNCTION public.org_role(_user_id uuid, _org_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.organization_members m
  WHERE m.user_id = _user_id AND m.organization_id = _org_id AND m.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.portfolio_is_readable(_portfolio_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = _portfolio_id
      AND (
        p.user_id = _user_id
        OR (p.visibility <> 'private' AND p.workspace_id IS NOT NULL
            AND public.is_workspace_member(_user_id, p.workspace_id))
        OR (p.visibility = 'organization' AND p.organization_id IS NOT NULL
            AND public.is_org_member(_user_id, p.organization_id))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.portfolio_is_writable(_portfolio_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = _portfolio_id
      AND (
        p.user_id = _user_id
        OR public.org_role(_user_id, p.organization_id) IN ('owner','admin')
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_org_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    -- Service role / SECURITY DEFINER membership flows have no auth.uid().
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    -- Platform admins may reassign; a member may only be moved into an org
    -- they already hold an accepted membership row for.
    IF public.is_admin_tier(auth.uid()) THEN
      RETURN NEW;
    END IF;
    IF NEW.organization_id IS NOT NULL
       AND public.is_org_member(NEW.user_id, NEW.organization_id) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'organization_id cannot be changed on your own profile';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_use_case_submission(_submission_id uuid, _review_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  sub public.use_case_submissions%ROWTYPE;
  base_slug text;
  final_slug text;
  attempt int := 1;
  new_id uuid;
  ind_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to publish a submission.';
  END IF;
  IF NOT public.is_admin_tier(uid) THEN
    RAISE EXCEPTION 'Only reviewers or administrators can publish submissions.';
  END IF;

  SELECT * INTO sub FROM public.use_case_submissions WHERE id = _submission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found.';
  END IF;
  IF sub.status <> 'approved'::public.submission_status THEN
    RAISE EXCEPTION 'Only approved submissions can be published (current status: %).', sub.status;
  END IF;

  base_slug := NULLIF(regexp_replace(lower(trim(sub.title)), '[^a-z0-9]+', '-', 'g'), '');
  base_slug := trim(both '-' from COALESCE(base_slug, 'use-case'));
  IF base_slug = '' THEN base_slug := 'use-case'; END IF;
  base_slug := left(base_slug, 80);
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.use_cases WHERE slug = final_slug) LOOP
    attempt := attempt + 1;
    final_slug := base_slug || '-' || attempt;
    IF attempt > 50 THEN
      final_slug := base_slug || '-' || replace(gen_random_uuid()::text, '-', '');
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.use_cases (
    slug, title, summary, business_problem, ai_solution_concept, problem, solution,
    evidence_urls, submitted_by, status, content_status, visibility,
    provenance, provenance_note, quality_status, quality_checked_at, published_at
  ) VALUES (
    final_slug,
    sub.title,
    COALESCE(NULLIF(sub.summary, ''), sub.title),
    sub.business_problem,
    sub.ai_solution,
    sub.business_problem,
    sub.ai_solution,
    COALESCE(sub.sources, '{}'::text[]),
    sub.user_id,
    'published'::public.use_case_status,
    'published',
    'both'::public.use_case_visibility,
    'community_contribution',
    COALESCE(_review_notes, 'Community submission reviewed and published.'),
    'quality_passed',
    now(),
    now()
  )
  RETURNING id INTO new_id;

  IF sub.industry IS NOT NULL AND sub.industry <> '' THEN
    SELECT id INTO ind_id FROM public.industries
     WHERE lower(name) = lower(sub.industry)
        OR slug = regexp_replace(lower(trim(sub.industry)), '[^a-z0-9]+', '-', 'g')
     LIMIT 1;
    IF ind_id IS NOT NULL THEN
      INSERT INTO public.use_case_industries(use_case_id, industry_id)
      VALUES (new_id, ind_id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
  VALUES (uid, 'use_case', new_id, 'use_case.published_from_submission',
          jsonb_build_object('submission_id', sub.id, 'slug', final_slug, 'author', sub.user_id));

  RETURN jsonb_build_object('id', new_id, 'slug', final_slug);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_sector_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'published' OR NEW.status = 'featured');
  IF NEW.status IN ('published','featured') AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_tenancy_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org uuid;
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT p.organization_id INTO org FROM public.profiles p WHERE p.user_id = NEW.user_id;
    NEW.organization_id := org;
  END IF;
  IF NEW.workspace_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    SELECT w.id INTO NEW.workspace_id FROM public.workspaces w
    WHERE w.organization_id = NEW.organization_id ORDER BY w.created_at LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_use_case(_user_id uuid, _use_case_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ai_use_cases uc
    JOIN public.use_case_boards b ON b.id = uc.board_id
    JOIN public.workspaces w ON w.id = b.workspace_id
    WHERE uc.id = _use_case_id
      AND w.organization_id = public.user_org_id(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_workspace_member(_user_id, _workspace_id)
     OR EXISTS (
       SELECT 1 FROM public.workspaces w
       WHERE w.id = _workspace_id
         AND w.organization_id = public.user_org_id(_user_id)
     )
$$;

CREATE OR REPLACE FUNCTION public.accept_workshop_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.workshop_invitations%ROWTYPE;
  ws public.workshops%ROWTYPE;
  user_email text;
  in_workspace boolean;
  invited_by_email boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to join a workshop.';
  END IF;

  SELECT * INTO inv FROM public.workshop_invitations WHERE token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invitation link is not valid.';
  END IF;
  IF inv.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invitation has been revoked.';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'This invitation has expired.';
  END IF;
  IF inv.use_count >= inv.max_uses THEN
    RAISE EXCEPTION 'This invitation has already been used.';
  END IF;

  SELECT * INTO ws FROM public.workshops WHERE id = inv.workshop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This workshop is no longer available.';
  END IF;

  SELECT email INTO user_email FROM public.profiles WHERE user_id = uid;
  in_workspace := public.user_in_workspace(uid, ws.workspace_id);
  invited_by_email := inv.email IS NOT NULL
    AND user_email IS NOT NULL
    AND lower(inv.email) = lower(user_email);

  IF NOT in_workspace AND NOT invited_by_email THEN
    RAISE EXCEPTION 'This invitation is scoped to the host workspace. Ask the facilitator to invite your email address.';
  END IF;

  -- Email invitees get scoped access to this one workspace only.
  IF NOT in_workspace THEN
    INSERT INTO public.workspace_members(workspace_id, user_id, role)
    VALUES (ws.workspace_id, uid, 'viewer')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.workshop_participants(workshop_id, user_id, display_name, email, role)
  VALUES (inv.workshop_id, uid,
          COALESCE(NULLIF(inv.display_name,''), NULLIF(user_email,''), 'Participant'),
          COALESCE(inv.email, user_email),
          inv.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.workshop_participants
     SET user_id = uid,
         role = inv.role
   WHERE workshop_id = inv.workshop_id
     AND user_id IS NULL
     AND inv.email IS NOT NULL
     AND lower(email) = lower(inv.email);

  UPDATE public.workshop_invitations
     SET use_count = use_count + 1,
         accepted_at = COALESCE(accepted_at, now()),
         accepted_by = COALESCE(accepted_by, uid)
   WHERE id = inv.id;

  INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type,
                                  organization_id, workspace_id, new_value)
  VALUES (uid, 'workshop', inv.workshop_id, 'workshop.participant_joined',
          ws.organization_id, ws.workspace_id,
          jsonb_build_object('invitation_id', inv.id, 'role', inv.role,
                             'via', CASE WHEN invited_by_email THEN 'email' ELSE 'workspace_link' END));

  RETURN inv.workshop_id;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.workshop_is_facilitator(_workshop_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshops w
    WHERE w.id = _workshop_id
      AND (
        w.created_by = _user_id
        OR public.org_role(_user_id, w.organization_id) IN ('owner','admin')
        OR EXISTS (
          SELECT 1 FROM public.workshop_participants p
          WHERE p.workshop_id = w.id AND p.user_id = _user_id AND p.role = 'facilitator'
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.workshop_is_member(_workshop_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.workshop_is_facilitator(_workshop_id, _user_id)
    OR EXISTS (
      SELECT 1 FROM public.workshop_participants p
      WHERE p.workshop_id = _workshop_id AND p.user_id = _user_id
    )
$$;

CREATE OR REPLACE FUNCTION public.workspace_display_names(_workspace_id uuid, _user_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id,
         COALESCE(p.full_name, split_part(COALESCE(p.email, ''), '@', 1), 'Teammate') AS full_name
    FROM public.profiles p
   WHERE p.user_id = ANY(_user_ids)
     AND public.user_in_workspace(auth.uid(), _workspace_id);
$$;

CREATE OR REPLACE FUNCTION public.workspace_member_directory(_workspace_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id,
         COALESCE(p.full_name, split_part(COALESCE(p.email, ''), '@', 1), 'Teammate') AS full_name,
         p.email,
         m.role,
         m.joined_at
    FROM public.workspace_members m
    LEFT JOIN public.profiles p ON p.user_id = m.user_id
   WHERE m.workspace_id = _workspace_id
     AND public.user_in_workspace(auth.uid(), _workspace_id)
   ORDER BY m.joined_at NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.workspace_org(_workspace_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.organization_id FROM public.workspaces w WHERE w.id = _workspace_id
$$;

CREATE OR REPLACE FUNCTION public.sync_board_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_handoff_tenancy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_opportunity_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_tenancy_from_ai_use_case()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT u.workspace_id, u.organization_id INTO NEW.workspace_id, NEW.organization_id
    FROM public.ai_use_cases u WHERE u.id = NEW.use_case_id;
  END IF;
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_tenancy_from_board()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    SELECT b.workspace_id INTO NEW.workspace_id FROM public.use_case_boards b WHERE b.id = NEW.board_id;
  END IF;
  IF NEW.organization_id IS NULL AND NEW.workspace_id IS NOT NULL THEN
    NEW.organization_id := public.workspace_org(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.workspace_role(_user_id uuid, _workspace_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.workspace_members m
  WHERE m.user_id = _user_id AND m.workspace_id = _workspace_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.workspace_can_edit(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_in_workspace(_user_id, _workspace_id)
     AND COALESCE(
           public.workspace_role(_user_id, _workspace_id),
           public.org_role(_user_id, public.workspace_org(_workspace_id)),
           ''
         ) IN ('owner','admin','manager','contributor','editor','member','facilitator','workshop_facilitator','org_owner','workspace_owner','workspace_admin')
$$;

CREATE OR REPLACE FUNCTION public.workspace_can_manage(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.user_in_workspace(_user_id, _workspace_id)
     AND COALESCE(
           public.workspace_role(_user_id, _workspace_id),
           public.org_role(_user_id, public.workspace_org(_workspace_id)),
           ''
         ) IN ('owner','admin','manager','org_owner','workspace_owner','workspace_admin')
$$;

-- Phase 6b: CREATE VIEW
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.activation_funnel_daily CASCADE;
CREATE OR REPLACE VIEW public.activation_funnel_daily
WITH (security_invoker = on) AS
  SELECT (e.occurred_at AT TIME ZONE 'UTC')::date AS day,
         e.workspace_id,
         e.organization_id,
         e.event_name,
         count(*) AS event_count,
         count(DISTINCT e.user_id) AS user_count
  FROM public.product_events e
  WHERE NOT public.is_demo_activity(e.workspace_id, e.organization_id, e.user_id)
  GROUP BY 1, 2, 3, 4;
DROP VIEW IF EXISTS public.ai_usage_events_reportable CASCADE;
CREATE OR REPLACE VIEW public.ai_usage_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.ai_usage_events e
  WHERE NOT public.is_demo_activity(e.workspace_id, e.organization_id, e.user_id);
DROP VIEW IF EXISTS public.cta_events_reportable CASCADE;
CREATE OR REPLACE VIEW public.cta_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.cta_events e
  WHERE NOT public.is_demo_activity(NULL::uuid, NULL::uuid, e.user_id);
DROP VIEW IF EXISTS public.module_events_reportable CASCADE;
CREATE OR REPLACE VIEW public.module_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.module_events e
  WHERE NOT public.is_demo_activity(NULL::uuid, NULL::uuid, e.user_id);
DROP VIEW IF EXISTS public.product_events_reportable CASCADE;
CREATE OR REPLACE VIEW public.product_events_reportable
WITH (security_invoker = on) AS
  SELECT e.* FROM public.product_events e
  WHERE NOT public.is_demo_activity(e.workspace_id, e.organization_id, e.user_id);
DROP VIEW IF EXISTS public.use_case_rating_aggregates CASCADE;
CREATE OR REPLACE VIEW public.use_case_rating_aggregates AS
SELECT
  use_case_slug,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*)::INTEGER AS rating_count
FROM public.use_case_ratings
GROUP BY use_case_slug;
DROP VIEW IF EXISTS public.v_activation_funnel_weekly CASCADE;
CREATE OR REPLACE VIEW public.v_activation_funnel_weekly
WITH (security_invoker = on) AS
WITH staged AS (
  SELECT date_trunc('week', p.occurred_at)::date AS week,
         p.user_id,
         CASE p.event_name
           WHEN 'user.registered' THEN 'signup'
           WHEN 'onboarding.completed' THEN 'onboarding'
           WHEN 'opportunity.captured' THEN 'opportunity'
           WHEN 'use_case.completed' THEN 'completed_case'
           WHEN 'use_case.scored' THEN 'score'
           WHEN 'shortlist.added' THEN 'shortlist'
           WHEN 'portfolio.created' THEN 'portfolio'
           WHEN 'report.exported' THEN 'report'
           WHEN 'workshop.started' THEN 'workshop_advisory'
           WHEN 'advisory.requested' THEN 'workshop_advisory'
           WHEN 'handoff.requested' THEN 'workshop_advisory'
           ELSE NULL
         END AS stage
  FROM public.product_events p
  WHERE NOT public.is_demo_activity(p.workspace_id, p.organization_id, p.user_id)
)
SELECT week,
       stage,
       CASE stage
         WHEN 'signup' THEN 1 WHEN 'onboarding' THEN 2 WHEN 'opportunity' THEN 3
         WHEN 'completed_case' THEN 4 WHEN 'score' THEN 5 WHEN 'shortlist' THEN 6
         WHEN 'portfolio' THEN 7 WHEN 'report' THEN 8 ELSE 9 END AS stage_order,
       count(DISTINCT user_id) AS users,
       count(*) AS events
FROM staged
WHERE stage IS NOT NULL
GROUP BY 1, 2, 3;
DROP VIEW IF EXISTS public.v_ai_usage_weekly CASCADE;
CREATE OR REPLACE VIEW public.v_ai_usage_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', a.created_at)::date AS week,
       a.task,
       a.status,
       a.error_kind,
       count(*) AS calls,
       count(DISTINCT a.user_id) AS users,
       round(avg(a.duration_ms)) AS avg_duration_ms,
       sum(coalesce(a.total_tokens, 0)) AS total_tokens
FROM public.ai_usage_events a
WHERE NOT public.is_demo_activity(a.workspace_id, a.organization_id, a.user_id)
GROUP BY 1, 2, 3, 4;
DROP VIEW IF EXISTS public.v_enterprise_interest_weekly CASCADE;
CREATE OR REPLACE VIEW public.v_enterprise_interest_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', l.created_at)::date AS week,
       coalesce(l.interest_area, 'unspecified') AS interest_area,
       coalesce(l.cta, 'unspecified') AS cta,
       count(*) AS leads
FROM public.lead_captures l
GROUP BY 1, 2, 3;
DROP VIEW IF EXISTS public.v_feedback_queue CASCADE;
CREATE OR REPLACE VIEW public.v_feedback_queue AS
SELECT id,
    created_at,
    updated_at,
    status,
    category,
    severity,
    context_route,
    entity_type,
    entity_id,
    message,
    evidence_url,
    allow_contact,
    user_id,
    workspace_id,
    organization_id,
    resolution_note,
    resolved_at,
    assigned_to,
    assigned_by,
    assigned_at,
    priority,
    due_at,
    first_response_at,
    NOT public.is_demo_activity(workspace_id, organization_id, user_id) AS is_real_activity
   FROM public.product_feedback f;
DROP VIEW IF EXISTS public.v_launch_visitors_weekly CASCADE;
CREATE OR REPLACE VIEW public.v_launch_visitors_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', c.created_at)::date AS week,
       count(DISTINCT coalesce(c.session_id, c.id::text)) AS visitor_sessions,
       count(DISTINCT c.user_id) FILTER (WHERE c.user_id IS NOT NULL) AS signed_in_users,
       count(*) AS events
FROM public.cta_events c
WHERE NOT public.is_demo_activity(NULL, NULL, c.user_id)
GROUP BY 1;
DROP VIEW IF EXISTS public.v_search_insights_weekly CASCADE;
CREATE OR REPLACE VIEW public.v_search_insights_weekly
WITH (security_invoker = on) AS
SELECT date_trunc('week', c.created_at)::date AS week,
       lower(btrim(c.search_query)) AS search_query,
       count(*) AS searches,
       count(*) FILTER (WHERE coalesce(c.result_count, 0) = 0) AS zero_result_searches
FROM public.cta_events c
WHERE c.cta = 'search_used'
  AND c.search_query IS NOT NULL
  AND btrim(c.search_query) <> ''
  AND NOT public.is_demo_activity(NULL, NULL, c.user_id)
GROUP BY 1, 2;

-- ---------------------------------------------------------------------------
-- Phase 7: CREATE TRIGGER
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_portfolio_items_trg ON public.portfolio_items;
CREATE TRIGGER audit_portfolio_items_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_portfolio_items();
DROP TRIGGER IF EXISTS audit_use_case_benefits_trg ON public.use_case_benefits;
CREATE TRIGGER audit_use_case_benefits_trg
AFTER INSERT OR UPDATE OR DELETE ON public.use_case_benefits
FOR EACH ROW EXECUTE FUNCTION public.audit_use_case_benefits();
DROP TRIGGER IF EXISTS collab_assignments_updated_at ON public.collab_assignments;
CREATE TRIGGER collab_assignments_updated_at
  BEFORE UPDATE ON public.collab_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS collab_comments_updated_at ON public.collab_comments;
CREATE TRIGGER collab_comments_updated_at
  BEFORE UPDATE ON public.collab_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS collab_review_states_updated_at ON public.collab_review_states;
CREATE TRIGGER collab_review_states_updated_at
  BEFORE UPDATE ON public.collab_review_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP TRIGGER IF EXISTS opportunities_set_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS opportunities_sync_org ON public.opportunities;
CREATE TRIGGER opportunities_sync_org
  BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_org();
DROP TRIGGER IF EXISTS pilot_invitations_updated_at ON public.pilot_invitations;
CREATE TRIGGER pilot_invitations_updated_at
  BEFORE UPDATE ON public.pilot_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS pilot_milestone_approvals_updated_at ON public.pilot_milestone_approvals;
CREATE TRIGGER pilot_milestone_approvals_updated_at
  BEFORE UPDATE ON public.pilot_milestone_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS product_feedback_set_updated_at ON public.product_feedback;
CREATE TRIGGER product_feedback_set_updated_at
  BEFORE UPDATE ON public.product_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS profiles_guard_org_change ON public.profiles;
CREATE TRIGGER profiles_guard_org_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_org_self_change();
DROP TRIGGER IF EXISTS set_portfolio_items_updated_at ON public.portfolio_items;
CREATE TRIGGER set_portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER set_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS sync_portfolio_tenancy ON public.portfolios;
CREATE TRIGGER sync_portfolio_tenancy
  BEFORE INSERT ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS sync_scorecard_results_tenancy ON public.scorecard_results;
CREATE TRIGGER sync_scorecard_results_tenancy
  BEFORE INSERT ON public.scorecard_results
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS sync_use_case_versions_tenancy ON public.use_case_versions;
CREATE TRIGGER sync_use_case_versions_tenancy
  BEFORE INSERT ON public.use_case_versions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS trg_ai_use_cases_tenancy ON public.ai_use_cases;
CREATE TRIGGER trg_ai_use_cases_tenancy BEFORE INSERT ON public.ai_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_board();
DROP TRIGGER IF EXISTS trg_aiusecases_updated ON public.ai_use_cases;
CREATE TRIGGER trg_aiusecases_updated BEFORE UPDATE ON public.ai_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_audit_use_case_boards_del ON public.use_case_boards;
CREATE TRIGGER trg_audit_use_case_boards_del
AFTER DELETE ON public.use_case_boards
FOR EACH ROW EXECUTE FUNCTION public.audit_use_case_boards();
DROP TRIGGER IF EXISTS trg_audit_use_case_boards_ins ON public.use_case_boards;
CREATE TRIGGER trg_audit_use_case_boards_ins
AFTER INSERT ON public.use_case_boards
FOR EACH ROW EXECUTE FUNCTION public.audit_use_case_boards();
DROP TRIGGER IF EXISTS trg_audit_use_cases_del ON public.use_cases;
CREATE TRIGGER trg_audit_use_cases_del
AFTER DELETE ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.audit_use_cases();
DROP TRIGGER IF EXISTS trg_audit_use_cases_ins ON public.use_cases;
CREATE TRIGGER trg_audit_use_cases_ins
AFTER INSERT ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.audit_use_cases();
DROP TRIGGER IF EXISTS trg_audit_use_cases_upd ON public.use_cases;
CREATE TRIGGER trg_audit_use_cases_upd
AFTER UPDATE ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.audit_use_cases();
DROP TRIGGER IF EXISTS trg_blueprints_tenancy ON public.blueprints;
CREATE TRIGGER trg_blueprints_tenancy BEFORE INSERT ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS trg_blueprints_updated ON public.blueprints;
CREATE TRIGGER trg_blueprints_updated BEFORE UPDATE ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_boards_tenancy ON public.use_case_boards;
CREATE TRIGGER trg_boards_tenancy BEFORE INSERT ON public.use_case_boards
  FOR EACH ROW EXECUTE FUNCTION public.sync_board_org();
DROP TRIGGER IF EXISTS trg_boards_updated ON public.use_case_boards;
CREATE TRIGGER trg_boards_updated BEFORE UPDATE ON public.use_case_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_collections_tenancy ON public.collections;
CREATE TRIGGER trg_collections_tenancy BEFORE INSERT ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS trg_collections_updated ON public.collections;
CREATE TRIGGER trg_collections_updated
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_data_readiness_updated ON public.data_readiness_assessments;
CREATE TRIGGER trg_data_readiness_updated BEFORE UPDATE ON public.data_readiness_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_deliverables_tenancy ON public.use_case_deliverables;
CREATE TRIGGER trg_deliverables_tenancy BEFORE INSERT ON public.use_case_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS trg_dra_tenancy ON public.data_readiness_assessments;
CREATE TRIGGER trg_dra_tenancy BEFORE INSERT ON public.data_readiness_assessments
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS trg_entitlements_updated ON public.entitlements;
CREATE TRIGGER trg_entitlements_updated BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_feasibility_tenancy ON public.feasibility_scores;
CREATE TRIGGER trg_feasibility_tenancy BEFORE INSERT ON public.feasibility_scores
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS trg_feasibility_updated ON public.feasibility_scores;
CREATE TRIGGER trg_feasibility_updated BEFORE UPDATE ON public.feasibility_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_feedback_updated ON public.use_case_feedback;
CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON public.use_case_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_generated_reports_tenancy ON public.generated_reports;
CREATE TRIGGER trg_generated_reports_tenancy BEFORE INSERT ON public.generated_reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS trg_integration_links_tenancy ON public.integration_links;
CREATE TRIGGER trg_integration_links_tenancy BEFORE INSERT ON public.integration_links
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS trg_integration_links_updated ON public.integration_links;
CREATE TRIGGER trg_integration_links_updated BEFORE UPDATE ON public.integration_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_maturity_updated ON public.taxonomy_maturity_levels;
CREATE TRIGGER trg_maturity_updated BEFORE UPDATE ON public.taxonomy_maturity_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_org_members_updated ON public.organization_members;
CREATE TRIGGER trg_org_members_updated BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_org_units_updated ON public.organization_units;
CREATE TRIGGER trg_org_units_updated BEFORE UPDATE ON public.organization_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_orgs_updated ON public.organizations;
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_patterns_updated ON public.use_case_patterns;
CREATE TRIGGER trg_patterns_updated BEFORE UPDATE ON public.use_case_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_plans_updated ON public.plans;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_platform_modules_updated ON public.platform_modules;
CREATE TRIGGER trg_platform_modules_updated BEFORE UPDATE ON public.platform_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_portfolios_tenancy ON public.portfolios;
CREATE TRIGGER trg_portfolios_tenancy BEFORE INSERT ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS trg_portfolios_updated ON public.portfolios;
CREATE TRIGGER trg_portfolios_updated BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ratings_updated ON public.use_case_ratings;
CREATE TRIGGER trg_ratings_updated BEFORE UPDATE ON public.use_case_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_saved_use_cases_tenancy ON public.saved_use_cases;
CREATE TRIGGER trg_saved_use_cases_tenancy BEFORE INSERT ON public.saved_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS trg_scores_updated ON public.use_case_scores;
CREATE TRIGGER trg_scores_updated BEFORE UPDATE ON public.use_case_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_sectors_updated ON public.taxonomy_sectors;
CREATE TRIGGER trg_sectors_updated BEFORE UPDATE ON public.taxonomy_sectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_shortlists_tenancy ON public.shortlists;
CREATE TRIGGER trg_shortlists_tenancy BEFORE INSERT ON public.shortlists
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS trg_submissions_tenancy ON public.use_case_submissions;
CREATE TRIGGER trg_submissions_tenancy BEFORE INSERT ON public.use_case_submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS trg_submissions_updated ON public.use_case_submissions;
CREATE TRIGGER trg_submissions_updated
  BEFORE UPDATE ON public.use_case_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_suite_handoffs_tenancy ON public.suite_handoff_requests;
CREATE TRIGGER trg_suite_handoffs_tenancy
  BEFORE INSERT ON public.suite_handoff_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_handoff_tenancy();
DROP TRIGGER IF EXISTS trg_suite_handoffs_updated ON public.suite_handoff_requests;
CREATE TRIGGER trg_suite_handoffs_updated
  BEFORE UPDATE ON public.suite_handoff_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_sync_sector_published ON public.taxonomy_sectors;
CREATE TRIGGER trg_sync_sector_published
BEFORE INSERT OR UPDATE ON public.taxonomy_sectors
FOR EACH ROW EXECUTE FUNCTION public.sync_sector_published();
DROP TRIGGER IF EXISTS trg_tags_updated ON public.taxonomy_tags;
CREATE TRIGGER trg_tags_updated BEFORE UPDATE ON public.taxonomy_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_uc_scores_tenancy ON public.use_case_scores;
CREATE TRIGGER trg_uc_scores_tenancy BEFORE INSERT ON public.use_case_scores
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_profile();
DROP TRIGGER IF EXISTS trg_use_case_benefits_tenancy ON public.use_case_benefits;
CREATE TRIGGER trg_use_case_benefits_tenancy
BEFORE INSERT ON public.use_case_benefits
FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();
DROP TRIGGER IF EXISTS trg_use_case_benefits_updated ON public.use_case_benefits;
CREATE TRIGGER trg_use_case_benefits_updated
BEFORE UPDATE ON public.use_case_benefits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_use_cases_provenance ON public.use_cases;
CREATE TRIGGER trg_use_cases_provenance
BEFORE INSERT OR UPDATE ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.validate_use_case_provenance();
DROP TRIGGER IF EXISTS trg_use_cases_updated ON public.use_cases;
CREATE TRIGGER trg_use_cases_updated BEFORE UPDATE ON public.use_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_workshop_invitations_updated ON public.workshop_invitations;
CREATE TRIGGER trg_workshop_invitations_updated
  BEFORE UPDATE ON public.workshop_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_workshop_items_updated ON public.workshop_items;
CREATE TRIGGER trg_workshop_items_updated BEFORE UPDATE ON public.workshop_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_workshop_outcomes_updated ON public.workshop_outcomes;
CREATE TRIGGER trg_workshop_outcomes_updated BEFORE UPDATE ON public.workshop_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_workshop_votes_updated ON public.workshop_votes;
CREATE TRIGGER trg_workshop_votes_updated BEFORE UPDATE ON public.workshop_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_workshops_org ON public.workshops;
CREATE TRIGGER trg_workshops_org BEFORE INSERT ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.sync_board_org();
DROP TRIGGER IF EXISTS trg_workshops_updated ON public.workshops;
CREATE TRIGGER trg_workshops_updated BEFORE UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_workspace_export_preferences_updated ON public.workspace_export_preferences;
CREATE TRIGGER trg_workspace_export_preferences_updated
  BEFORE UPDATE ON public.workspace_export_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_workspaces_updated ON public.workspaces;
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_ws_members_updated ON public.workspace_members;
CREATE TRIGGER trg_ws_members_updated BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_engine_credentials_updated_at ON public.ai_engine_credentials;
CREATE TRIGGER update_ai_engine_credentials_updated_at BEFORE UPDATE ON public.ai_engine_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_engines_updated_at ON public.ai_engines;
CREATE TRIGGER update_ai_engines_updated_at BEFORE UPDATE ON public.ai_engines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_consent_records_updated_at ON public.consent_records;
CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_data_deletion_requests_updated_at ON public.data_deletion_requests;
CREATE TRIGGER update_data_deletion_requests_updated_at
  BEFORE UPDATE ON public.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_data_export_requests_updated_at ON public.data_export_requests;
CREATE TRIGGER update_data_export_requests_updated_at
  BEFORE UPDATE ON public.data_export_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_demo_reset_log_updated_at ON public.demo_reset_log;
CREATE TRIGGER update_demo_reset_log_updated_at
  BEFORE UPDATE ON public.demo_reset_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_pilot_applications_updated_at ON public.pilot_applications;
CREATE TRIGGER update_pilot_applications_updated_at
  BEFORE UPDATE ON public.pilot_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_pilot_launch_check_runs_updated_at ON public.pilot_launch_check_runs;
CREATE TRIGGER update_pilot_launch_check_runs_updated_at
BEFORE UPDATE ON public.pilot_launch_check_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_pilot_onboarding_profiles_updated_at ON public.pilot_onboarding_profiles;
CREATE TRIGGER update_pilot_onboarding_profiles_updated_at
BEFORE UPDATE ON public.pilot_onboarding_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_pilot_rc_waivers_updated_at ON public.pilot_rc_waivers;
CREATE TRIGGER update_pilot_rc_waivers_updated_at
  BEFORE UPDATE ON public.pilot_rc_waivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_pilot_reminder_dispatches_updated_at ON public.pilot_reminder_dispatches;
CREATE TRIGGER update_pilot_reminder_dispatches_updated_at
  BEFORE UPDATE ON public.pilot_reminder_dispatches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_portfolio_shares_updated_at ON public.portfolio_shares;
CREATE TRIGGER update_portfolio_shares_updated_at
BEFORE UPDATE ON public.portfolio_shares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_scorecards_updated_at ON public.scorecards;
CREATE TRIGGER update_scorecards_updated_at
  BEFORE UPDATE ON public.scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_use_case_deliverables_updated_at ON public.use_case_deliverables;
CREATE TRIGGER update_use_case_deliverables_updated_at
BEFORE UPDATE ON public.use_case_deliverables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_workshop_canvas_documents_updated_at ON public.workshop_canvas_documents;
CREATE TRIGGER update_workshop_canvas_documents_updated_at
BEFORE UPDATE ON public.workshop_canvas_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_workshop_public_value_canvas_updated_at ON public.workshop_public_value_canvas;
CREATE TRIGGER update_workshop_public_value_canvas_updated_at
BEFORE UPDATE ON public.workshop_public_value_canvas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_workspace_ai_engines_updated_at ON public.workspace_ai_engines;
CREATE TRIGGER update_workspace_ai_engines_updated_at BEFORE UPDATE ON public.workspace_ai_engines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS workspace_invitations_updated_at ON public.workspace_invitations;
CREATE TRIGGER workspace_invitations_updated_at
  BEFORE UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Phase 8: ALTER TABLE ENABLE ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_engine_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_review_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_hook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_readiness_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_reset_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_sample_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_module_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feasibility_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gov_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_browser_suite_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_checkpoint_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_launch_check_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_milestone_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_rc_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_reminder_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_verdict_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecard_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suite_handoff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_maturity_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_business_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_canvas_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_canvas_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_public_value_canvas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_ai_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_export_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_use_case_org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_use_case_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_use_case_strategic_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_use_case_value_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_risk_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_strategic_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_value_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_business_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_gov_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.use_case_strategic_themes ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Phase 9: CREATE POLICY
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Industries public read" ON public.industries;
DROP POLICY IF EXISTS "Admins manage industries" ON public.industries;
DROP POLICY IF EXISTS "Business fns public read" ON public.business_functions;
DROP POLICY IF EXISTS "Admins manage business fns" ON public.business_functions;
DROP POLICY IF EXISTS "Gov fns public read" ON public.gov_functions;
DROP POLICY IF EXISTS "Admins manage gov fns" ON public.gov_functions;
DROP POLICY IF EXISTS "Capabilities public read" ON public.ai_capabilities;
DROP POLICY IF EXISTS "Admins manage capabilities" ON public.ai_capabilities;
DROP POLICY IF EXISTS "Countries public read" ON public.countries;
DROP POLICY IF EXISTS "Anyone reads published" ON public.use_cases;
DROP POLICY IF EXISTS "Authors read own" ON public.use_cases;
DROP POLICY IF EXISTS "Moderators read all" ON public.use_cases;
DROP POLICY IF EXISTS "Auth users insert drafts" ON public.use_cases;
DROP POLICY IF EXISTS "Authors update own drafts" ON public.use_cases;
DROP POLICY IF EXISTS "Moderators update any" ON public.use_cases;
DROP POLICY IF EXISTS "Admins delete" ON public.use_cases;
DROP POLICY IF EXISTS "Public read metrics" ON public.use_case_metrics;
DROP POLICY IF EXISTS "Authors metrics" ON public.use_case_metrics;
DROP POLICY IF EXISTS "Mods metrics" ON public.use_case_metrics;
DROP POLICY IF EXISTS "Public read links" ON public.use_case_links;
DROP POLICY IF EXISTS "Authors links" ON public.use_case_links;
DROP POLICY IF EXISTS "Mods links" ON public.use_case_links;
DROP POLICY IF EXISTS "Own shortlist" ON public.shortlists;
DROP POLICY IF EXISTS "Objectives public read" ON public.business_objectives;
DROP POLICY IF EXISTS "Admins manage objectives" ON public.business_objectives;
DROP POLICY IF EXISTS "Public read uc_objectives" ON public.use_case_business_objectives;
DROP POLICY IF EXISTS "Authors manage uc_objectives" ON public.use_case_business_objectives;
DROP POLICY IF EXISTS "Mods manage uc_objectives" ON public.use_case_business_objectives;
DROP POLICY IF EXISTS "Anyone can submit lead" ON public.lead_captures;
DROP POLICY IF EXISTS "Admins read leads" ON public.lead_captures;
DROP POLICY IF EXISTS "Admins update leads" ON public.lead_captures;
DROP POLICY IF EXISTS "Anyone log cta" ON public.cta_events;
DROP POLICY IF EXISTS "Admins read cta" ON public.cta_events;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public read published sectors" ON public.taxonomy_sectors;
DROP POLICY IF EXISTS "Admins read all sectors" ON public.taxonomy_sectors;
DROP POLICY IF EXISTS "Admins manage sectors" ON public.taxonomy_sectors;
DROP POLICY IF EXISTS "Public read published tags" ON public.taxonomy_tags;
DROP POLICY IF EXISTS "Admins read all tags" ON public.taxonomy_tags;
DROP POLICY IF EXISTS "Admins manage tags" ON public.taxonomy_tags;
DROP POLICY IF EXISTS "Public read published maturity" ON public.taxonomy_maturity_levels;
DROP POLICY IF EXISTS "Admins read all maturity" ON public.taxonomy_maturity_levels;
DROP POLICY IF EXISTS "Admins manage maturity" ON public.taxonomy_maturity_levels;
DROP POLICY IF EXISTS "Public read taxonomy meta" ON public.taxonomy_meta;
DROP POLICY IF EXISTS "Admins update taxonomy meta" ON public.taxonomy_meta;
DROP POLICY IF EXISTS "Users manage own rating" ON public.use_case_ratings;
DROP POLICY IF EXISTS "Admins read ratings" ON public.use_case_ratings;
DROP POLICY IF EXISTS "Users manage own feedback" ON public.use_case_feedback;
DROP POLICY IF EXISTS "Admins manage all feedback" ON public.use_case_feedback;
DROP POLICY IF EXISTS "Public read platform modules" ON public.platform_modules;
DROP POLICY IF EXISTS "Admins manage platform modules" ON public.platform_modules;
DROP POLICY IF EXISTS "Own saved use cases" ON public.saved_use_cases;
DROP POLICY IF EXISTS "Own scores" ON public.use_case_scores;
DROP POLICY IF EXISTS "Own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Own portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Own reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Anyone log view" ON public.use_case_views;
DROP POLICY IF EXISTS "Admins read views" ON public.use_case_views;
DROP POLICY IF EXISTS "Anyone log download" ON public.use_case_downloads;
DROP POLICY IF EXISTS "Admins read downloads" ON public.use_case_downloads;
DROP POLICY IF EXISTS "Anyone log integration event" ON public.integration_events;
DROP POLICY IF EXISTS "Users read own integration events" ON public.integration_events;
DROP POLICY IF EXISTS "Public read external module links" ON public.external_module_links;
DROP POLICY IF EXISTS "Admins manage external module links" ON public.external_module_links;
DROP POLICY IF EXISTS "Admins read audit log" ON public.use_case_audit_log;
DROP POLICY IF EXISTS "Admins insert audit log" ON public.use_case_audit_log;
DROP POLICY IF EXISTS "Public reads published free_lite" ON public.use_cases;
DROP POLICY IF EXISTS "Authenticated reads pro" ON public.use_cases;
DROP POLICY IF EXISTS "Admin-tier reads all use cases" ON public.use_cases;
DROP POLICY IF EXISTS "Admin-tier inserts use cases" ON public.use_cases;
DROP POLICY IF EXISTS "Admin-tier updates use cases" ON public.use_cases;
DROP POLICY IF EXISTS "Admin-tier deletes use cases" ON public.use_cases;
DROP POLICY IF EXISTS "Members read own org" ON public.organizations;
DROP POLICY IF EXISTS "Admin tier manages orgs" ON public.organizations;
DROP POLICY IF EXISTS "Org members read workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Org members create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Org members update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Org members delete workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Public read published patterns" ON public.use_case_patterns;
DROP POLICY IF EXISTS "Admin tier reads all patterns" ON public.use_case_patterns;
DROP POLICY IF EXISTS "Admin tier manages patterns" ON public.use_case_patterns;
DROP POLICY IF EXISTS "Workspace members read boards" ON public.use_case_boards;
DROP POLICY IF EXISTS "Workspace members write boards" ON public.use_case_boards;
DROP POLICY IF EXISTS "Workspace members update boards" ON public.use_case_boards;
DROP POLICY IF EXISTS "Workspace members delete boards" ON public.use_case_boards;
DROP POLICY IF EXISTS "Members read board use cases" ON public.ai_use_cases;
DROP POLICY IF EXISTS "Members create board use cases" ON public.ai_use_cases;
DROP POLICY IF EXISTS "Members update board use cases" ON public.ai_use_cases;
DROP POLICY IF EXISTS "Members delete board use cases" ON public.ai_use_cases;
DROP POLICY IF EXISTS "Members access feasibility" ON public.feasibility_scores;
DROP POLICY IF EXISTS "Members access data readiness" ON public.data_readiness_assessments;
DROP POLICY IF EXISTS "Members access blueprints" ON public.blueprints;
DROP POLICY IF EXISTS "Members access integration links" ON public.integration_links;
DROP POLICY IF EXISTS "Authed users log audit" ON public.audit_events;
DROP POLICY IF EXISTS "Admin tier reads audit" ON public.audit_events;
DROP POLICY IF EXISTS "Editors or creators update boards" ON public.use_case_boards;
DROP POLICY IF EXISTS "Editors or creators delete boards" ON public.use_case_boards;
DROP POLICY IF EXISTS "Users view own submissions" ON public.use_case_submissions;
DROP POLICY IF EXISTS "Users create own submissions" ON public.use_case_submissions;
DROP POLICY IF EXISTS "Users edit own draft submissions" ON public.use_case_submissions;
DROP POLICY IF EXISTS "Admins update submissions" ON public.use_case_submissions;
DROP POLICY IF EXISTS "Users delete own draft submissions" ON public.use_case_submissions;
DROP POLICY IF EXISTS "Owners manage collections" ON public.collections;
DROP POLICY IF EXISTS "Public collections readable by authenticated" ON public.collections;
DROP POLICY IF EXISTS "Public collections readable by anon" ON public.collections;
DROP POLICY IF EXISTS "Read items of accessible collections" ON public.collection_items;
DROP POLICY IF EXISTS "Read items of public collections anon" ON public.collection_items;
DROP POLICY IF EXISTS "Owners insert items" ON public.collection_items;
DROP POLICY IF EXISTS "Owners update items" ON public.collection_items;
DROP POLICY IF EXISTS "Owners delete items" ON public.collection_items;
DROP POLICY IF EXISTS "Anyone can record module events" ON public.module_events;
DROP POLICY IF EXISTS "Users read own module events" ON public.module_events;
DROP POLICY IF EXISTS "Members access deliverables" ON public.use_case_deliverables;
DROP POLICY IF EXISTS "Org members read org sectors" ON public.taxonomy_sectors;
DROP POLICY IF EXISTS "Editors submit org sectors" ON public.taxonomy_sectors;
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Entitled reads pro" ON public.use_cases;
DROP POLICY IF EXISTS "Log own download" ON public.use_case_downloads;
DROP POLICY IF EXISTS "Log own integration event" ON public.integration_events;
DROP POLICY IF EXISTS "Log own view" ON public.use_case_views;
DROP POLICY IF EXISTS "Users read own downloads" ON public.use_case_downloads;
DROP POLICY IF EXISTS "Users read own views" ON public.use_case_views;
DROP POLICY IF EXISTS "Members read their org membership rows" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins add members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners and admins update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins remove members or member leaves" ON public.organization_members;
DROP POLICY IF EXISTS "Members read workspace membership rows" ON public.workspace_members;
DROP POLICY IF EXISTS "Org admins add workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Org admins update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Org admins remove workspace members or member leaves" ON public.workspace_members;
DROP POLICY IF EXISTS "Org members read units" ON public.organization_units;
DROP POLICY IF EXISTS "Org admins insert units" ON public.organization_units;
DROP POLICY IF EXISTS "Org admins update units" ON public.organization_units;
DROP POLICY IF EXISTS "Org admins delete units" ON public.organization_units;
DROP POLICY IF EXISTS "Plans are publicly readable" ON public.plans;
DROP POLICY IF EXISTS "Platform admins insert plans" ON public.plans;
DROP POLICY IF EXISTS "Platform admins update plans" ON public.plans;
DROP POLICY IF EXISTS "Platform admins delete plans" ON public.plans;
DROP POLICY IF EXISTS "Org members read entitlements" ON public.entitlements;
DROP POLICY IF EXISTS "Workspace members read collections" ON public.collections;
DROP POLICY IF EXISTS "Owners insert collections" ON public.collections;
DROP POLICY IF EXISTS "Owners update collections" ON public.collections;
DROP POLICY IF EXISTS "Owners or org admins delete collections" ON public.collections;
DROP POLICY IF EXISTS "Workspace members read portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Owners insert portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Owners update portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Owners or org admins delete portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Workspace members read reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Owners insert reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Owners update reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Owners or org admins delete reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Workspace members read saved use cases" ON public.saved_use_cases;
DROP POLICY IF EXISTS "Owners insert saved use cases" ON public.saved_use_cases;
DROP POLICY IF EXISTS "Owners update saved use cases" ON public.saved_use_cases;
DROP POLICY IF EXISTS "Owners delete saved use cases" ON public.saved_use_cases;
DROP POLICY IF EXISTS "Workspace members read shortlists" ON public.shortlists;
DROP POLICY IF EXISTS "Owners insert shortlists" ON public.shortlists;
DROP POLICY IF EXISTS "Owners update shortlists" ON public.shortlists;
DROP POLICY IF EXISTS "Owners delete shortlists" ON public.shortlists;
DROP POLICY IF EXISTS "Workspace members read scores" ON public.use_case_scores;
DROP POLICY IF EXISTS "Owners insert scores" ON public.use_case_scores;
DROP POLICY IF EXISTS "Owners update scores" ON public.use_case_scores;
DROP POLICY IF EXISTS "Owners delete scores" ON public.use_case_scores;
DROP POLICY IF EXISTS "Workspace members read submissions" ON public.use_case_submissions;
DROP POLICY IF EXISTS "ai_usage_events_select_own" ON public.ai_usage_events;
DROP POLICY IF EXISTS "ai_usage_events_select_workspace_admin" ON public.ai_usage_events;
DROP POLICY IF EXISTS "ai_usage_events_insert_own" ON public.ai_usage_events;
DROP POLICY IF EXISTS "Workspace admins read workspace audit" ON public.audit_events;
DROP POLICY IF EXISTS "Users record their own product events" ON public.product_events;
DROP POLICY IF EXISTS "Users read their own product events" ON public.product_events;
DROP POLICY IF EXISTS "Workspace admins read workspace product events" ON public.product_events;
DROP POLICY IF EXISTS "Platform admins read product events" ON public.product_events;
DROP POLICY IF EXISTS "Workspace members can read opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Workspace members can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Workspace members can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Creators and workspace owners can delete opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Workspace members can read use case versions" ON public.use_case_versions;
DROP POLICY IF EXISTS "Workspace members can create use case versions" ON public.use_case_versions;
DROP POLICY IF EXISTS "Global scorecards are readable" ON public.scorecards;
DROP POLICY IF EXISTS "Workspace members read their scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Workspace members create workspace scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Workspace members update workspace scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Workspace members delete workspace scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Admins manage global scorecards" ON public.scorecards;
DROP POLICY IF EXISTS "Workspace members read scorecard results" ON public.scorecard_results;
DROP POLICY IF EXISTS "Workspace members record scorecard results" ON public.scorecard_results;
DROP POLICY IF EXISTS "Readers view portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Writers insert portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Writers update portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Writers delete portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Readable by portfolio readers" ON public.portfolio_shares;
DROP POLICY IF EXISTS "Writable by portfolio writers" ON public.portfolio_shares;
DROP POLICY IF EXISTS "Updatable by portfolio writers" ON public.portfolio_shares;
DROP POLICY IF EXISTS "Deletable by portfolio writers" ON public.portfolio_shares;
DROP POLICY IF EXISTS "Workspace members read export preferences" ON public.workspace_export_preferences;
DROP POLICY IF EXISTS "Workspace members create export preferences" ON public.workspace_export_preferences;
DROP POLICY IF EXISTS "Workspace members update export preferences" ON public.workspace_export_preferences;
DROP POLICY IF EXISTS "Workspace members delete export preferences" ON public.workspace_export_preferences;
DROP POLICY IF EXISTS "Members read deliverable versions" ON public.use_case_deliverable_versions;
DROP POLICY IF EXISTS "Members create deliverable versions" ON public.use_case_deliverable_versions;
DROP POLICY IF EXISTS "Members access use case benefits" ON public.use_case_benefits;
DROP POLICY IF EXISTS "benefit evidence read own" ON storage.objects;
DROP POLICY IF EXISTS "benefit evidence insert own" ON storage.objects;
DROP POLICY IF EXISTS "benefit evidence update own" ON storage.objects;
DROP POLICY IF EXISTS "benefit evidence delete own" ON storage.objects;
DROP POLICY IF EXISTS "Workshop members read workshops" ON public.workshops;
DROP POLICY IF EXISTS "Workspace members create workshops" ON public.workshops;
DROP POLICY IF EXISTS "Facilitators update workshops" ON public.workshops;
DROP POLICY IF EXISTS "Facilitators delete workshops" ON public.workshops;
DROP POLICY IF EXISTS "Workshop members read participants" ON public.workshop_participants;
DROP POLICY IF EXISTS "Facilitators manage participants" ON public.workshop_participants;
DROP POLICY IF EXISTS "Workshop members read items" ON public.workshop_items;
DROP POLICY IF EXISTS "Workshop members submit items" ON public.workshop_items;
DROP POLICY IF EXISTS "Authors edit unreviewed items" ON public.workshop_items;
DROP POLICY IF EXISTS "Facilitators curate items" ON public.workshop_items;
DROP POLICY IF EXISTS "Facilitators delete items" ON public.workshop_items;
DROP POLICY IF EXISTS "Workshop members read votes" ON public.workshop_votes;
DROP POLICY IF EXISTS "Members cast own votes" ON public.workshop_votes;
DROP POLICY IF EXISTS "Members change own votes" ON public.workshop_votes;
DROP POLICY IF EXISTS "Members withdraw own votes" ON public.workshop_votes;
DROP POLICY IF EXISTS "Workshop members read outcomes" ON public.workshop_outcomes;
DROP POLICY IF EXISTS "Facilitators write outcomes" ON public.workshop_outcomes;
DROP POLICY IF EXISTS "Facilitators read workshop invitations" ON public.workshop_invitations;
DROP POLICY IF EXISTS "Facilitators create workshop invitations" ON public.workshop_invitations;
DROP POLICY IF EXISTS "Facilitators update workshop invitations" ON public.workshop_invitations;
DROP POLICY IF EXISTS "Facilitators delete workshop invitations" ON public.workshop_invitations;
DROP POLICY IF EXISTS "Managers read workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Managers create workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Managers revoke workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Workspace members read review notes" ON public.collab_comments;
DROP POLICY IF EXISTS "Editors add review notes" ON public.collab_comments;
DROP POLICY IF EXISTS "Authors and managers update review notes" ON public.collab_comments;
DROP POLICY IF EXISTS "Authors and managers delete review notes" ON public.collab_comments;
DROP POLICY IF EXISTS "Workspace members read assignments" ON public.collab_assignments;
DROP POLICY IF EXISTS "Editors create assignments" ON public.collab_assignments;
DROP POLICY IF EXISTS "Editors update assignments" ON public.collab_assignments;
DROP POLICY IF EXISTS "Editors remove assignments" ON public.collab_assignments;
DROP POLICY IF EXISTS "Workspace members read review status" ON public.collab_review_states;
DROP POLICY IF EXISTS "Editors set review status" ON public.collab_review_states;
DROP POLICY IF EXISTS "Editors change review status" ON public.collab_review_states;
DROP POLICY IF EXISTS "Workspace members read handoff requests" ON public.suite_handoff_requests;
DROP POLICY IF EXISTS "Workspace editors raise handoff requests" ON public.suite_handoff_requests;
DROP POLICY IF EXISTS "Managers and owners update handoff requests" ON public.suite_handoff_requests;
DROP POLICY IF EXISTS "Users read their own sample copies" ON public.demo_sample_copies;
DROP POLICY IF EXISTS "Users record their own sample copies" ON public.demo_sample_copies;
DROP POLICY IF EXISTS "Users remove their own sample copies" ON public.demo_sample_copies;
DROP POLICY IF EXISTS "Platform admins read demo reset log" ON public.demo_reset_log;
DROP POLICY IF EXISTS "Users submit their own feedback" ON public.product_feedback;
DROP POLICY IF EXISTS "Users read their own feedback" ON public.product_feedback;
DROP POLICY IF EXISTS "Platform admins read all feedback" ON public.product_feedback;
DROP POLICY IF EXISTS "Platform admins triage feedback" ON public.product_feedback;
DROP POLICY IF EXISTS "Public read public visible feedback" ON public.use_case_feedback;
DROP POLICY IF EXISTS "Reporters read their own request alerts" ON public.request_status_alerts;
DROP POLICY IF EXISTS "Reporters mark their own alerts read" ON public.request_status_alerts;
DROP POLICY IF EXISTS "Admins create request alerts" ON public.request_status_alerts;
DROP POLICY IF EXISTS "Participants read their own pilot invitation" ON public.pilot_invitations;
DROP POLICY IF EXISTS "Platform admins read pilot invitations" ON public.pilot_invitations;
DROP POLICY IF EXISTS "Platform admins create pilot invitations" ON public.pilot_invitations;
DROP POLICY IF EXISTS "Platform admins update pilot invitations" ON public.pilot_invitations;
DROP POLICY IF EXISTS "Platform admins read pilot settings" ON public.pilot_settings;
DROP POLICY IF EXISTS "Platform admins insert pilot settings" ON public.pilot_settings;
DROP POLICY IF EXISTS "Platform admins update pilot settings" ON public.pilot_settings;
DROP POLICY IF EXISTS "Participants read their own checkpoint responses" ON public.pilot_checkpoint_responses;
DROP POLICY IF EXISTS "Participants record their own checkpoint responses" ON public.pilot_checkpoint_responses;
DROP POLICY IF EXISTS "Platform admins read checkpoint responses" ON public.pilot_checkpoint_responses;
DROP POLICY IF EXISTS "Platform admins read the pilot audit trail" ON public.pilot_audit_events;
DROP POLICY IF EXISTS "Participants read their own pilot reminders" ON public.pilot_reminders;
DROP POLICY IF EXISTS "Participants dismiss their own pilot reminders" ON public.pilot_reminders;
DROP POLICY IF EXISTS "Users read own export requests" ON public.data_export_requests;
DROP POLICY IF EXISTS "Users create own export requests" ON public.data_export_requests;
DROP POLICY IF EXISTS "Users update own export requests" ON public.data_export_requests;
DROP POLICY IF EXISTS "Users read own deletion requests" ON public.data_deletion_requests;
DROP POLICY IF EXISTS "Users create own deletion requests" ON public.data_deletion_requests;
DROP POLICY IF EXISTS "Users update own deletion requests" ON public.data_deletion_requests;
DROP POLICY IF EXISTS "Users read own consent records" ON public.consent_records;
DROP POLICY IF EXISTS "Users record own consent" ON public.consent_records;
DROP POLICY IF EXISTS "Platform admins read launch waivers" ON public.pilot_rc_waivers;
DROP POLICY IF EXISTS "Platform admins grant launch waivers" ON public.pilot_rc_waivers;
DROP POLICY IF EXISTS "Platform admins revoke launch waivers" ON public.pilot_rc_waivers;
DROP POLICY IF EXISTS "Platform admins read verdict snapshots" ON public.pilot_verdict_snapshots;
DROP POLICY IF EXISTS "Platform admins record verdict snapshots" ON public.pilot_verdict_snapshots;
DROP POLICY IF EXISTS "Platform admins read reminder dispatches" ON public.pilot_reminder_dispatches;
DROP POLICY IF EXISTS "Workshop members read the public value canvas" ON public.workshop_public_value_canvas;
DROP POLICY IF EXISTS "Facilitators write the public value canvas" ON public.workshop_public_value_canvas;
DROP POLICY IF EXISTS "Platform admins read launch check runs" ON public.pilot_launch_check_runs;
DROP POLICY IF EXISTS "Platform admins record launch check runs" ON public.pilot_launch_check_runs;
DROP POLICY IF EXISTS "Workshop members read canvas documents" ON public.workshop_canvas_documents;
DROP POLICY IF EXISTS "Facilitators attach canvas documents" ON public.workshop_canvas_documents;
DROP POLICY IF EXISTS "Facilitators update canvas documents" ON public.workshop_canvas_documents;
DROP POLICY IF EXISTS "Facilitators remove canvas documents" ON public.workshop_canvas_documents;
DROP POLICY IF EXISTS "Workshop members read canvas versions" ON public.workshop_canvas_versions;
DROP POLICY IF EXISTS "Facilitators record canvas versions" ON public.workshop_canvas_versions;
DROP POLICY IF EXISTS "Workshop members read canvas files" ON storage.objects;
DROP POLICY IF EXISTS "Facilitators upload canvas files" ON storage.objects;
DROP POLICY IF EXISTS "Facilitators delete canvas files" ON storage.objects;
DROP POLICY IF EXISTS "Admins read lead events" ON public.lead_events;
DROP POLICY IF EXISTS "Admins write lead events" ON public.lead_events;
DROP POLICY IF EXISTS "Participants read own pilot onboarding" ON public.pilot_onboarding_profiles;
DROP POLICY IF EXISTS "Participants create own pilot onboarding" ON public.pilot_onboarding_profiles;
DROP POLICY IF EXISTS "Participants update own pilot onboarding" ON public.pilot_onboarding_profiles;
DROP POLICY IF EXISTS "Platform admins read browser suite runs" ON public.pilot_browser_suite_runs;
DROP POLICY IF EXISTS "Platform admins record browser suite runs" ON public.pilot_browser_suite_runs;
DROP POLICY IF EXISTS "Platform admins can read pilot applications" ON public.pilot_applications;
DROP POLICY IF EXISTS "Platform admins can update pilot applications" ON public.pilot_applications;
DROP POLICY IF EXISTS "Signed-in users can read engines" ON public.ai_engines;
DROP POLICY IF EXISTS "Platform admins manage engines" ON public.ai_engines;
DROP POLICY IF EXISTS "Workspace managers read their engine keys" ON public.workspace_ai_engines;
DROP POLICY IF EXISTS "Workspace managers add engine keys" ON public.workspace_ai_engines;
DROP POLICY IF EXISTS "Workspace managers update engine keys" ON public.workspace_ai_engines;
DROP POLICY IF EXISTS "Workspace managers delete engine keys" ON public.workspace_ai_engines;
DROP POLICY IF EXISTS "Participants read own milestone approvals" ON public.pilot_milestone_approvals;
DROP POLICY IF EXISTS "Participants submit own milestones" ON public.pilot_milestone_approvals;
DROP POLICY IF EXISTS "Participants resubmit own milestones" ON public.pilot_milestone_approvals;
DROP POLICY IF EXISTS "Admins decide milestone approvals" ON public.pilot_milestone_approvals;
DROP POLICY IF EXISTS "Allow anonymous read access to published use cases" ON public.use_cases;
CREATE POLICY "Users view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Industries public read" ON public.industries FOR SELECT USING (true);
CREATE POLICY "Admins manage industries" ON public.industries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Business fns public read" ON public.business_functions FOR SELECT USING (true);
CREATE POLICY "Admins manage business fns" ON public.business_functions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Gov fns public read" ON public.gov_functions FOR SELECT USING (true);
CREATE POLICY "Admins manage gov fns" ON public.gov_functions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Capabilities public read" ON public.ai_capabilities FOR SELECT USING (true);
CREATE POLICY "Admins manage capabilities" ON public.ai_capabilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Countries public read" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Anyone reads published" ON public.use_cases FOR SELECT
  USING (status = 'published');
CREATE POLICY "Authors read own" ON public.use_cases FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());
CREATE POLICY "Moderators read all" ON public.use_cases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Auth users insert drafts" ON public.use_cases FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND status IN ('draft','review'));
CREATE POLICY "Authors update own drafts" ON public.use_cases FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() AND status IN ('draft','review'))
  WITH CHECK (submitted_by = auth.uid() AND status IN ('draft','review'));
CREATE POLICY "Moderators update any" ON public.use_cases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Admins delete" ON public.use_cases FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read metrics" ON public.use_case_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.status = 'published')
);
CREATE POLICY "Authors metrics" ON public.use_case_metrics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()));
CREATE POLICY "Mods metrics" ON public.use_case_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Public read links" ON public.use_case_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.status = 'published')
);
CREATE POLICY "Authors links" ON public.use_case_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()));
CREATE POLICY "Mods links" ON public.use_case_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Own shortlist" ON public.shortlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Objectives public read" ON public.business_objectives FOR SELECT USING (true);
CREATE POLICY "Admins manage objectives" ON public.business_objectives FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Public read uc_objectives" ON public.use_case_business_objectives FOR SELECT
  USING (EXISTS (SELECT 1 FROM use_cases u WHERE u.id = use_case_id AND u.status = 'published'));
CREATE POLICY "Authors manage uc_objectives" ON public.use_case_business_objectives FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM use_cases u WHERE u.id = use_case_id AND u.submitted_by = auth.uid()));
CREATE POLICY "Mods manage uc_objectives" ON public.use_case_business_objectives FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Anyone can submit lead"
ON public.lead_captures
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
CREATE POLICY "Admins read leads"
  ON public.lead_captures FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Admins update leads"
  ON public.lead_captures FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Anyone log cta"
ON public.cta_events
FOR INSERT
WITH CHECK (
  (length(COALESCE(cta, ''::text)) >= 1)
  AND (length(COALESCE(cta, ''::text)) <= 100)
  AND (length(COALESCE(target_platform, ''::text)) <= 100)
  AND (user_id IS NULL OR user_id = auth.uid())
);
CREATE POLICY "Admins read cta"
  ON public.cta_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public read published sectors" ON public.taxonomy_sectors FOR SELECT USING (is_published = true);
CREATE POLICY "Admins read all sectors" ON public.taxonomy_sectors FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins manage sectors" ON public.taxonomy_sectors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Public read published tags" ON public.taxonomy_tags FOR SELECT USING (is_published = true);
CREATE POLICY "Admins read all tags" ON public.taxonomy_tags FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins manage tags" ON public.taxonomy_tags FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Public read published maturity" ON public.taxonomy_maturity_levels FOR SELECT USING (is_published = true);
CREATE POLICY "Admins read all maturity" ON public.taxonomy_maturity_levels FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins manage maturity" ON public.taxonomy_maturity_levels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Public read taxonomy meta" ON public.taxonomy_meta FOR SELECT USING (true);
CREATE POLICY "Admins update taxonomy meta" ON public.taxonomy_meta FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Users manage own rating" ON public.use_case_ratings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read ratings"
  ON public.use_case_ratings FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Users manage own feedback" ON public.use_case_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all feedback" ON public.use_case_feedback FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Public read platform modules" ON public.platform_modules
  FOR SELECT TO public USING (is_published = true);
CREATE POLICY "Admins manage platform modules" ON public.platform_modules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Own saved use cases" ON public.saved_use_cases
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own scores" ON public.use_case_scores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own portfolios" ON public.portfolios
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own portfolio items" ON public.portfolio_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_items.portfolio_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_items.portfolio_id AND p.user_id = auth.uid()));
CREATE POLICY "Own reports" ON public.generated_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone log view" ON public.use_case_views
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins read views"
  ON public.use_case_views FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Anyone log download" ON public.use_case_downloads
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins read downloads"
  ON public.use_case_downloads FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Anyone log integration event" ON public.integration_events
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users read own integration events" ON public.integration_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Public read external module links" ON public.external_module_links
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.use_cases u WHERE u.id = external_module_links.use_case_id AND u.status = 'published'));
CREATE POLICY "Admins manage external module links" ON public.external_module_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins read audit log" ON public.use_case_audit_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')
    OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  );
CREATE POLICY "Admins insert audit log" ON public.use_case_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND (
      has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')
      OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
      OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
      OR has_role(auth.uid(),'reviewer')
    )
  );
CREATE POLICY "Public reads published free_lite"
  ON public.use_cases FOR SELECT TO anon, authenticated
  USING (status = 'published'::use_case_status AND visibility IN ('free_lite','both'));
CREATE POLICY "Authenticated reads pro"
  ON public.use_cases FOR SELECT TO authenticated
  USING (status = 'published'::use_case_status AND visibility = 'pro');
CREATE POLICY "Admin-tier reads all use cases"
  ON public.use_cases FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  );
CREATE POLICY "Admin-tier inserts use cases"
  ON public.use_cases FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid() AND (
      has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
      OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    )
  );
CREATE POLICY "Admin-tier updates use cases"
  ON public.use_cases FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin')
    OR has_role(auth.uid(),'usecasex_admin') OR has_role(auth.uid(),'content_manager')
    OR has_role(auth.uid(),'reviewer')
  );
CREATE POLICY "Admin-tier deletes use cases"
  ON public.use_cases FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'ai_hub_admin'));
CREATE POLICY "Members read own org"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.user_org_id(auth.uid()) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Admin tier manages orgs"
  ON public.organizations FOR ALL TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Org members read workspaces"
  ON public.workspaces FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id(auth.uid()) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Org members create workspaces"
  ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.user_org_id(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Org members update workspaces"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (organization_id = public.user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.user_org_id(auth.uid()));
CREATE POLICY "Org members delete workspaces"
  ON public.workspaces FOR DELETE TO authenticated
  USING (organization_id = public.user_org_id(auth.uid()) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Public read published patterns"
  ON public.use_case_patterns FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY "Admin tier reads all patterns"
  ON public.use_case_patterns FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Admin tier manages patterns"
  ON public.use_case_patterns FOR ALL TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Workspace members read boards"
  ON public.use_case_boards FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Workspace members write boards"
  ON public.use_case_boards FOR INSERT TO authenticated
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "Workspace members update boards"
  ON public.use_case_boards FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id))
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members delete boards"
  ON public.use_case_boards FOR DELETE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Members read board use cases"
  ON public.ai_use_cases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_case_boards b
                 WHERE b.id = ai_use_cases.board_id
                   AND public.user_in_workspace(auth.uid(), b.workspace_id))
         OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Members create board use cases"
  ON public.ai_use_cases FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid()
              AND EXISTS (SELECT 1 FROM public.use_case_boards b
                          WHERE b.id = board_id
                            AND public.user_in_workspace(auth.uid(), b.workspace_id)));
CREATE POLICY "Members update board use cases"
  ON public.ai_use_cases FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_case_boards b
                 WHERE b.id = ai_use_cases.board_id
                   AND public.user_in_workspace(auth.uid(), b.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.use_case_boards b
                      WHERE b.id = ai_use_cases.board_id
                        AND public.user_in_workspace(auth.uid(), b.workspace_id)));
CREATE POLICY "Members delete board use cases"
  ON public.ai_use_cases FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.use_case_boards b
                 WHERE b.id = ai_use_cases.board_id
                   AND public.user_in_workspace(auth.uid(), b.workspace_id)));
CREATE POLICY "Members access feasibility"
  ON public.feasibility_scores FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));
CREATE POLICY "Members access data readiness"
  ON public.data_readiness_assessments FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));
CREATE POLICY "Members access blueprints"
  ON public.blueprints FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));
CREATE POLICY "Members access integration links"
  ON public.integration_links FOR ALL TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id));
CREATE POLICY "Authed users log audit"
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
CREATE POLICY "Admin tier reads audit"
  ON public.audit_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()) OR actor_id = auth.uid());
CREATE POLICY "Editors or creators update boards"
ON public.use_case_boards FOR UPDATE TO authenticated
USING (
  user_in_workspace(auth.uid(), workspace_id)
  AND (public.is_editor_tier(auth.uid()) OR created_by = auth.uid())
)
WITH CHECK (
  user_in_workspace(auth.uid(), workspace_id)
  AND (public.is_editor_tier(auth.uid()) OR created_by = auth.uid())
);
CREATE POLICY "Editors or creators delete boards"
ON public.use_case_boards FOR DELETE TO authenticated
USING (
  user_in_workspace(auth.uid(), workspace_id)
  AND (public.is_editor_tier(auth.uid()) OR created_by = auth.uid())
);
CREATE POLICY "Users view own submissions" ON public.use_case_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Users create own submissions" ON public.use_case_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own draft submissions" ON public.use_case_submissions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND status = ANY (ARRAY['draft'::submission_status, 'submitted'::submission_status])
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = ANY (ARRAY['draft'::submission_status, 'submitted'::submission_status])
  );
CREATE POLICY "Admins update submissions" ON public.use_case_submissions
  FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Users delete own draft submissions" ON public.use_case_submissions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');
CREATE POLICY "Owners manage collections" ON public.collections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public collections readable by authenticated" ON public.collections
  FOR SELECT TO authenticated
  USING (is_public = true);
CREATE POLICY "Public collections readable by anon" ON public.collections
  FOR SELECT TO anon
  USING (is_public = true);
CREATE POLICY "Read items of accessible collections" ON public.collection_items
  FOR SELECT TO authenticated
  USING (public.collection_is_accessible(collection_id, auth.uid()));
CREATE POLICY "Read items of public collections anon" ON public.collection_items
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.is_public = true));
CREATE POLICY "Owners insert items" ON public.collection_items
  FOR INSERT TO authenticated
  WITH CHECK (public.collection_is_owned(collection_id, auth.uid()));
CREATE POLICY "Owners update items" ON public.collection_items
  FOR UPDATE TO authenticated
  USING (public.collection_is_owned(collection_id, auth.uid()))
  WITH CHECK (public.collection_is_owned(collection_id, auth.uid()));
CREATE POLICY "Owners delete items" ON public.collection_items
  FOR DELETE TO authenticated
  USING (public.collection_is_owned(collection_id, auth.uid()));
CREATE POLICY "Anyone can record module events"
ON public.module_events
FOR INSERT
WITH CHECK (
  (event_type = ANY (ARRAY['view'::text, 'click'::text, 'lock_attempt'::text, 'unlock_attempt'::text]))
  AND (length(module_key) >= 1 AND length(module_key) <= 120)
  AND (user_id IS NULL OR user_id = auth.uid())
);
CREATE POLICY "Users read own module events" ON public.module_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Members access deliverables"
ON public.use_case_deliverables
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.user_can_access_use_case(auth.uid(), use_case_id)
  OR public.is_admin_tier(auth.uid())
)
WITH CHECK (
  public.user_can_access_use_case(auth.uid(), use_case_id)
  OR public.is_admin_tier(auth.uid())
);
CREATE POLICY "Org members read org sectors"
ON public.taxonomy_sectors
FOR SELECT
TO authenticated
USING (organization_id IS NOT NULL AND organization_id = public.user_org_id(auth.uid()));
CREATE POLICY "Editors submit org sectors"
ON public.taxonomy_sectors
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_editor_tier(auth.uid())
  AND organization_id = public.user_org_id(auth.uid())
  AND submitted_by = auth.uid()
);
CREATE POLICY "Users can view their own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Entitled reads pro" ON public.use_cases
  FOR SELECT TO authenticated
  USING (
    status = 'published'::use_case_status
    AND visibility = 'pro'::use_case_visibility
    AND public.has_pro_entitlement(auth.uid())
  );
CREATE POLICY "Log own download" ON public.use_case_downloads
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR user_id = auth.uid()
  );
CREATE POLICY "Log own integration event" ON public.integration_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Log own view" ON public.use_case_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR user_id = auth.uid()
  );
CREATE POLICY "Users read own downloads"
  ON public.use_case_downloads
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Users read own views"
  ON public.use_case_views
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Members read their org membership rows" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners and admins add members" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org owners and admins update members" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org admins remove members or member leaves" ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin') OR user_id = auth.uid());
CREATE POLICY "Members read workspace membership rows" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Org admins add workspace members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin'));
CREATE POLICY "Org admins update workspace members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin'))
  WITH CHECK (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin'));
CREATE POLICY "Org admins remove workspace members or member leaves" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.org_role(auth.uid(), public.workspace_org(workspace_id)) IN ('owner','admin') OR user_id = auth.uid());
CREATE POLICY "Org members read units" ON public.organization_units
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org admins insert units" ON public.organization_units
  FOR INSERT TO authenticated WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org admins update units" ON public.organization_units
  FOR UPDATE TO authenticated
  USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin'))
  WITH CHECK (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Org admins delete units" ON public.organization_units
  FOR DELETE TO authenticated USING (public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Plans are publicly readable" ON public.plans
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Platform admins insert plans" ON public.plans
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins update plans" ON public.plans
  FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid())) WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins delete plans" ON public.plans
  FOR DELETE TO authenticated USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Org members read entitlements" ON public.entitlements
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Workspace members read collections" ON public.collections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owners insert collections" ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners update collections" ON public.collections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners or org admins delete collections" ON public.collections
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()
    OR public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Workspace members read portfolios"
  ON public.portfolios FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (visibility <> 'private' AND workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
    OR (visibility = 'organization' AND organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
  );
CREATE POLICY "Owners insert portfolios" ON public.portfolios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners update portfolios" ON public.portfolios
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners or org admins delete portfolios" ON public.portfolios
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()
    OR public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Workspace members read reports" ON public.generated_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owners insert reports" ON public.generated_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners update reports" ON public.generated_reports
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners or org admins delete reports" ON public.generated_reports
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()
    OR public.org_role(auth.uid(), organization_id) IN ('owner','admin'));
CREATE POLICY "Workspace members read saved use cases" ON public.saved_use_cases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owners insert saved use cases" ON public.saved_use_cases
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners update saved use cases" ON public.saved_use_cases
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners delete saved use cases" ON public.saved_use_cases
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Workspace members read shortlists" ON public.shortlists
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owners insert shortlists" ON public.shortlists
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners update shortlists" ON public.shortlists
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners delete shortlists" ON public.shortlists
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Workspace members read scores" ON public.use_case_scores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Owners insert scores" ON public.use_case_scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id)));
CREATE POLICY "Owners update scores" ON public.use_case_scores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners delete scores" ON public.use_case_scores
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Workspace members read submissions" ON public.use_case_submissions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "ai_usage_events_select_own"
  ON public.ai_usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "ai_usage_events_select_workspace_admin"
  ON public.ai_usage_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_role(auth.uid(), workspace_id) IN ('owner','admin')
  );
CREATE POLICY "ai_usage_events_insert_own"
  ON public.ai_usage_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Workspace admins read workspace audit"
  ON public.audit_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner','admin'])
  );
CREATE POLICY "Users record their own product events"
  ON public.product_events FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(event_name) BETWEEN 1 AND 120
  );
CREATE POLICY "Users read their own product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Workspace admins read workspace product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner','admin'])
  );
CREATE POLICY "Platform admins read product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Workspace members can read opportunities"
  ON public.opportunities FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR created_by = auth.uid());
CREATE POLICY "Workspace members can create opportunities"
  ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update opportunities"
  ON public.opportunities FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR created_by = auth.uid())
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id) OR created_by = auth.uid());
CREATE POLICY "Creators and workspace owners can delete opportunities"
  ON public.opportunities FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.workspace_role(auth.uid(), workspace_id) IN ('owner','admin')
  );
CREATE POLICY "Workspace members can read use case versions"
  ON public.use_case_versions FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id)
  );
CREATE POLICY "Workspace members can create use case versions"
  ON public.use_case_versions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IS NOT NULL
    AND public.user_in_workspace(auth.uid(), workspace_id)
  );
CREATE POLICY "Global scorecards are readable"
  ON public.scorecards FOR SELECT
  USING (workspace_id IS NULL AND status = 'published');
CREATE POLICY "Workspace members read their scorecards"
  ON public.scorecards FOR SELECT TO authenticated
  USING (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members create workspace scorecards"
  ON public.scorecards FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members update workspace scorecards"
  ON public.scorecards FOR UPDATE TO authenticated
  USING (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id))
  WITH CHECK (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members delete workspace scorecards"
  ON public.scorecards FOR DELETE TO authenticated
  USING (workspace_id IS NOT NULL AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Admins manage global scorecards"
  ON public.scorecards FOR ALL TO authenticated
  USING (workspace_id IS NULL AND public.is_admin_tier(auth.uid()))
  WITH CHECK (workspace_id IS NULL AND public.is_admin_tier(auth.uid()));
CREATE POLICY "Workspace members read scorecard results"
  ON public.scorecard_results FOR SELECT TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id));
CREATE POLICY "Workspace members record scorecard results"
  ON public.scorecard_results FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_can_access_use_case(auth.uid(), use_case_id)
  );
CREATE POLICY "Readers view portfolio items"
  ON public.portfolio_items FOR SELECT TO authenticated
  USING (public.portfolio_is_readable(portfolio_id, auth.uid()));
CREATE POLICY "Writers insert portfolio items"
  ON public.portfolio_items FOR INSERT TO authenticated
  WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()));
CREATE POLICY "Writers update portfolio items"
  ON public.portfolio_items FOR UPDATE TO authenticated
  USING (public.portfolio_is_writable(portfolio_id, auth.uid()))
  WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()));
CREATE POLICY "Writers delete portfolio items"
  ON public.portfolio_items FOR DELETE TO authenticated
  USING (public.portfolio_is_writable(portfolio_id, auth.uid()));
CREATE POLICY "Readable by portfolio readers"
ON public.portfolio_shares FOR SELECT TO authenticated
USING (public.portfolio_is_readable(portfolio_id, auth.uid()));
CREATE POLICY "Writable by portfolio writers"
ON public.portfolio_shares FOR INSERT TO authenticated
WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Updatable by portfolio writers"
ON public.portfolio_shares FOR UPDATE TO authenticated
USING (public.portfolio_is_writable(portfolio_id, auth.uid()))
WITH CHECK (public.portfolio_is_writable(portfolio_id, auth.uid()));
CREATE POLICY "Deletable by portfolio writers"
ON public.portfolio_shares FOR DELETE TO authenticated
USING (public.portfolio_is_writable(portfolio_id, auth.uid()));
CREATE POLICY "Workspace members read export preferences"
  ON public.workspace_export_preferences FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members create export preferences"
  ON public.workspace_export_preferences FOR INSERT TO authenticated
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members update export preferences"
  ON public.workspace_export_preferences FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id))
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Workspace members delete export preferences"
  ON public.workspace_export_preferences FOR DELETE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Members read deliverable versions"
  ON public.use_case_deliverable_versions
  FOR SELECT TO authenticated
  USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Members create deliverable versions"
  ON public.use_case_deliverable_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Members access use case benefits"
ON public.use_case_benefits
FOR ALL
TO authenticated
USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "benefit evidence read own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "benefit evidence insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "benefit evidence update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "benefit evidence delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'benefit-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Workshop members read workshops"
ON public.workshops
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.workshop_is_member(id, auth.uid()));
CREATE POLICY "Workspace members create workshops" ON public.workshops
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Facilitators update workshops" ON public.workshops
  FOR UPDATE TO authenticated USING (public.workshop_is_facilitator(id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(id, auth.uid()));
CREATE POLICY "Facilitators delete workshops" ON public.workshops
  FOR DELETE TO authenticated USING (public.workshop_is_facilitator(id, auth.uid()));
CREATE POLICY "Workshop members read participants" ON public.workshop_participants
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Facilitators manage participants" ON public.workshop_participants
  FOR ALL TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Workshop members read items" ON public.workshop_items
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Workshop members submit items" ON public.workshop_items
  FOR INSERT TO authenticated
  WITH CHECK (public.workshop_is_member(workshop_id, auth.uid()) AND submitted_by = auth.uid());
CREATE POLICY "Authors edit unreviewed items"
ON public.workshop_items
FOR UPDATE
TO authenticated
USING (submitted_by = auth.uid() AND status = 'submitted'::text)
WITH CHECK (submitted_by = auth.uid() AND status = 'submitted'::text);
CREATE POLICY "Facilitators curate items" ON public.workshop_items
  FOR UPDATE TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Facilitators delete items" ON public.workshop_items
  FOR DELETE TO authenticated USING (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Workshop members read votes" ON public.workshop_votes
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Members cast own votes" ON public.workshop_votes
  FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Members change own votes" ON public.workshop_votes
  FOR UPDATE TO authenticated USING (voter_id = auth.uid()) WITH CHECK (voter_id = auth.uid());
CREATE POLICY "Members withdraw own votes" ON public.workshop_votes
  FOR DELETE TO authenticated USING (voter_id = auth.uid());
CREATE POLICY "Workshop members read outcomes" ON public.workshop_outcomes
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Facilitators write outcomes" ON public.workshop_outcomes
  FOR ALL TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Facilitators read workshop invitations"
  ON public.workshop_invitations FOR SELECT TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Facilitators create workshop invitations"
  ON public.workshop_invitations FOR INSERT TO authenticated
  WITH CHECK (
    public.workshop_is_facilitator(workshop_id, auth.uid())
    AND created_by = auth.uid()
  );
CREATE POLICY "Facilitators update workshop invitations"
  ON public.workshop_invitations FOR UPDATE TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Facilitators delete workshop invitations"
  ON public.workshop_invitations FOR DELETE TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Managers read workspace invitations"
  ON public.workspace_invitations FOR SELECT TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Managers create workspace invitations"
  ON public.workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Managers revoke workspace invitations"
  ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace members read review notes"
  ON public.collab_comments FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Editors add review notes"
  ON public.collab_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Authors and managers update review notes"
  ON public.collab_comments FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id)
         AND (author_id = auth.uid() OR public.workspace_can_edit(auth.uid(), workspace_id)))
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Authors and managers delete review notes"
  ON public.collab_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace members read assignments"
  ON public.collab_assignments FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Editors create assignments"
  ON public.collab_assignments FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid() AND public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Editors update assignments"
  ON public.collab_assignments FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Editors remove assignments"
  ON public.collab_assignments FOR DELETE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Workspace members read review status"
  ON public.collab_review_states FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Editors set review status"
  ON public.collab_review_states FOR INSERT TO authenticated
  WITH CHECK (updated_by = auth.uid() AND public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Editors change review status"
  ON public.collab_review_states FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id));
CREATE POLICY "Workspace members read handoff requests"
  ON public.suite_handoff_requests FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id) OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Workspace editors raise handoff requests"
  ON public.suite_handoff_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND public.workspace_can_edit(auth.uid(), workspace_id)
  );
CREATE POLICY "Managers and owners update handoff requests"
  ON public.suite_handoff_requests FOR UPDATE TO authenticated
  USING (
    public.workspace_can_manage(auth.uid(), workspace_id)
    OR requested_by = auth.uid()
    OR owner_user_id = auth.uid()
    OR public.is_admin_tier(auth.uid())
  )
  WITH CHECK (
    public.workspace_can_manage(auth.uid(), workspace_id)
    OR requested_by = auth.uid()
    OR owner_user_id = auth.uid()
    OR public.is_admin_tier(auth.uid())
  );
CREATE POLICY "Users read their own sample copies"
  ON public.demo_sample_copies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users record their own sample copies"
  ON public.demo_sample_copies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Users remove their own sample copies"
  ON public.demo_sample_copies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Platform admins read demo reset log"
  ON public.demo_reset_log FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Users submit their own feedback"
  ON public.product_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read their own feedback"
  ON public.product_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Platform admins read all feedback"
  ON public.product_feedback FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins triage feedback"
  ON public.product_feedback FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Public read public visible feedback"
ON public.use_case_feedback
FOR SELECT
TO anon, authenticated
USING (is_public = true AND is_hidden = false);
CREATE POLICY "Reporters read their own request alerts"
ON public.request_status_alerts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Reporters mark their own alerts read"
ON public.request_status_alerts FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins create request alerts"
ON public.request_status_alerts FOR INSERT TO authenticated
WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Participants read their own pilot invitation"
  ON public.pilot_invitations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Platform admins read pilot invitations"
  ON public.pilot_invitations FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins create pilot invitations"
  ON public.pilot_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins update pilot invitations"
  ON public.pilot_invitations FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins read pilot settings"
  ON public.pilot_settings FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins insert pilot settings"
  ON public.pilot_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins update pilot settings"
  ON public.pilot_settings FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Participants read their own checkpoint responses"
  ON public.pilot_checkpoint_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Participants record their own checkpoint responses"
  ON public.pilot_checkpoint_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Platform admins read checkpoint responses"
  ON public.pilot_checkpoint_responses FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins read the pilot audit trail"
  ON public.pilot_audit_events FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Participants read their own pilot reminders"
  ON public.pilot_reminders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Participants dismiss their own pilot reminders"
  ON public.pilot_reminders FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own export requests"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Users create own export requests"
  ON public.data_export_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own export requests"
  ON public.data_export_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own deletion requests"
  ON public.data_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Users create own deletion requests"
  ON public.data_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own deletion requests"
  ON public.data_deletion_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Users record own consent"
  ON public.consent_records FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Platform admins read launch waivers"
  ON public.pilot_rc_waivers FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins grant launch waivers"
  ON public.pilot_rc_waivers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()) AND approved_by = auth.uid());
CREATE POLICY "Platform admins revoke launch waivers"
  ON public.pilot_rc_waivers FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins read verdict snapshots"
  ON public.pilot_verdict_snapshots FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins record verdict snapshots"
  ON public.pilot_verdict_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()) AND recorded_by = auth.uid());
CREATE POLICY "Platform admins read reminder dispatches"
  ON public.pilot_reminder_dispatches FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Workshop members read the public value canvas"
ON public.workshop_public_value_canvas FOR SELECT TO authenticated
USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Facilitators write the public value canvas"
ON public.workshop_public_value_canvas FOR ALL TO authenticated
USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Platform admins read launch check runs"
ON public.pilot_launch_check_runs FOR SELECT TO authenticated
USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins record launch check runs"
ON public.pilot_launch_check_runs FOR INSERT TO authenticated
WITH CHECK (public.is_admin_tier(auth.uid()) AND (actor_id = auth.uid()));
CREATE POLICY "Workshop members read canvas documents"
ON public.workshop_canvas_documents FOR SELECT TO authenticated
USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Facilitators attach canvas documents"
ON public.workshop_canvas_documents FOR INSERT TO authenticated
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "Facilitators update canvas documents"
ON public.workshop_canvas_documents FOR UPDATE TO authenticated
USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Facilitators remove canvas documents"
ON public.workshop_canvas_documents FOR DELETE TO authenticated
USING (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Workshop members read canvas versions"
ON public.workshop_canvas_versions FOR SELECT TO authenticated
USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Facilitators record canvas versions"
ON public.workshop_canvas_versions FOR INSERT TO authenticated
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Workshop members read canvas files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'canvas-documents'
  AND public.workshop_is_member(((storage.foldername(name))[1])::uuid, auth.uid())
);
CREATE POLICY "Facilitators upload canvas files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'canvas-documents'
  AND public.workshop_is_facilitator(((storage.foldername(name))[1])::uuid, auth.uid())
);
CREATE POLICY "Facilitators delete canvas files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'canvas-documents'
  AND public.workshop_is_facilitator(((storage.foldername(name))[1])::uuid, auth.uid())
);
CREATE POLICY "Admins read lead events" ON public.lead_events
  FOR SELECT TO authenticated
  USING (is_admin_tier(auth.uid()));
CREATE POLICY "Admins write lead events" ON public.lead_events
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_tier(auth.uid()));
CREATE POLICY "Participants read own pilot onboarding"
ON public.pilot_onboarding_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Participants create own pilot onboarding"
ON public.pilot_onboarding_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Participants update own pilot onboarding"
ON public.pilot_onboarding_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Platform admins read browser suite runs"
  ON public.pilot_browser_suite_runs
  FOR SELECT
  TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins record browser suite runs"
  ON public.pilot_browser_suite_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_tier(auth.uid()) AND actor_id = auth.uid());
CREATE POLICY "Platform admins can read pilot applications"
  ON public.pilot_applications FOR SELECT TO authenticated
  USING (public.is_admin_tier(auth.uid()));
CREATE POLICY "Platform admins can update pilot applications"
  ON public.pilot_applications FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Signed-in users can read engines"
  ON public.ai_engines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins manage engines"
  ON public.ai_engines FOR ALL TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Workspace managers read their engine keys"
  ON public.workspace_ai_engines FOR SELECT TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace managers add engine keys"
  ON public.workspace_ai_engines FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace managers update engine keys"
  ON public.workspace_ai_engines FOR UPDATE TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id))
  WITH CHECK (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Workspace managers delete engine keys"
  ON public.workspace_ai_engines FOR DELETE TO authenticated
  USING (public.workspace_can_manage(auth.uid(), workspace_id));
CREATE POLICY "Participants read own milestone approvals"
  ON public.pilot_milestone_approvals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_tier(auth.uid()));
CREATE POLICY "Participants submit own milestones"
  ON public.pilot_milestone_approvals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');
CREATE POLICY "Participants resubmit own milestones"
  ON public.pilot_milestone_approvals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status <> 'approved')
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');
CREATE POLICY "Admins decide milestone approvals"
  ON public.pilot_milestone_approvals FOR UPDATE TO authenticated
  USING (public.is_admin_tier(auth.uid()))
  WITH CHECK (public.is_admin_tier(auth.uid()));
CREATE POLICY "Allow anonymous read access to published use cases"
ON public.use_cases
FOR SELECT
TO anon
USING (status = 'published');

-- ---------------------------------------------------------------------------
-- Phase 10: GRANT / REVOKE
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.industries TO anon, authenticated;
GRANT ALL ON public.industries TO service_role;
GRANT SELECT ON public.business_functions TO anon, authenticated;
GRANT ALL ON public.business_functions TO service_role;
GRANT SELECT ON public.gov_functions TO anon, authenticated;
GRANT ALL ON public.gov_functions TO service_role;
GRANT SELECT ON public.ai_capabilities TO anon, authenticated;
GRANT ALL ON public.ai_capabilities TO service_role;
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
GRANT SELECT ON public.use_cases TO anon, authenticated;
GRANT INSERT, UPDATE ON public.use_cases TO authenticated;
GRANT ALL ON public.use_cases TO service_role;
GRANT SELECT ON public.use_case_metrics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_metrics TO authenticated;
GRANT ALL ON public.use_case_metrics TO service_role;
GRANT SELECT ON public.use_case_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_links TO authenticated;
GRANT ALL ON public.use_case_links TO service_role;
GRANT SELECT, INSERT, DELETE ON public.shortlists TO authenticated;
GRANT ALL ON public.shortlists TO service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT SELECT ON public.business_objectives TO anon, authenticated;
GRANT ALL ON public.business_objectives TO service_role;
GRANT SELECT ON public.use_case_business_objectives TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_business_objectives TO authenticated;
GRANT ALL ON public.use_case_business_objectives TO service_role;
GRANT INSERT ON public.lead_captures TO anon, authenticated;
GRANT ALL ON public.lead_captures TO service_role;
GRANT INSERT ON public.cta_events TO anon, authenticated;
GRANT ALL ON public.cta_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.taxonomy_sectors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_sectors TO authenticated;
GRANT ALL ON public.taxonomy_sectors TO service_role;
GRANT SELECT ON public.taxonomy_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_tags TO authenticated;
GRANT ALL ON public.taxonomy_tags TO service_role;
GRANT SELECT ON public.taxonomy_maturity_levels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_maturity_levels TO authenticated;
GRANT ALL ON public.taxonomy_maturity_levels TO service_role;
GRANT SELECT ON public.taxonomy_meta TO anon;
GRANT SELECT, INSERT, UPDATE ON public.taxonomy_meta TO authenticated;
GRANT ALL ON public.taxonomy_meta TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_ratings TO authenticated;
GRANT ALL ON public.use_case_ratings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_feedback TO authenticated;
GRANT ALL ON public.use_case_feedback TO service_role;
GRANT SELECT ON public.use_case_rating_aggregates TO anon, authenticated, service_role;
GRANT SELECT ON public.platform_modules TO anon, authenticated;
GRANT ALL ON public.platform_modules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_use_cases TO authenticated;
GRANT ALL ON public.saved_use_cases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_scores TO authenticated;
GRANT ALL ON public.use_case_scores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT ALL ON public.generated_reports TO service_role;
GRANT INSERT ON public.use_case_views TO anon, authenticated;
GRANT SELECT ON public.use_case_views TO authenticated;
GRANT ALL ON public.use_case_views TO service_role;
GRANT INSERT ON public.use_case_downloads TO anon, authenticated;
GRANT SELECT ON public.use_case_downloads TO authenticated;
GRANT ALL ON public.use_case_downloads TO service_role;
GRANT INSERT ON public.integration_events TO anon, authenticated;
GRANT SELECT ON public.integration_events TO authenticated;
GRANT ALL ON public.integration_events TO service_role;
GRANT SELECT ON public.external_module_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.external_module_links TO authenticated;
GRANT ALL ON public.external_module_links TO service_role;
GRANT SELECT, INSERT ON public.use_case_audit_log TO authenticated;
GRANT ALL ON public.use_case_audit_log TO service_role;
REVOKE ALL ON FUNCTION public.get_use_case_integration_package(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_use_case_integration_package(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_use_case_integration_package(uuid) TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
GRANT SELECT ON public.use_case_patterns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.use_case_patterns TO authenticated;
GRANT ALL ON public.use_case_patterns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_boards TO authenticated;
GRANT ALL ON public.use_case_boards TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_use_cases TO authenticated;
GRANT ALL ON public.ai_use_cases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feasibility_scores TO authenticated;
GRANT ALL ON public.feasibility_scores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_readiness_assessments TO authenticated;
GRANT ALL ON public.data_readiness_assessments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprints TO authenticated;
GRANT ALL ON public.blueprints TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_links TO authenticated;
GRANT ALL ON public.integration_links TO service_role;
GRANT INSERT ON public.audit_events TO authenticated;
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
REVOKE EXECUTE ON FUNCTION public.user_org_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_org_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_submissions TO authenticated;
GRANT ALL ON public.use_case_submissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT ON public.collections TO anon;
GRANT ALL ON public.collections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
GRANT SELECT ON public.collection_items TO anon;
GRANT ALL ON public.collection_items TO service_role;
GRANT SELECT, INSERT ON public.module_events TO authenticated;
GRANT INSERT ON public.module_events TO anon;
GRANT ALL ON public.module_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_deliverables TO authenticated;
GRANT ALL ON public.use_case_deliverables TO service_role;
REVOKE EXECUTE ON FUNCTION public.audit_use_cases() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_pro_entitlement(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_org_id(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_owned(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_accessible(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_tier(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_editor_tier(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_use_case_boards() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_use_case_integration_package(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_sector_published() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_use_cases() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_use_case_boards() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_org_id(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_owned(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.collection_is_accessible(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_in_workspace(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_access_use_case(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_tier(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_editor_tier(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_pro_entitlement(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_user_workspace() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_workspace(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_use_case_integration_package(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_use_case_integration_package(uuid) TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_units TO authenticated;
GRANT ALL ON public.organization_units TO service_role;
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workspace_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.workspace_org(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_tenancy_from_board() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_tenancy_from_ai_use_case() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_tenancy_from_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_board_org() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_org(uuid) TO authenticated, service_role;
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
GRANT SELECT, INSERT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;
GRANT SELECT ON public.activation_funnel_daily TO authenticated;
GRANT SELECT ON public.activation_funnel_daily TO service_role;
REVOKE ALL ON FUNCTION public.ensure_user_workspace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
REVOKE ALL ON FUNCTION public.sync_opportunity_org() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_opportunity_org() TO service_role;
GRANT SELECT, INSERT ON public.use_case_versions TO authenticated;
GRANT ALL ON public.use_case_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorecards TO authenticated;
GRANT SELECT ON public.scorecards TO anon;
GRANT ALL ON public.scorecards TO service_role;
GRANT SELECT, INSERT ON public.scorecard_results TO authenticated;
GRANT ALL ON public.scorecard_results TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;
REVOKE EXECUTE ON FUNCTION public.portfolio_is_readable(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.portfolio_is_writable(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.portfolio_is_readable(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.portfolio_is_writable(uuid, uuid) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_shares TO authenticated;
GRANT ALL ON public.portfolio_shares TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_export_preferences TO authenticated;
GRANT ALL ON public.workspace_export_preferences TO service_role;
GRANT SELECT, INSERT ON public.use_case_deliverable_versions TO authenticated;
GRANT ALL ON public.use_case_deliverable_versions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_benefits TO authenticated;
GRANT ALL ON public.use_case_benefits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_outcomes TO authenticated;
GRANT ALL ON public.workshops TO service_role;
GRANT ALL ON public.workshop_participants TO service_role;
GRANT ALL ON public.workshop_items TO service_role;
GRANT ALL ON public.workshop_votes TO service_role;
GRANT ALL ON public.workshop_outcomes TO service_role;
REVOKE EXECUTE ON FUNCTION public.workshop_is_facilitator(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.workshop_is_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workshop_is_facilitator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workshop_is_member(uuid, uuid) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_invitations TO authenticated;
GRANT ALL ON public.workshop_invitations TO service_role;
REVOKE ALL ON FUNCTION public.accept_workshop_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_workshop_invitation(text) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workspace_invitations TO authenticated;
GRANT ALL ON public.workspace_invitations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_comments TO authenticated;
GRANT ALL ON public.collab_comments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_assignments TO authenticated;
GRANT ALL ON public.collab_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.collab_review_states TO authenticated;
GRANT ALL ON public.collab_review_states TO service_role;
REVOKE EXECUTE ON FUNCTION public.workspace_can_edit(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.workspace_can_manage(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.collab_entity_workspace(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_workspace_invitation(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_can_edit(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_can_manage(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_entity_workspace(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.workspace_member_directory(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_member_directory(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.workspace_display_names(uuid, uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_display_names(uuid, uuid[]) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.suite_handoff_requests TO authenticated;
GRANT ALL ON public.suite_handoff_requests TO service_role;
GRANT SELECT, INSERT, DELETE ON public.demo_sample_copies TO authenticated;
GRANT ALL ON public.demo_sample_copies TO service_role;
GRANT SELECT ON public.product_events_reportable TO authenticated;
GRANT SELECT ON public.module_events_reportable TO authenticated;
GRANT SELECT ON public.cta_events_reportable TO authenticated;
GRANT SELECT ON public.ai_usage_events_reportable TO authenticated;
GRANT SELECT ON public.activation_funnel_daily TO authenticated;
GRANT ALL ON public.product_events_reportable TO service_role;
GRANT ALL ON public.module_events_reportable TO service_role;
GRANT ALL ON public.cta_events_reportable TO service_role;
GRANT ALL ON public.ai_usage_events_reportable TO service_role;
GRANT ALL ON public.activation_funnel_daily TO service_role;
GRANT SELECT ON public.demo_reset_log TO authenticated;
GRANT ALL ON public.demo_reset_log TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_demo_activity(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_activity(uuid, uuid, uuid) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.product_feedback TO authenticated;
GRANT ALL ON public.product_feedback TO service_role;
GRANT SELECT ON public.v_launch_visitors_weekly TO authenticated;
GRANT SELECT ON public.v_activation_funnel_weekly TO authenticated;
GRANT SELECT ON public.v_ai_usage_weekly TO authenticated;
GRANT SELECT ON public.v_search_insights_weekly TO authenticated;
GRANT SELECT ON public.v_enterprise_interest_weekly TO authenticated;
GRANT SELECT ON public.v_feedback_queue TO authenticated;
REVOKE ALL ON FUNCTION public.publish_use_case_submission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_use_case_submission(uuid, text) TO authenticated, service_role;
GRANT SELECT ON public.use_case_rating_aggregates TO anon, authenticated;
GRANT ALL ON public.use_case_rating_aggregates TO service_role;
GRANT SELECT ON public.use_case_feedback TO anon;
GRANT SELECT ON public.v_feedback_queue TO authenticated;
GRANT ALL ON public.v_feedback_queue TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.request_status_alerts TO authenticated;
GRANT ALL ON public.request_status_alerts TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pilot_invitations TO authenticated;
GRANT ALL ON public.pilot_invitations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pilot_settings TO authenticated;
GRANT ALL ON public.pilot_settings TO service_role;
GRANT SELECT, INSERT ON public.pilot_checkpoint_responses TO authenticated;
GRANT ALL ON public.pilot_checkpoint_responses TO service_role;
GRANT SELECT ON public.pilot_audit_events TO authenticated;
GRANT ALL ON public.pilot_audit_events TO service_role;
GRANT SELECT, UPDATE ON public.pilot_reminders TO authenticated;
GRANT ALL ON public.pilot_reminders TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.data_export_requests TO authenticated;
GRANT ALL ON public.data_export_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.data_deletion_requests TO authenticated;
GRANT ALL ON public.data_deletion_requests TO service_role;
GRANT SELECT, INSERT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pilot_rc_waivers TO authenticated;
GRANT ALL ON public.pilot_rc_waivers TO service_role;
GRANT SELECT, INSERT ON public.pilot_verdict_snapshots TO authenticated;
GRANT ALL ON public.pilot_verdict_snapshots TO service_role;
GRANT SELECT ON public.pilot_reminder_dispatches TO authenticated;
GRANT ALL ON public.pilot_reminder_dispatches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_public_value_canvas TO authenticated;
GRANT ALL ON public.workshop_public_value_canvas TO service_role;
GRANT SELECT, INSERT ON public.pilot_launch_check_runs TO authenticated;
GRANT ALL ON public.pilot_launch_check_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_canvas_documents TO authenticated;
GRANT ALL ON public.workshop_canvas_documents TO service_role;
GRANT SELECT, INSERT ON public.workshop_canvas_versions TO authenticated;
GRANT ALL ON public.workshop_canvas_versions TO service_role;
GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.pilot_onboarding_profiles TO authenticated;
GRANT ALL ON public.pilot_onboarding_profiles TO service_role;
REVOKE ALL ON FUNCTION public.prevent_profile_org_self_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_org_self_change() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_profile_org_self_change() FROM authenticated;
GRANT SELECT, INSERT ON public.pilot_browser_suite_runs TO authenticated;
GRANT ALL ON public.pilot_browser_suite_runs TO service_role;
GRANT ALL ON public.cron_hook_tokens TO service_role;
GRANT SELECT, UPDATE ON public.pilot_applications TO authenticated;
GRANT ALL ON public.pilot_applications TO service_role;
GRANT SELECT ON public.ai_engines TO authenticated;
GRANT ALL ON public.ai_engines TO service_role;
GRANT ALL ON public.ai_engine_credentials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_ai_engines TO authenticated;
GRANT ALL ON public.workspace_ai_engines TO service_role;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.workspace_ai_engines FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pilot_milestone_approvals TO authenticated;
GRANT ALL ON public.pilot_milestone_approvals TO service_role;
REVOKE SELECT ON public.use_cases FROM anon;
GRANT SELECT (
  id, slug, title, summary, organization, organization_type, region,
  business_problem, ai_solution_concept, solution, problem, outcomes,
  maturity, maturity_level, maturity_score, impact_score, value_potential, 
  complexity, risk_level, time_to_value, deployment_model, security_classification, 
  visibility, is_featured, show_on_landing, display_order, 
  published_at, created_at, updated_at,
  provenance, provenance_note, roi_areas, kpis, recommended_platforms, 
  evidence_urls, hero_image_url, status
) ON public.use_cases TO anon;

-- ---------------------------------------------------------------------------
-- Phase 11: Storage bucket creation
-- ---------------------------------------------------------------------------
-- Buckets referenced by storage.objects policies and src/lib/storage/storage-policy.ts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', false, 2097152,
  ARRAY['image/png','image/jpeg','image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'benefit-evidence', 'benefit-evidence', false, 10485760,
  ARRAY[
    'application/pdf','image/png','image/jpeg','image/webp','text/csv','text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'canvas-documents', 'canvas-documents', false, 15728640,
  ARRAY[
    'application/pdf','image/png','image/jpeg','text/csv','text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- End of full-schema.sql