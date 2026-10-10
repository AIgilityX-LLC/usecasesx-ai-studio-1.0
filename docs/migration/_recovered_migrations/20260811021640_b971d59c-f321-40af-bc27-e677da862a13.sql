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

REVOKE ALL ON FUNCTION public.publish_use_case_submission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_use_case_submission(uuid, text) TO authenticated, service_role;
