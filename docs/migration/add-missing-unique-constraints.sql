-- =============================================================================
-- add-missing-unique-constraints.sql
-- Restores UNIQUE constraints dropped during full-schema.sql restructuring.
-- Safely re-runnable: skips if a UNIQUE with the same name or same column list exists.
-- Count: 38 UNIQUE constraints (19 column + 19 composite)
-- =============================================================================

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
