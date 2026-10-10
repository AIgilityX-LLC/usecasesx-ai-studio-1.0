
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

  -- Visibility gate
  IF NOT is_admin THEN
    IF uc.status <> 'published'::public.use_case_status THEN
      RETURN NULL;
    END IF;
    IF is_authed THEN
      IF uc.visibility NOT IN ('free_lite','pro','both')::public.use_case_visibility[] THEN
        RETURN NULL;
      END IF;
    ELSE
      IF uc.visibility NOT IN ('free_lite','both')::public.use_case_visibility[] THEN
        RETURN NULL;
      END IF;
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
    -- Derived "ready" indicators (no dedicated columns in schema yet)
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

REVOKE ALL ON FUNCTION public.get_use_case_integration_package(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_use_case_integration_package(uuid) TO anon, authenticated, service_role;
