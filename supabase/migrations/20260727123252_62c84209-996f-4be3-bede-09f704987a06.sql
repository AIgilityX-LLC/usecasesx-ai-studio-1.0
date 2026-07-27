-- T6: membership-scoped dual-predicate policies on user-owned tenant tables.
-- Compatibility clause (user_id = auth.uid()) retained; removed only at T7.

-- collections -------------------------------------------------------------
DROP POLICY IF EXISTS "Owners manage collections" ON public.collections;
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

-- portfolios ---------------------------------------------------------------
DROP POLICY IF EXISTS "Own portfolios" ON public.portfolios;
CREATE POLICY "Workspace members read portfolios" ON public.portfolios
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id));
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

-- generated_reports --------------------------------------------------------
DROP POLICY IF EXISTS "Own reports" ON public.generated_reports;
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

-- saved_use_cases ----------------------------------------------------------
DROP POLICY IF EXISTS "Own saved use cases" ON public.saved_use_cases;
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

-- shortlists ---------------------------------------------------------------
DROP POLICY IF EXISTS "Own shortlist" ON public.shortlists;
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

-- use_case_scores ----------------------------------------------------------
DROP POLICY IF EXISTS "Own scores" ON public.use_case_scores;
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

-- use_case_submissions: add workspace-scoped read alongside own-row read ----
CREATE POLICY "Workspace members read submissions" ON public.use_case_submissions
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));