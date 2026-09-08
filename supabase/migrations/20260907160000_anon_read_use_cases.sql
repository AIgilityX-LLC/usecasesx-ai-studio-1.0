-- Revoke full table access just in case
REVOKE SELECT ON public.use_cases FROM anon;

-- Grant SELECT only on public-safe columns
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

-- Apply RLS policy to restrict anon to published rows
CREATE POLICY "Allow anonymous read access to published use cases"
ON public.use_cases
FOR SELECT
TO anon
USING (status = 'published');
